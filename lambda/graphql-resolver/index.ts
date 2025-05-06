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
  UpdateUserInput,
} from '@awscommunity/generated-ts';
import handleViewProfile from './handlers/viewProfile';
import handleUpdateUser from './handlers/updateUser';

const SERVICE_NAME = 'graphql-resolver';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

type HandlerArgs = MutationViewProfileArgs | MutationUpdateUserArgs;

export const handler = middy((async (event) => {
  const correlationId = `${event.info.fieldName}-${Date.now()}`;
  logger.appendKeys({ correlationId });
  try {
    logger.info(`Processing ${event.info.fieldName}`, { event });
    metrics.addMetric(`${event.info.fieldName}Attempt`, MetricUnit.Count, 1);

    const identity = event.identity as AppSyncIdentityCognito;

    if (event.info.fieldName === 'viewProfile') {
      const { id } = event.arguments as MutationViewProfileArgs;
      return handleViewProfile(id, identity.sub);
    }

    if (event.info.fieldName === 'updateUser') {
      const updates: Partial<Omit<User, 'user_id' | 'short_id'>> = {};
      const { input } = event.arguments as MutationUpdateUserArgs;
      return handleUpdateUser(identity.sub, input);
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
