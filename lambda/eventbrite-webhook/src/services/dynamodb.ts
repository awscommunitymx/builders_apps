import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { AttendeeData } from '../types/attendee';

export const saveToDynamoDB = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  data: AttendeeData
): Promise<string> => {
  const item = {
    PK: `USER#${data.barcode}`,
    SK: 'PROFILE',
    first_name: data.first_name,
    last_name: data.last_name,
    short_id: data.short_id,
    user_id: data.barcode,
    initialized: data.initialized,
    company: data.company,
    contact_information: {
      email: data.email,
      phone: data.cell_phone,
    },
    gender: data.gender,
    role: data.job_title,
  };

  const command = new PutCommand({
    TableName: tableName,
    Item: item,
    ConditionExpression:
      'attribute_not_exists(PK) OR (attribute_exists(PK) AND initialized = :false)',
    ExpressionAttributeValues: { ':false': false },
  });

  try {
    await client.send(command);
    return 'Record created';
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw new Error('Record already exists and is initialized, no update performed');
    }
    throw new Error(`Failed to save data in DynamoDB: ${err.message}`);
  }
};
