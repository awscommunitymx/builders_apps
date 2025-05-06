import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { User } from '@awscommunity/generated-ts';

export const getAuthenticatedUser = async (
  cognitoSub: string,
  tracer: Tracer,
  docClient: DynamoDBDocumentClient,
  logger: Logger,
  metrics: Metrics,
  tableName: string
): Promise<User> => {
  const queryParams = {
    TableName: tableName,
    IndexName: 'cognito_sub-index',
    KeyConditionExpression: 'cognito_sub = :cognito_sub',
    ExpressionAttributeValues: {
      ':cognito_sub': cognitoSub,
    },
  };

  const segment = tracer.getSegment();
  const subSegment = segment?.addNewSubsegment('QueryAuthenticatedUser');
  try {
    const queryResult = await docClient.send(new QueryCommand(queryParams));
    if (!queryResult.Items || queryResult.Items.length === 0) {
      logger.info('Authenticated user not found', { cognitoSub });
      metrics.addMetric('AuthenticatedUserNotFound', MetricUnit.Count, 1);
      throw new Error('Usuario no encontrado');
    }
    return queryResult.Items[0] as User;
  } finally {
    subSegment?.close();
  }
};
