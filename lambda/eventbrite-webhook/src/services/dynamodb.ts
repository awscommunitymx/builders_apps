import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { AttendeeData } from '../types/attendee';

export const saveToDynamoDB = async (client: DynamoDBClient, tableName: string, data: AttendeeData): Promise<string> => {
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

  const command = new PutItemCommand({
    TableName: tableName,
    Item: marshall(item),
    ConditionExpression: 'attribute_not_exists(PK) OR (attribute_exists(PK) AND initialized = :false)',
    ExpressionAttributeValues: marshall({ ':false': false }),
  });

  try {
    await client.send(command);
    return 'Record created or updated';
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      return 'Record already exists and is initialized, no update performed';
    }
    throw err;
  }
};
