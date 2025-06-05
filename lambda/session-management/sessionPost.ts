import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

const { TABLE_NAME } = process.env;

// Initialize AWS Powertools
const logger = new Logger({ serviceName: 'session-post' });
const tracer = new Tracer({ serviceName: 'session-post' });
const metrics = new Metrics({ namespace: 'SessionManagement', serviceName: 'session-post' });

// Initialize AWS clients
const dynamoDBClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

interface SessionRequest {
  sessionId: string;
}

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

  // Parse JSON body
  let requestBody: SessionRequest;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch (error) {
    logger.warn('Invalid JSON in request body');
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Invalid JSON in request body',
      }),
    };
  }

  const { sessionId } = requestBody;

  if (!sessionId) {
    logger.warn('Missing sessionId in request body');
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'sessionId is required',
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
    // Store session in DynamoDB with PK=AGENDA#anonUserId and SK=FAV#sessionId
    const item = {
      PK: `AGENDA#${anonUserId}`,
      SK: `FAV#${sessionId}`,
      anonUserId,
      sessionId,
      createdAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    logger.info('Session stored successfully', {
      anonUserId,
      sessionId,
      PK: item.PK,
      SK: item.SK,
    });

    metrics.addMetric('SessionCreated', MetricUnit.Count, 1);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Session created successfully',
        anonUserId,
        sessionId,
      }),
    };
  } catch (error) {
    logger.error('Error storing session', { error, anonUserId, sessionId });
    metrics.addMetric('SessionCreateError', MetricUnit.Count, 1);

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
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
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
