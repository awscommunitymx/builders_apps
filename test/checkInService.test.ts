import { AttendeeCheckIn, BasicUserProfile, PartialAttendeeProfile } from '../utils/types';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import {
  ConditionalCheckFailedException,
  ProvisionedThroughputExceededException,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import {
  storeAttendeeCheckIn,
  createUserProfile,
  updateCompleteProfile,
  updateProfileFields,
} from '../utils/checkInService';
import { beforeEach, describe, expect, it } from 'vitest';

// Mock DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

// Sample attendee data for tests
const mockAttendee: AttendeeCheckIn = {
  user_id: '123',
  first_name: 'John',
  last_name: 'Doe',
  age_range: '25-34',
  gender: 'Male',
  company: 'Acme Corp',
  job_title: 'Cloud Engineer',
  area_of_interest: 'Cloud Architecture',
  pin: '1234',
  role: 'Cloud Architect',
  contact_information: {
    email: 'john@example.com',
    phone: '1234567890',
    share_email: true,
    share_phone: false,
  },
  social_links: [{ name: 'LinkedIn', url: 'https://linkedin.com/johndoe' }],
  short_id: 'ABC123',
  initialized: false,
};

// Sample minimal user data for tests
const mockBasicUserData: BasicUserProfile = {
  user_id: '123',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
};

// Sample partial update data
const mockPartialUpdate: PartialAttendeeProfile = {
  company: 'New Company',
  job_title: 'Senior Developer',
};

// Constants
const mockTableName = 'AttendeeCheckIns';

describe('storeAttendeeCheckIn', () => {
  beforeEach(() => {
    ddbMock.reset(); // Reset mock state between tests
  });

  it('stores check-in data successfully', async () => {
    ddbMock.onAnyCommand().resolves({});

    await expect(
      storeAttendeeCheckIn(ddbMock as any, mockAttendee, mockTableName)
    ).resolves.not.toThrow();

    expect(ddbMock.calls()).toHaveLength(1);
    expect(ddbMock.calls()[0].args[0].input).toMatchObject({
      TableName: mockTableName,
      Item: expect.objectContaining({
        PK: `USER#${mockAttendee.user_id}`,
        SK: 'PROFILE',
      }),
    });
  });

  it('throws an error if attendee already exists', async () => {
    ddbMock.onAnyCommand().rejects(
      new ConditionalCheckFailedException({
        $metadata: { httpStatusCode: 400 },
        message: 'Item already exists',
      })
    );

    await expect(storeAttendeeCheckIn(ddbMock as any, mockAttendee, mockTableName)).rejects.toThrow(
      'Record already exists or condition check failed.'
    );

    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('throws an error if DynamoDB throughput is exceeded', async () => {
    ddbMock.onAnyCommand().rejects(
      new ProvisionedThroughputExceededException({
        $metadata: { httpStatusCode: 400 },
        message: 'Throughput exceeded',
      })
    );

    await expect(storeAttendeeCheckIn(ddbMock as any, mockAttendee, mockTableName)).rejects.toThrow(
      'Service is busy, please try again later.'
    );

    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('throws an error if DynamoDB table is missing', async () => {
    ddbMock.onAnyCommand().rejects(
      new ResourceNotFoundException({
        $metadata: { httpStatusCode: 400 },
        message: 'Table not found',
      })
    );

    await expect(storeAttendeeCheckIn(ddbMock as any, mockAttendee, mockTableName)).rejects.toThrow(
      'Configuration error: DynamoDB table missing.'
    );

    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('throws a generic error for unknown issues', async () => {
    ddbMock.onAnyCommand().rejects(new Error('Unexpected error'));

    await expect(storeAttendeeCheckIn(ddbMock as any, mockAttendee, mockTableName)).rejects.toThrow(
      'An unexpected error occurred while storing check-in:'
    );

    expect(ddbMock.calls()).toHaveLength(1);
  });
});

describe('createUserProfile', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('creates a basic user profile successfully', async () => {
    ddbMock.onAnyCommand().resolves({});

    await expect(
      createUserProfile(ddbMock as any, mockBasicUserData, mockTableName)
    ).resolves.not.toThrow();

    expect(ddbMock.calls()).toHaveLength(1);
    expect(ddbMock.calls()[0].args[0].input).toMatchObject({
      TableName: mockTableName,
      Item: expect.objectContaining({
        PK: `USER#${mockBasicUserData.user_id}`,
        SK: 'PROFILE',
        first_name: mockBasicUserData.first_name,
        last_name: mockBasicUserData.last_name,
        contact_information: expect.objectContaining({
          email: mockBasicUserData.email,
        }),
        initialized: false,
      }),
      ConditionExpression: 'attribute_not_exists(PK)',
    });
  });

  it('throws an error if user already exists', async () => {
    ddbMock.onAnyCommand().rejects(
      new ConditionalCheckFailedException({
        $metadata: { httpStatusCode: 400 },
        message: 'Item already exists',
      })
    );

    await expect(
      createUserProfile(ddbMock as any, mockBasicUserData, mockTableName)
    ).rejects.toThrow('Record already exists or condition check failed.');

    expect(ddbMock.calls()).toHaveLength(1);
  });
});

describe('updateCompleteProfile', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('updates a complete profile successfully', async () => {
    // Mock the GetCommand to return an existing profile
    ddbMock.onAnyCommand().resolves({
      Item: {
        PK: `USER#${mockAttendee.user_id}`,
        SK: 'PROFILE',
        user_id: mockAttendee.user_id,
        first_name: 'Original',
        last_name: 'User',
        created_at: '2023-01-01T00:00:00.000Z',
      },
    });

    await expect(
      updateCompleteProfile(ddbMock as any, mockAttendee, mockTableName)
    ).resolves.not.toThrow();

    // Should have two calls: one for GetCommand, one for PutCommand
    expect(ddbMock.calls()).toHaveLength(2);
    // Check the PutCommand (second call)
    expect(ddbMock.calls()[1].args[0].input).toMatchObject({
      TableName: mockTableName,
      Item: expect.objectContaining({
        PK: `USER#${mockAttendee.user_id}`,
        SK: 'PROFILE',
        first_name: mockAttendee.first_name,
        initialized: true,
      }),
    });
  });

  it('throws an error if profile not found', async () => {
    // Mock the GetCommand to return no item
    ddbMock.onAnyCommand().resolves({});

    await expect(
      updateCompleteProfile(ddbMock as any, mockAttendee, mockTableName)
    ).rejects.toThrow('Profile not found.');

    expect(ddbMock.calls()).toHaveLength(1);
  });
});

describe('updateProfileFields', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('updates specific profile fields successfully', async () => {
    ddbMock.onAnyCommand().resolves({});

    await expect(
      updateProfileFields(ddbMock as any, mockAttendee.user_id, mockPartialUpdate, mockTableName)
    ).resolves.not.toThrow();

    expect(ddbMock.calls()).toHaveLength(1);
    expect(ddbMock.calls()[0].args[0].input).toMatchObject({
      TableName: mockTableName,
      Key: {
        PK: `USER#${mockAttendee.user_id}`,
        SK: 'PROFILE',
      },
      UpdateExpression: expect.stringContaining('#company = :company'),
      ExpressionAttributeNames: expect.objectContaining({
        '#company': 'company',
        '#job_title': 'job_title',
      }),
      ExpressionAttributeValues: expect.objectContaining({
        ':company': 'New Company',
        ':job_title': 'Senior Developer',
      }),
      ConditionExpression: 'attribute_exists(PK)',
    });
  });

  it('throws an error if profile does not exist for partial update', async () => {
    ddbMock.onAnyCommand().rejects(
      new ConditionalCheckFailedException({
        $metadata: { httpStatusCode: 400 },
        message: 'Condition check failed',
      })
    );

    await expect(
      updateProfileFields(ddbMock as any, mockAttendee.user_id, mockPartialUpdate, mockTableName)
    ).rejects.toThrow('Record already exists or condition check failed.');

    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('throws an error if user_id is missing for partial update', async () => {
    await expect(
      updateProfileFields(ddbMock as any, '', mockPartialUpdate, mockTableName)
    ).rejects.toThrow('User ID is required');

    // No API calls should be made
    expect(ddbMock.calls()).toHaveLength(0);
  });
});
