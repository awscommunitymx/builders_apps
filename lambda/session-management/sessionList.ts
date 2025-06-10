import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

const { TABLE_NAME } = process.env;

// Initialize AWS Powertools
const logger = new Logger({ serviceName: 'session-list' });
const tracer = new Tracer({ serviceName: 'session-list' });
const metrics = new Metrics({ namespace: 'SessionManagement', serviceName: 'session-list' });

// Initialize AWS clients
const dynamoDBClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Removed FavoriteSession interface - we'll just return session IDs

// Helper function to parse cookies from request headers
const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((cookies: Record<string, string>, cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
    return cookies;
  }, {});
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!TABLE_NAME) {
    logger.error('TABLE_NAME environment variable not set');
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error: missing configuration',
      }),
    };
  }

  // Parse cookies to extract anonUserId
  const cookies = parseCookies(event.headers.Cookie || event.headers.cookie);
  const anonUserId = cookies.anonUserId;

  if (!anonUserId) {
    logger.warn('Missing anonUserId cookie');
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'anonUserId cookie is required',
      }),
    };
  }

  try {
    // Query DynamoDB for all favorite sessions for this user
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `AGENDA#${anonUserId}`,
        ':skPrefix': 'FAV#',
      },
      ProjectionExpression: 'sessionId',
    });

    const response = await docClient.send(queryCommand);

    // Transform the response to extract just the session IDs
    const sessionIds: string[] = (response.Items || []).map((item: any) => item.sessionId);

    logger.info('Favorite sessions retrieved successfully', {
      anonUserId,
      sessionCount: sessionIds.length,
    });

    metrics.addMetric('FavoriteSessionsRetrieved', MetricUnit.Count, 1);
    metrics.addMetric('SessionCount', MetricUnit.Count, sessionIds.length);

    return {
      statusCode: 200,
      body: JSON.stringify(sessionIds),
    };
  } catch (error) {
    logger.error('Error retrieving favorite sessions', { error, anonUserId });
    metrics.addMetric('SessionListError', MetricUnit.Count, 1);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
      }),
    };
  }
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://agenda.awscommunity.mx',
    'Access-Control-Allow-Headers':
      'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Cookie',
    'Access-Control-Allow-Methods': 'OPTIONS,GET',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  const result = await lambdaHandler(event);
  return {
    ...result,
    headers: {
      ...result.headers,
      ...corsHeaders,
    },
  };
};
