import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import middy from '@middy/core';
import fetch from 'node-fetch';
import { Context } from 'aws-lambda';
import * as crypto from 'crypto';
import {
  Session,
  RoomAgendaData,
  AgendaDataInput,
} from '@awscommunity/generated-ts';
import { 
  parseSessions, 
  parseAgenda, 
  SessionizePayload 
} from '../../../utils/sessionizeParser';

// Powertools setup
const logger = new Logger({ serviceName: 'agenda-fetcher' });
const tracer = new Tracer({ serviceName: 'agenda-fetcher' });
const metrics = new Metrics({ serviceName: 'agenda-fetcher' });

// AWS SDK clients (instrumented)
const dynamoClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = tracer.captureAWSv3Client(new S3Client({}));

// Environment variables
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const S3_BUCKET = process.env.S3_BUCKET!;
const SESSIONIZE_API_URL = process.env.SESSIONIZE_API_URL!;
const APPSYNC_ENDPOINT = process.env.APPSYNC_ENDPOINT!;
const APPSYNC_API_KEY = process.env.APPSYNC_API_KEY!;

// Validate required environment variables
if (!TABLE_NAME || !S3_BUCKET || !SESSIONIZE_API_URL || !APPSYNC_ENDPOINT || !APPSYNC_API_KEY) {
  throw new Error('Missing required environment variables');
}

// Log configuration info (without exposing full API key)
logger.info('Configuration loaded', {
  tableName: TABLE_NAME,
  s3Bucket: S3_BUCKET,
  appSyncEndpoint: APPSYNC_ENDPOINT,
  apiKeyLength: APPSYNC_API_KEY.length,
  apiKeyPrefix: APPSYNC_API_KEY.substring(0, 8) + '...'
});

// Helper functions
const canonicalize = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(canonicalize).sort((a, b) =>
      a.id && b.id ? String(a.id).localeCompare(String(b.id)) : 0
    );
  } else if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc: any, key) => {
        acc[key] = canonicalize(obj[key]);
        return acc;
      }, {});
  }
  return obj;
};

const computeHash = (data: any): string =>
  crypto.createHash('md5').update(JSON.stringify(canonicalize(data))).digest('hex');

/**
 * Retrieves hash from DynamoDB
 */
const getHash = async (key: string): Promise<string | null> => {
  try {
    const resp = await docClient.send(
      new GetCommand({ 
        TableName: TABLE_NAME, 
        Key: { 
          PK: `AGENDA#${key}`,
          SK: 'HASH'
        } 
      })
    );
    return resp.Item?.hash ?? null;
  } catch (error) {
    logger.error('Error getting hash from DynamoDB', { key, error });
    throw error;
  }
};

/**
 * Stores hash in DynamoDB
 */
const putHash = async (key: string, hash: string): Promise<void> => {
  try {
    await docClient.send(
      new PutCommand({ 
        TableName: TABLE_NAME, 
        Item: { 
          PK: `AGENDA#${key}`,
          SK: 'HASH',
          hash,
          updatedAt: new Date().toISOString()
        } 
      })
    );
    logger.debug('Hash updated in DynamoDB', { key, hash });
  } catch (error) {
    logger.error('Error putting hash to DynamoDB', { key, hash, error });
    throw error;
  }
};

/**
 * Converts Session objects to the format expected by GraphQL mutation
 */
const sessionToInput = (session: Session) => {
  return {
    id: session.id,
    name: session.name || null,
    description: session.description || null,
    extendedDescription: session.extendedDescription || null,
    speakers: session.speakers?.map(speaker => ({
      id: speaker.id || null,
      name: speaker.name,
      avatarUrl: speaker.avatarUrl || null,
      company: speaker.company || null,
      bio: speaker.bio || null,
      nationality: speaker.nationality || null,
      socialMedia: speaker.socialMedia ? {
        twitter: speaker.socialMedia.twitter || null,
        linkedin: speaker.socialMedia.linkedin || null,
        company: speaker.socialMedia.company || null,
      } : null,
    })) || null,
    time: session.time,
    dateStart: session.dateStart,
    dateEnd: session.dateEnd,
    duration: session.duration || null,
    location: session.location || null,
    nationality: session.nationality || null,
    level: session.level || null,
    language: session.language || null,
    category: session.category || null, // Fixed: was 'catergory' in original example
    capacity: session.capacity || null,
    status: session.status || null,
    liveUrl: session.liveUrl || null,
    recordingUrl: session.recordingUrl || null,
  };
};

/**
 * Publishes room agenda update via GraphQL mutation
 */
const publishUpdate = async (
  location: string,
  sessions: Session[]
): Promise<void> => {
  const mutation = `
    mutation UpdateRoomAgenda($location: String!, $sessions: AgendaDataInput!) {
      updateRoomAgenda(location: $location, sessions: $sessions) {
        location
        sessions {
          id
          name
          time
          dateStart
          dateEnd
          duration
          location
          nationality
          level
          language
          category
          capacity
          status
          liveUrl
          recordingUrl
          speakers {
            id
            name
            avatarUrl
            company
            bio
            nationality
            socialMedia {
              twitter
              linkedin
              company
            }
          }
        }
      }
    }
  `;

  // Convert sessions to input format
  const sessionInputs = sessions.map(sessionToInput);

  const variables = {
    location: location,
    sessions: {
      sessions: sessionInputs
    } as AgendaDataInput
  };

  logger.info('Publishing room agenda update', {
    location,
    sessionCount: sessions.length,
    apiEndpoint: APPSYNC_ENDPOINT
  });

  logger.debug('GraphQL mutation variables', { 
    variables: {
      location: variables.location,
      sessionCount: variables.sessions.sessions.length,
      sampleSession: variables.sessions.sessions[0] ? {
        id: variables.sessions.sessions[0].id,
        name: variables.sessions.sessions[0].name,
        speakerCount: variables.sessions.sessions[0].speakers?.length || 0
      } : null
    }
  });

  try {
    const response = await fetch(APPSYNC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APPSYNC_API_KEY,
        'User-Agent': 'AgendaFetcher/1.0'
      },
      body: JSON.stringify({
        query: mutation,
        variables: variables
      })
    });

    logger.debug('GraphQL response status', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('AppSync HTTP error', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`AppSync HTTP error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json() as any;
    logger.debug('GraphQL response body', { result });

    if (result.errors && result.errors.length > 0) {
      logger.error('GraphQL errors in response', {
        errors: result.errors,
        location,
        sessionCount: sessions.length
      });
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    if (!result.data || !result.data.updateRoomAgenda) {
      logger.error('Unexpected GraphQL response structure', { result });
      throw new Error('Unexpected GraphQL response: missing data.updateRoomAgenda');
    }

    logger.info('Successfully published room agenda update', {
      location,
      sessionCount: sessions.length,
      updatedSessionCount: result.data.updateRoomAgenda.sessions?.length || 0
    });

    metrics.addMetric('GraphQLSuccess', MetricUnit.Count, 1);

  } catch (error) {
    logger.error('Error publishing room agenda update', {
      location,
      sessionCount: sessions.length,
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    });
    
    metrics.addMetric('GraphQLError', MetricUnit.Count, 1);
    throw error;
  }
};

/**
 * Main Lambda handler
 */
const baseHandler = async (_evt: any, _ctx: Context) => {
  logger.info('Starting agenda fetch process');
  metrics.addMetric('FetchAttempt', MetricUnit.Count, 1);

  try {
    // Fetch data from Sessionize
    logger.info('Fetching data from Sessionize', { url: SESSIONIZE_API_URL });
    const resp = await fetch(SESSIONIZE_API_URL);
    
    if (!resp.ok) {
      const errorText = await resp.text();
      logger.error('Sessionize fetch failed', {
        status: resp.status,
        statusText: resp.statusText,
        body: errorText
      });
      throw new Error(`Sessionize fetch failed: ${resp.status} ${resp.statusText} - ${errorText}`);
    }

    const payload = (await resp.json()) as SessionizePayload;
    logger.info('Successfully fetched Sessionize data', {
      sessionsCount: payload.sessions?.length || 0,
      speakersCount: payload.speakers?.length || 0,
      roomsCount: payload.rooms?.length || 0
    });

    // Process global agenda blob
    logger.info('Processing global agenda data');
    const agendaData = parseAgenda(payload);
    const fullHash = computeHash(agendaData);
    const oldFull = await getHash('ALL');
    
    logger.debug('Global agenda hash comparison', {
      newHash: fullHash,
      oldHash: oldFull,
      changed: fullHash !== oldFull,
      sessionCount: agendaData.sessions.length
    });

    if (fullHash !== oldFull) {
      logger.info('Global agenda changed, updating S3 and hash');
      
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: 'all-sessions.json',
          Body: JSON.stringify(agendaData, null, 2),
          ContentType: 'application/json',
        })
      );
      metrics.addMetric('S3Writes', MetricUnit.Count, 1);
      
      await putHash('ALL', fullHash);
      metrics.addMetric('HashUpdates', MetricUnit.Count, 1);
      
      logger.info('Global agenda updated successfully');
    } else {
      logger.info('Global agenda unchanged, skipping update');
    }

    // Process per-room agenda
    logger.info('Processing room-specific agenda data');
    const allRooms = parseSessions(payload);
    logger.info(`Found ${allRooms.length} rooms to process`);

    let roomsUpdated = 0;
    let roomsSkipped = 0;

    for (const roomData of allRooms) {
      const { location, sessions } = roomData;
      
      logger.debug(`Processing room: ${location}`, { sessionCount: sessions.length });
      
      const roomHash = computeHash(roomData);
      const oldRoomHash = await getHash(location);
      
      if (roomHash === oldRoomHash) {
        logger.debug(`Room ${location} unchanged, skipping`);
        roomsSkipped++;
        continue;
      }

      logger.info(`Room ${location} changed, updating`, {
        newHash: roomHash,
        oldHash: oldRoomHash,
        sessionCount: sessions.length
      });

      // Update S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: `room-${location}.json`,
          Body: JSON.stringify(roomData, null, 2),
          ContentType: 'application/json',
        })
      );
      metrics.addMetric('S3Writes', MetricUnit.Count, 1);

      // Update hash in DynamoDB
      await putHash(location, roomHash);
      metrics.addMetric('HashUpdates', MetricUnit.Count, 1);

      // Publish GraphQL update
      await publishUpdate(location, sessions);
      metrics.addMetric('Broadcasts', MetricUnit.Count, 1);
      
      roomsUpdated++;
      logger.info(`Successfully updated room: ${location}`);
    }

    logger.info('Agenda fetch process completed successfully', {
      totalRooms: allRooms.length,
      roomsUpdated,
      roomsSkipped,
      totalSessions: agendaData.sessions.length
    });

    metrics.addMetric('ProcessingSuccess', MetricUnit.Count, 1);
    metrics.addMetric('RoomsUpdated', MetricUnit.Count, roomsUpdated);
    metrics.addMetric('RoomsSkipped', MetricUnit.Count, roomsSkipped);

    return { 
      status: 'ok',
      roomsProcessed: allRooms.length,
      roomsUpdated,
      roomsSkipped,
      totalSessions: agendaData.sessions.length
    };

  } catch (error) {
    logger.error('Agenda fetch process failed', {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    });
    
    metrics.addMetric('ProcessingError', MetricUnit.Count, 1);
    throw error;
  }
};

export const handler = middy(baseHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger));
