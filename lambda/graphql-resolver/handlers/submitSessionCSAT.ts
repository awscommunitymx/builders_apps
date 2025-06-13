import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { SessionCsatInput, SessionCsatResponse } from '@awscommunity/generated-ts';
import { getAuthenticatedUser } from '../utils/getAuthenticatedUser';
import { fetchFromS3 } from '../utils/fetchFromS3';
import { S3Client } from '@aws-sdk/client-s3';

const SERVICE_NAME = 'submit-session-csat-service';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = tracer.captureAWSv3Client(new S3Client({}));
const tableName = process.env.TABLE_NAME!;

interface Session {
  id: string;
  name: string;
  description?: string;
  speakers?: Array<{
    name: string;
    company?: string;
  }>;
  time: string;
  location?: string;
  category?: string;
}

export default async function handleSubmitSessionCSAT(
  authenticatedUserSub: string,
  input: SessionCsatInput,
  s3BucketName: string
): Promise<SessionCsatResponse> {
  logger.info('Starting CSAT submission', {
    sessionId: input.sessionId,
    userSub: authenticatedUserSub,
  });

  try {
    logger.info('Processing session CSAT submission', {
      sessionId: input.sessionId,
      rating: input.rating,
      userSub: authenticatedUserSub,
    });

    // Validate rating range
    if (input.rating < 1 || input.rating > 5) {
      logger.warn('Invalid rating provided', { rating: input.rating });
      metrics.addMetric('InvalidRating', MetricUnit.Count, 1);
      return {
        success: false,
        message: 'La calificación debe estar entre 1 y 5',
      };
    }

    // Get authenticated user
    logger.info('Getting authenticated user');
    const authenticatedUser = await getAuthenticatedUser(
      authenticatedUserSub,
      tracer,
      docClient,
      logger,
      metrics,
      tableName
    );

    logger.info('Authenticated user retrieved', {
      userId: authenticatedUser.user_id,
      sessionId: input.sessionId,
    });

    // Fetch sessions from S3 to validate sessionId
    logger.info('Fetching sessions from S3', { bucket: s3BucketName });
    let sessionsData;
    let sessions: Session[] = [];
    
    try {
      sessionsData = await fetchFromS3(
        'all-sessions.json',
        s3Client,
        s3BucketName,
        SERVICE_NAME
      );
      sessions = sessionsData?.sessions || [];
      logger.info('Sessions fetched successfully', { sessionCount: sessions.length });
    } catch (s3Error: any) {
      logger.warn('Failed to fetch sessions from S3, continuing anyway', { 
        error: s3Error.message,
        bucket: s3BucketName 
      });
      // Continue without session validation if S3 fetch fails
    }

    let session = null;
    if (sessions.length > 0) {
      session = sessions.find((s) => s.id === input.sessionId);
      if (!session) {
        logger.warn('Session not found in S3 data', { sessionId: input.sessionId });
        metrics.addMetric('SessionNotFound', MetricUnit.Count, 1);
        return {
          success: false,
          message: 'Sesión no encontrada',
        };
      }
    } else {
      logger.info('No sessions data available, proceeding without validation');
    }

    // Check if user has already submitted CSAT for this session
    const existingCSATParams = {
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `CSAT#${input.sessionId}`,
        ':sk': `USER#${authenticatedUser.user_id}`,
      },
      Limit: 1,
    };

    const existingCSAT = await docClient.send(new QueryCommand(existingCSATParams));

    if (existingCSAT.Items && existingCSAT.Items.length > 0) {
      // Update existing CSAT rating
      const updateParams = {
        TableName: tableName,
        Key: {
          PK: `CSAT#${input.sessionId}`,
          SK: `USER#${authenticatedUser.user_id}`,
        },
        UpdateExpression: 'SET #rating = :rating, #feedback = :feedback, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#rating': 'rating',
          '#feedback': 'feedback',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':rating': input.rating,
          ':feedback': input.feedback || '',
          ':updatedAt': new Date().toISOString(),
        },
      };

      await docClient.send(new UpdateCommand(updateParams));

      logger.info('CSAT rating updated successfully', {
        userId: authenticatedUser.user_id,
        sessionId: input.sessionId,
        rating: input.rating,
      });

      metrics.addMetric('CSATUpdated', MetricUnit.Count, 1);
      metrics.addMetric(`CSATRating${input.rating}`, MetricUnit.Count, 1);

      return {
        success: true,
        message: 'Calificación actualizada exitosamente',
      };
    } else {
      // Create new CSAT entry using atomic write
      const timestamp = new Date().toISOString();

      const putParams = {
        TableName: tableName,
        Item: {
          PK: `CSAT#${input.sessionId}`,
          SK: `USER#${authenticatedUser.user_id}`,
          sessionId: input.sessionId,
          sessionName: session?.name || `Session ${input.sessionId}`,
          userId: authenticatedUser.user_id,
          rating: input.rating,
          feedback: input.feedback || '',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        ConditionExpression: 'attribute_not_exists(PK)', // Atomic write - ensure no duplicate
      };

      await docClient.send(new PutCommand(putParams));

      logger.info('CSAT rating submitted successfully', {
        userId: authenticatedUser.user_id,
        sessionId: input.sessionId,
        rating: input.rating,
      });

      metrics.addMetric('CSATSubmitted', MetricUnit.Count, 1);
      metrics.addMetric(`CSATRating${input.rating}`, MetricUnit.Count, 1);

      return {
        success: true,
        message: 'Calificación enviada exitosamente',
      };
    }
  } catch (error: any) {
    logger.error('Error submitting session CSAT', {
      error: error.message,
      stack: error.stack,
      sessionId: input.sessionId,
      userSub: authenticatedUserSub,
    });

    metrics.addMetric('CSATSubmissionError', MetricUnit.Count, 1);

    if (error.name === 'ConditionalCheckFailedException') {
      // This should rarely happen due to the query check above, but just in case
      return {
        success: false,
        message: 'Ya has calificado esta sesión',
      };
    }

    // Return a safe error response for any other error
    return {
      success: false,
      message: 'Error interno del servidor. Por favor intenta más tarde.',
    };
  }
}
