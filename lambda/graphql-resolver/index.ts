import { AppSyncIdentityCognito, AppSyncResolverHandler } from 'aws-lambda';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import {
  MutationViewProfileArgs,
  MutationUpdateUserArgs,
  User,
  MutationRegisterSponsorVisitArgs,
  QueryGetSponsorVisitArgs,
  MutationCheckInAttendeeArgs,
} from '@awscommunity/generated-ts';
import handleViewProfile from './handlers/viewProfile';
import handleUpdateUser from './handlers/updateUser';
import handleRegisterSponsorVisit from './handlers/registerSponsorVisit';
import handleViewSponsorVisit from './handlers/viewSponsorVisit';
import getSponsorDashboard from './handlers/getSponsorDashboard';
import { handler as handleCheckInAttendee } from './handlers/checkInAttendee';
import getMyProfile from './handlers/getMyProfile';
import { AppSyncResolverEvent } from 'aws-lambda';

const SERVICE_NAME = 'graphql-resolver';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

type HandlerArgs =
  | MutationViewProfileArgs
  | MutationUpdateUserArgs
  | MutationRegisterSponsorVisitArgs
  | QueryGetSponsorVisitArgs
  | MutationCheckInAttendeeArgs;

export const handler = middy((async (event) => {
  const correlationId = `${event.info.fieldName}-${Date.now()}`;
  logger.appendKeys({ correlationId });
  try {
    logger.info(`Processing ${event.info.fieldName}`, { event });
    metrics.addMetric(`${event.info.fieldName}Attempt`, MetricUnit.Count, 1);

    const identity = event.identity as AppSyncIdentityCognito;

    if (event.info.fieldName === 'getMyProfile') {
      return getMyProfile(identity);
    }

    if (event.info.fieldName === 'viewProfile') {
      const { id, pin } = event.arguments as MutationViewProfileArgs;
      return handleViewProfile(id, identity.sub, pin);
    }

    if (event.info.fieldName === 'updateUser') {
      const updates: Partial<Omit<User, 'user_id' | 'short_id'>> = {};
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

    throw new Error(`Unsupported field ${event.info.fieldName}`);
  } catch (error) {
    logger.error('Error processing request', { error });
    metrics.addMetric(`${event.info.fieldName}Error`, MetricUnit.Count, 1);
    throw error;
  } finally {
    metrics.publishStoredMetrics();
  }
}) as AppSyncResolverHandler<HandlerArgs, any>).use(captureLambdaHandler(tracer));

export { handleViewProfile, handleUpdateUser };
