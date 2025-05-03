import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommandInput, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { User } from '@awscommunity/generated-ts';

const SERVICE_NAME = 'update-user-service';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

export default async function handleUpdateUser(
  userId: string,
  updates: Partial<Omit<User, 'user_id' | 'short_id'>>
): Promise<User> {
  logger.debug('Updating user', { userId, updates });

  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, any> = {};
  const setClauses: string[] = [];

  Object.entries(updates).forEach(([attr, val], i) => {
    const nameKey = `#n${i}`,
      valKey = `:v${i}`;
    exprAttrNames[nameKey] = attr;
    exprAttrValues[valKey] = val;
    setClauses.push(`${nameKey} = ${valKey}`);
  });
  if (setClauses.length === 0) throw new Error('No fields to update');

  const updateParams: UpdateCommandInput = {
    TableName: tableName,
    Key: { PK: `USER#${userId}`, SK: `META#${userId}` },
    UpdateExpression: 'SET ' + setClauses.join(', '),
    ExpressionAttributeNames: exprAttrNames,
    ExpressionAttributeValues: exprAttrValues,
    ReturnValues: 'ALL_NEW' as const,
  };

  const result = await docClient.send(new UpdateCommand(updateParams));
  const updated = result.Attributes as User;
  metrics.addMetric('UpdateUserSuccess', MetricUnit.Count, 1);
  return updated;
}
