import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { 
  createUserHandler, 
  updateCompleteProfileHandler, 
  updateProfileFieldsHandler 
} from '../lambda/profileHandlers';

// Mock the DynamoDB document client
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock environment variables
process.env.TABLE_NAME = 'TestUserProfiles';

// Mock the checkInService functions
vi.mock('../utils/checkInService', () => ({
  createUserProfile: vi.fn().mockResolvedValue(undefined),
  updateCompleteProfile: vi.fn().mockResolvedValue(undefined),
  updateProfileFields: vi.fn().mockResolvedValue(undefined),
}));

describe('Profile Lambda Handlers', () => {
  beforeEach(() => {
    ddbMock.reset();
    vi.resetAllMocks();
  });

  describe('createUserHandler', () => {
    it('creates a new user profile successfully', async () => {
      const event = {
        body: JSON.stringify({
          user_id: '12345',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com'
        })
      };

      const response = await createUserHandler(event);

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toMatchObject({
        message: 'User profile created successfully',
        user_id: '12345'
      });
    });

    it('returns 400 when required fields are missing', async () => {
      const event = {
        body: JSON.stringify({
          first_name: 'John',
          // missing user_id, last_name, email
        })
      };

      const response = await createUserHandler(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toContain('Missing required fields');
    });

    it('returns 409 when user already exists', async () => {
      const { createUserProfile } = require('../utils/checkInService');
      createUserProfile.mockRejectedValueOnce(new Error('Record already exists'));

      const event = {
        body: JSON.stringify({
          user_id: '12345',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com'
        })
      };

      const response = await createUserHandler(event);

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body).message).toBe('Record already exists');
    });
  });

  describe('updateCompleteProfileHandler', () => {
    it('updates a complete profile successfully', async () => {
      const event = {
        body: JSON.stringify({
          user_id: '12345',
          first_name: 'John',
          last_name: 'Doe',
          gender: 'Male',
          company: 'Acme Inc',
          job_title: 'Developer',
          contact_information: {
            email: 'john@example.com',
            phone: '1234567890',
            share_email: true,
            share_phone: false
          },
          social_links: [],
          age_range: '25-34',
          area_of_interest: 'Development',
          pin: '1234',
          role: 'Developer',
          short_id: 'JD12345',
          initialized: true
        })
      };

      const response = await updateCompleteProfileHandler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toMatchObject({
        message: 'User profile updated successfully',
        user_id: '12345'
      });
    });

    it('returns 400 when user_id is missing', async () => {
      const event = {
        body: JSON.stringify({
          first_name: 'John',
          last_name: 'Doe',
          // missing user_id
        })
      };

      const response = await updateCompleteProfileHandler(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toContain('Missing user_id field');
    });

    it('returns 404 when profile is not found', async () => {
      const { updateCompleteProfile } = require('../utils/checkInService');
      updateCompleteProfile.mockRejectedValueOnce(new Error('Profile not found'));

      const event = {
        body: JSON.stringify({
          user_id: '12345',
          first_name: 'John',
          last_name: 'Doe',
          // other required fields
        })
      };

      const response = await updateCompleteProfileHandler(event);

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).message).toBe('Profile not found');
    });
  });

  describe('updateProfileFieldsHandler', () => {
    it('updates specific fields successfully', async () => {
      const event = {
        pathParameters: {
          userId: '12345'
        },
        body: JSON.stringify({
          company: 'New Company',
          job_title: 'Senior Developer'
        })
      };

      const response = await updateProfileFieldsHandler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toMatchObject({
        message: 'Profile fields updated successfully',
        user_id: '12345'
      });
    });

    it('returns 400 when userId is missing in path parameters', async () => {
      const event = {
        pathParameters: {},  // missing userId
        body: JSON.stringify({
          company: 'New Company'
        })
      };

      const response = await updateProfileFieldsHandler(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toContain('Missing userId in path parameters');
    });

    it('returns 404 when profile is not found for update', async () => {
      const { updateProfileFields } = require('../utils/checkInService');
      updateProfileFields.mockRejectedValueOnce(new Error('condition check failed'));

      const event = {
        pathParameters: {
          userId: '12345'
        },
        body: JSON.stringify({
          company: 'New Company'
        })
      };

      const response = await updateProfileFieldsHandler(event);

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).message).toContain('condition check failed');
    });
  });
});