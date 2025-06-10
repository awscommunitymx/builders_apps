import { AppSyncIdentityCognito, AppSyncResolverEvent, AppSyncResolverHandler } from 'aws-lambda';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import middy from '@middy/core';
import {
  MutationViewProfileArgs,
  MutationUpdateUserArgs,
  MutationUpdateRoomAgendaArgs,
  QueryGetRoomAgendaArgs,
} from '@awscommunity/generated-ts';
import handleViewProfile from './handlers/viewProfile';
import handleUpdateUser from './handlers/updateUser';
import { handleGetRoomAgenda } from './handlers/getRoomAgenda';
import { handleGetAgenda } from './handlers/getAgenda';

const SERVICE_NAME = 'graphql-resolver';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

// Initialize S3 client with tracing
const s3Client = tracer.captureAWSv3Client(new S3Client({}));

// Environment variables
const S3_BUCKET = process.env.S3_BUCKET!;

if (!S3_BUCKET) {
  throw new Error('Missing required environment variable: S3_BUCKET');
}

type HandlerArgs = MutationViewProfileArgs | MutationUpdateUserArgs | MutationUpdateRoomAgendaArgs | QueryGetRoomAgendaArgs;

export const handler = middy((async (event: AppSyncResolverEvent<HandlerArgs>) => {
  const correlationId = `${event.info.fieldName}-${Date.now()}`;
  logger.appendKeys({ correlationId });
  
  try {
    logger.info(`Processing ${event.info.fieldName}`, { 
      fieldName: event.info.fieldName,
      arguments: event.arguments 
    });
    metrics.addMetric(`${event.info.fieldName}Attempt`, MetricUnit.Count, 1);

    // Handle Query operations (no authentication required for agenda data)
    if (event.info.fieldName === 'getAgenda') {
      return await handleGetAgenda(s3Client, S3_BUCKET, SERVICE_NAME);
    }

    if (event.info.fieldName === 'getRoomAgenda') {
      const { location } = event.arguments as QueryGetRoomAgendaArgs;
      if (!location) {
        throw new Error('Location parameter is required for getRoomAgenda');
      }
      return await handleGetRoomAgenda(location, s3Client, S3_BUCKET, SERVICE_NAME);
    }

    if (event.info.fieldName === 'updateRoomAgenda') {
      // Echo back for subscription broadcasting
      const { location, sessions } = event.arguments as MutationUpdateRoomAgendaArgs;
      logger.info('Broadcasting room agenda update', { 
        location, 
        sessionCount: sessions.sessions?.length || 0 
      });
      
      return {
        location,
        sessions: sessions.sessions,
      };
    }

    // Handle Mutation operations (require authentication)
    const identity = event.identity as AppSyncIdentityCognito;
    
    if (!identity) {
      throw new Error('Authentication required for this operation');
    }

    if (event.info.fieldName === 'viewProfile') {
      const { id, pin } = event.arguments as MutationViewProfileArgs;
      return handleViewProfile(id, identity.sub, pin);
    }

    if (event.info.fieldName === 'updateUser') {
      const { input } = event.arguments as MutationUpdateUserArgs;
      return handleUpdateUser(identity.sub, input);
    }

    throw new Error(`Unsupported field ${event.info.fieldName}`);
  } catch (error) {
    logger.error('Error processing request', { 
      fieldName: event.info.fieldName,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    metrics.addMetric(`${event.info.fieldName}Error`, MetricUnit.Count, 1);
    throw error;
  } finally {
    metrics.publishStoredMetrics();
  }
}) as AppSyncResolverHandler<HandlerArgs, any>).use(captureLambdaHandler(tracer));
