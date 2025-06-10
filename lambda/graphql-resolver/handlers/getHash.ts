import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

export const getHash = async (key: string, tableName: string, serviceName: string): Promise<string> => {
  const tracer = new Tracer({ serviceName: serviceName });
  const logger = new Logger({ serviceName: serviceName });
  const dynamo = tracer.captureAWSv3Client(new DynamoDBClient({}));
  const docClient = DynamoDBDocumentClient.from(dynamo);

  try {
    const resp = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK: `AGENDA#${key}`, SK: 'HASH' }
      })
    );

    logger.debug('Dynamo getHash response', { key, item: resp.Item });

    const hash = resp.Item?.hash as string | undefined;

    if (!hash) throw new Error(`No hash found for key=${key}`);
    return hash;
  } catch (err) {
    logger.error('Error fetching hash', { key, error: err });
    throw err;
  }
};
