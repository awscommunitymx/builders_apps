import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

const SERVICE_NAME = 'get-user-by-short-id-service';
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = `${Date.now()}`;
  logger.appendKeys({ correlationId });

  try {
    const shortId = event.pathParameters?.shortId;

    if (!shortId) {
      logger.warn('Missing shortId in path parameters');
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Debes proporcionar un shortId válido.',
        }),
      };
    }

    logger.info('Querying user by short_id', { shortId });

    const queryParams = {
      TableName: TABLE_NAME,
      IndexName: 'short_id-index',
      KeyConditionExpression: 'short_id = :short_id',
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: {
        ':short_id': shortId,
        ':sk': 'PROFILE',
      },
    };

    const result = await docClient.send(new QueryCommand(queryParams));

    if (!result.Items || result.Items.length === 0) {
      logger.warn('User not found with short_id', { shortId });
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'Usuario no encontrado.',
        }),
      };
    }

    const userProfile = result.Items[0];

    // Remove sensitive data
    delete userProfile.initialized;
    delete userProfile.pin;

    if (!userProfile.share_email) {
      delete userProfile.email;
    }

    if (!userProfile.share_phone) {
      delete userProfile.cell_phone;
    }

    metrics.addMetric('GetUserByShortIdSuccess', MetricUnit.Count, 1);

    return {
      statusCode: 200,
      body: JSON.stringify(userProfile),
    };
  } catch (error) {
    logger.error('Error getting user by short_id', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    metrics.addMetric('GetUserByShortIdError', MetricUnit.Count, 1);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error interno del servidor.',
      }),
    };
  }
};
