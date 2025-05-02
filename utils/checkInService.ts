import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { AttendeeCheckIn } from './types';
import {
  ConditionalCheckFailedException,
  ProvisionedThroughputExceededException,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';

/**
 * Creates a new user with minimal required information
 */
export async function createUserProfile(
  client: DynamoDBDocumentClient,
  userData: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  },
  tableName: string
): Promise<void> {
  try {
    // Create minimal profile
    const item = {
      PK: `USER#${userData.user_id}`,
      SK: 'PROFILE',
      user_id: userData.user_id,
      first_name: userData.first_name,
      last_name: userData.last_name,
      contact_information: {
        email: userData.email,
        phone: '',
        share_email: false,
        share_phone: false,
      },
      social_links: [],
      initialized: false, // Flag to indicate profile is not fully populated
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: item,
      // Make sure we don't overwrite an existing profile
      ConditionExpression: 'attribute_not_exists(PK)',
    });

    await client.send(command);
    console.log('✅ Initial user profile created successfully');
  } catch (error) {
    handleDynamoDbError(error, 'creating initial profile');
  }
}

/**
 * Updates a user profile with complete information
 */
export async function updateCompleteProfile(
  client: DynamoDBDocumentClient,
  attendee: AttendeeCheckIn,
  tableName: string
): Promise<void> {
  try {
    // Get the current profile to preserve any existing fields
    const { Item: existingProfile } = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${attendee.user_id}`,
          SK: 'PROFILE',
        },
      })
    );

    if (!existingProfile) {
      throw new Error('Profile not found. Create a basic profile first.');
    }

    const item = {
      ...existingProfile,
      ...attendee,
      contact_information: {
        email: attendee.contact_information.email,
        phone: attendee.contact_information.phone,
        share_email: attendee.contact_information.share_email,
        share_phone: attendee.contact_information.share_phone,
      },
      social_links: attendee.social_links.map((link) => ({
        name: link.name,
        url: link.url,
      })),
      initialized: true, // Mark as fully initialized
      updated_at: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });

    await client.send(command);
    console.log('✅ Complete profile update stored successfully');
  } catch (error) {
    handleDynamoDbError(error, 'updating complete profile');
  }
}

/**
 * Updates specific fields in a user profile
 */
export async function updateProfileFields(
  client: DynamoDBDocumentClient,
  userId: string,
  fields: Partial<AttendeeCheckIn>,
  tableName: string
): Promise<void> {
  try {
    // Validate user ID
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Build the update expression and attribute values dynamically
    let updateExpression = 'SET updated_at = :updatedAt';
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': new Date().toISOString(),
    };
    const expressionAttributeNames: Record<string, string> = {};

    // Process each field in the update
    Object.entries(fields).forEach(([key, value]) => {
      // Skip the user_id as it's part of the key
      if (key === 'user_id') return;

      // Special handling for nested objects
      if (key === 'contact_information' && value) {
        Object.entries(value as Record<string, any>).forEach(([subKey, subValue]) => {
          updateExpression += `, #contact.#${subKey} = :${subKey}`;
          expressionAttributeNames['#contact'] = 'contact_information';
          expressionAttributeNames[`#${subKey}`] = subKey;
          expressionAttributeValues[`:${subKey}`] = subValue;
        });
      } else if (key === 'social_links' && Array.isArray(value)) {
        updateExpression += `, #${key} = :${key}`;
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = (value as any[]).map((link) => ({
          name: link.name,
          url: link.url,
        }));
      } else {
        // Handle regular fields
        updateExpression += `, #${key} = :${key}`;
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(PK)', // Ensure the item exists
    });

    await client.send(command);
    console.log('✅ Profile fields updated successfully');
  } catch (error) {
    handleDynamoDbError(error, 'updating profile fields');
  }
}

/**
 * Original function maintained for backward compatibility
 */
export async function storeAttendeeCheckIn(
  client: DynamoDBDocumentClient,
  attendee: AttendeeCheckIn,
  tableName: string
): Promise<void> {
  try {
    const item = {
      PK: `USER#${attendee.user_id}`,
      SK: 'PROFILE',
      ...attendee,
      contact_information: {
        email: attendee.contact_information.email,
        phone: attendee.contact_information.phone,
        share_email: attendee.contact_information.share_email,
        share_phone: attendee.contact_information.share_phone,
      },
      social_links: attendee.social_links.map((link) => ({
        name: link.name,
        url: link.url,
      })),
      updated_at: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });

    await client.send(command);
    console.log('✅ Check-in stored successfully');
  } catch (error) {
    handleDynamoDbError(error, 'storing check-in');
  }
}

/**
 * Centralized error handling for DynamoDB operations
 */
function handleDynamoDbError(error: unknown, operation: string): never {
  if (error instanceof ConditionalCheckFailedException) {
    console.error(`❌ Conditional check failed while ${operation}:`, error);
    throw new Error('Record already exists or condition check failed.');
  } else if (error instanceof ProvisionedThroughputExceededException) {
    console.error(`❌ DynamoDB throughput exceeded while ${operation}:`, error);
    throw new Error('Service is busy, please try again later.');
  } else if (error instanceof ResourceNotFoundException) {
    console.error(`❌ DynamoDB table not found while ${operation}:`, error);
    throw new Error('Configuration error: DynamoDB table missing.');
  } else if (error instanceof Error) {
    console.error(`❌ Error ${operation}:`, error);
    throw new Error(`An unexpected error occurred while ${operation}: ${error.message}`);
  } else {
    console.error(`❌ Unhandled error type while ${operation}:`, error);
    throw new Error('An unknown error occurred.');
  }
}
