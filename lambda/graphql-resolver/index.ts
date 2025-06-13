import { AppSyncIdentityCognito, AppSyncResolverEvent, AppSyncResolverHandler } from 'aws-lambda';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { S3Client } from '@aws-sdk/client-s3';
import middy from '@middy/core';
import {
  MutationViewProfileArgs,
  MutationUpdateUserArgs,
  MutationUpdateAgendaArgs,
  MutationUpdateRoomAgendaArgs,
  QueryGetRoomAgendaArgs,
  QueryGetRoomAgendaHashArgs,
  User,
  MutationRegisterSponsorVisitArgs,
  QueryGetSponsorVisitArgs,
  MutationCheckInAttendeeArgs,
  MutationSubmitSessionCsatArgs,
  QueryGetAvailablePhotoSessionsArgs,
  QueryGetPhotoSessionReservationsArgs,
  MutationReservePhotoSessionArgs,
} from '@awscommunity/generated-ts';
import handleViewProfile from './handlers/viewProfile';
import handleUpdateUser from './handlers/updateUser';
import { handleGetRoomAgenda } from './handlers/getRoomAgenda';
import { handleGetAgenda } from './handlers/getAgenda';
import { getHash } from './handlers/getHash';
import handleRegisterSponsorVisit from './handlers/registerSponsorVisit';
import handleViewSponsorVisit from './handlers/viewSponsorVisit';
import getSponsorDashboard from './handlers/getSponsorDashboard';
import { handler as handleCheckInAttendee } from './handlers/checkInAttendee';
import getMyProfile from './handlers/getMyProfile';
import handleSubmitSessionCSAT from './handlers/submitSessionCSAT';
import {
  getAvailablePhotoSessions,
  getMyPhotoReservation,
  getPhotoSessionReservations,
  reservePhotoSession,
  cancelPhotoReservation
} from './handlers/photoSessions';

const SERVICE_NAME = 'graphql-resolver';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

// Initialize S3 client with tracing
const s3Client = tracer.captureAWSv3Client(new S3Client({}));

// Environment variables
const S3_BUCKET = process.env.S3_BUCKET!;
const TABLE_NAME = process.env.TABLE_NAME!;

if (!S3_BUCKET) {
  throw new Error('Missing required environment variable: S3_BUCKET');
}

if (!TABLE_NAME) {
  throw new Error('Missing DYNAMODB_TABLE_NAME');
}

type HandlerArgs =
  | MutationViewProfileArgs
  | MutationUpdateUserArgs
  | MutationUpdateAgendaArgs
  | MutationUpdateRoomAgendaArgs
  | QueryGetRoomAgendaArgs
  | QueryGetRoomAgendaHashArgs
  | MutationRegisterSponsorVisitArgs
  | QueryGetSponsorVisitArgs
  | MutationCheckInAttendeeArgs
  | MutationSubmitSessionCsatArgs
  | QueryGetAvailablePhotoSessionsArgs
  | QueryGetPhotoSessionReservationsArgs
  | MutationReservePhotoSessionArgs;

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

    if (event.info.fieldName === 'updateAgenda') {
      // Echo back for subscription broadcasting
      const { sessions } = event.arguments as MutationUpdateAgendaArgs;
      logger.info('Broadcasting agenda update', { 
        sessionCount: sessions.sessions?.length || 0 
      });
      
      return {
        sessions: sessions.sessions,
      };
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

    if (event.info.fieldName === 'getAgendaHash') {
      // Always uses the "ALL" key
      const hash = await getHash('ALL', TABLE_NAME, SERVICE_NAME);
      logger.info(`Hash received: ${hash}`);
      if (!hash) {
        throw new Error('No agenda hash found in DynamoDB');
      }
      return hash;
    }

    if (event.info.fieldName === 'getRoomAgendaHash') {
      const { location } = event.arguments as QueryGetRoomAgendaHashArgs;
      if (!location) {
        throw new Error('Location parameter is required for getRoomAgendaHash');
      }
      const hash = await getHash(location, TABLE_NAME, SERVICE_NAME);
      logger.info(`Hash received: ${hash}`);
      if (!hash) {
        throw new Error('No agenda hash found in DynamoDB');
      }
      return hash;
    }

    const identity = event.identity as AppSyncIdentityCognito;
    
    if (!identity) {
      throw new Error('Authentication required for this operation');
    }

    if (event.info.fieldName === 'getMyProfile') {
      return getMyProfile(identity);
    }

    if (event.info.fieldName === 'viewProfile') {
      const { id, pin } = event.arguments as MutationViewProfileArgs;
      return handleViewProfile(id, identity.sub, pin);
    }

    if (event.info.fieldName === 'updateUser') {
      const { input } = event.arguments as MutationUpdateUserArgs;
      return handleUpdateUser(identity.sub, input);
    }

    if (event.info.fieldName === 'registerSponsorVisit') {
      const { input } = event.arguments as MutationRegisterSponsorVisitArgs;
      return handleRegisterSponsorVisit(identity, input);
    }

    if (event.info.fieldName === 'getSponsorVisit') {
      const { short_id } = event.arguments as QueryGetSponsorVisitArgs;
      return handleViewSponsorVisit(identity, short_id);
    }

    if (event.info.fieldName === 'getSponsorDashboard') {
      return getSponsorDashboard(identity);
    }

    if (event.info.fieldName === 'checkInAttendee') {
      const { barcode_id, user_id, bypass_email, bypass_phone, email, phone } =
        event.arguments as MutationCheckInAttendeeArgs;
      return handleCheckInAttendee({
        arguments: { barcode_id, user_id, bypass_email, bypass_phone, email, phone },
        identity,
      });
    }

    if (event.info.fieldName === 'submitSessionCSAT') {
      const { input } = event.arguments as MutationSubmitSessionCsatArgs;
      return handleSubmitSessionCSAT(identity.sub, input, S3_BUCKET);
    }

    // Photo session handlers
    if (event.info.fieldName === 'getAvailablePhotoSessions') {
      const { date } = event.arguments as QueryGetAvailablePhotoSessionsArgs;
      return getAvailablePhotoSessions(date);
    }

    if (event.info.fieldName === 'getMyPhotoReservation') {
      return getMyPhotoReservation(identity);
    }

    if (event.info.fieldName === 'getPhotoSessionReservations') {
      const { timeSlot, date } = event.arguments as QueryGetPhotoSessionReservationsArgs;
      return getPhotoSessionReservations(timeSlot, date);
    }

    if (event.info.fieldName === 'reservePhotoSession') {
      const { input } = event.arguments as MutationReservePhotoSessionArgs;
      return reservePhotoSession(identity, input.timeSlot, input.date);
    }

    if (event.info.fieldName === 'cancelPhotoReservation') {
      return cancelPhotoReservation(identity);
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
