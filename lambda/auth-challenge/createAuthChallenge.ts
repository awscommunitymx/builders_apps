import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Initialize Powertools
const logger = new Logger({ serviceName: 'createAuthChallenge' });
const tracer = new Tracer({ serviceName: 'createAuthChallenge' });
const metrics = new Metrics({ namespace: 'CustomAuth', serviceName: 'createAuthChallenge' });

// Environment variables
const { TABLE_NAME } = process.env;

// Initialize AWS clients
const dynamoDBClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Define types for the Cognito Create Auth Challenge event
interface CognitoCreateAuthChallengeEvent {
  request: {
    userAttributes: {
      email: string;
      [key: string]: string; // Allow other attributes
    };
    challengeName: string;
    session: Array<{
      challengeName?: string;
      challengeResult: boolean;
      challengeMetadata?: string;
    }>;
  };
  response: {
    publicChallengeParameters: {
      email: string;
      [key: string]: string;
    };
    privateChallengeParameters: {
      challenge: string;
      [key: string]: string;
    };
    challengeMetadata?: string;
  };
}

interface AuthChallenge {
  PK: string;
  SK: string;
  token: string;
  expiration: string;
  created_at: string;
  ttl: number;
}

// Function to retrieve auth challenge from DynamoDB
const getAuthChallengeFromDynamoDB = async (email: string): Promise<string | null> => {
  if (!TABLE_NAME) {
    throw new Error('TABLE_NAME environment variable is not set');
  }

  try {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `AUTH#${email}`,
        SK: 'AUTH_CHALLENGE',
      },
    });

    const response = await docClient.send(command);

    if (!response.Item) {
      logger.warn('No auth challenge found in DynamoDB', { email });
      return null;
    }

    const authChallenge = response.Item as AuthChallenge;

    // Check if the challenge has expired
    const now = new Date();
    const expiration = new Date(authChallenge.expiration);

    if (now > expiration) {
      logger.warn('Auth challenge has expired', {
        email,
        expiration: authChallenge.expiration,
        now: now.toISOString(),
      });
      return null;
    }

    logger.info('Auth challenge retrieved successfully from DynamoDB', {
      email,
      hasToken: !!authChallenge.token,
      expiration: authChallenge.expiration,
    });

    return authChallenge.token;
  } catch (error) {
    logger.error('Failed to retrieve auth challenge from DynamoDB', { error, email });
    throw error;
  }
};

export const handler = async (
  event: CognitoCreateAuthChallengeEvent,
  context: any
): Promise<CognitoCreateAuthChallengeEvent> => {
  // Add context to logs
  logger.addContext(context);

  // Start tracing
  const segment = tracer.getSegment();
  const handlerSegment = segment?.addNewSubsegment('createAuthChallenge');

  try {
    logger.info('Creating auth challenge', {
      email: event.request.userAttributes.email,
      challengeName: event.request.challengeName,
      sessionLength: event.request.session.length,
    });

    // Validate required attributes
    if (!event.request.userAttributes.email) {
      logger.error('Missing required email attribute');
      metrics.addMetric('MissingEmail', MetricUnit.Count, 1);
      throw new Error('Missing required email attribute');
    }

    // Retrieve auth challenge token from DynamoDB
    const challengeToken = await getAuthChallengeFromDynamoDB(event.request.userAttributes.email);

    if (!challengeToken) {
      logger.error('No valid auth challenge found in DynamoDB', {
        email: event.request.userAttributes.email,
      });
      metrics.addMetric('NoChallengeFound', MetricUnit.Count, 1);
      throw new Error('No valid authentication challenge found');
    }

    // Set public challenge parameters (visible to the client)
    event.response.publicChallengeParameters = {
      email: event.request.userAttributes.email,
    };

    // Set private challenge parameters (used for verification, not sent to client)
    event.response.privateChallengeParameters = {
      challenge: challengeToken,
    };

    // Optional: Add challenge metadata for tracking
    event.response.challengeMetadata = JSON.stringify({
      timestamp: new Date().toISOString(),
      attempt: event.request.session.length + 1,
      source: 'dynamodb',
    });

    logger.info('Auth challenge created successfully', {
      publicParams: event.response.publicChallengeParameters,
      hasPrivateParams: !!event.response.privateChallengeParameters.challenge,
      source: 'dynamodb',
    });

    metrics.addMetric('ChallengeCreated', MetricUnit.Count, 1);

    return event;
  } catch (error) {
    logger.error('Error creating auth challenge', error as Error);
    metrics.addMetric('CreateChallengeError', MetricUnit.Count, 1);

    // Re-throw to let Cognito handle the error
    throw error;
  } finally {
    handlerSegment?.close();
    metrics.publishStoredMetrics();
  }
};
