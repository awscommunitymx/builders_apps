import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  createUserProfile,
  updateCompleteProfile,
  updateProfileFields,
} from '../utils/checkInService';
import { AttendeeCheckIn, BasicUserProfile, PartialAttendeeProfile } from '../utils/types';

// Initialize the DynamoDB client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || '';

/**
 * Handler for creating a new user with minimal info
 */
export const createUserHandler = async (event: any) => {
  try {
    // Validate that we have a table name
    if (!TABLE_NAME) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'TABLE_NAME environment variable is not set' }),
      };
    }

    // Parse the incoming request
    const userData: BasicUserProfile = JSON.parse(event.body);

    // Validate required fields
    if (!userData.user_id || !userData.first_name || !userData.last_name || !userData.email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message:
            'Missing required fields - user_id, first_name, last_name, and email are required',
        }),
      };
    }

    // Create the user profile
    await createUserProfile(docClient, userData, TABLE_NAME);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'User profile created successfully',
        user_id: userData.user_id,
      }),
    };
  } catch (error: any) {
    console.error('Error creating user profile:', error);
    return {
      statusCode: error.message.includes('already exists') ? 409 : 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

/**
 * Handler for updating a user with complete information
 */
export const updateCompleteProfileHandler = async (event: any) => {
  try {
    // Validate that we have a table name
    if (!TABLE_NAME) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'TABLE_NAME environment variable is not set' }),
      };
    }

    // Parse the incoming request
    const profileData: AttendeeCheckIn = JSON.parse(event.body);

    // Validate essential fields
    if (!profileData.user_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing user_id field' }),
      };
    }

    // Update the complete profile
    await updateCompleteProfile(docClient, profileData, TABLE_NAME);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'User profile updated successfully',
        user_id: profileData.user_id,
      }),
    };
  } catch (error: any) {
    console.error('Error updating complete profile:', error);
    return {
      statusCode: error.message.includes('not found') ? 404 : 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

/**
 * Handler for updating specific fields in a user profile
 */
export const updateProfileFieldsHandler = async (event: any) => {
  try {
    // Validate that we have a table name
    if (!TABLE_NAME) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'TABLE_NAME environment variable is not set' }),
      };
    }

    // Extract user_id from path parameters and fields from body
    const userId = event.pathParameters?.userId;
    const fields: PartialAttendeeProfile = JSON.parse(event.body);

    // Validate user_id
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing userId in path parameters' }),
      };
    }

    // Update the specified fields
    await updateProfileFields(docClient, userId, fields, TABLE_NAME);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Profile fields updated successfully',
        user_id: userId,
      }),
    };
  } catch (error: any) {
    console.error('Error updating profile fields:', error);
    return {
      statusCode: error.message.includes('condition check failed') ? 404 : 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
