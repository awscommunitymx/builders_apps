import { AppSyncResolverHandler } from 'aws-lambda';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import { MutationViewProfileArgs, MutationUpdateUserArgs, User } from '@awscommunity/generated-ts';
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

    if (event.info.fieldName === 'viewProfile') {
      const { shortId, pin, viewerId } = event.arguments as MutationViewProfileArgs;
      return handleViewProfile(shortId, pin, viewerId);
    }

    if (event.info.fieldName === 'updateUser') {
      const { input } = event.arguments as MutationUpdateUserArgs;
      const { userId, firstName, lastName, company, role, pin } = input;

      const updates: Partial<Omit<User, 'user_id' | 'short_id'>> = {};
      if (firstName !== undefined) updates.first_name = firstName;
      if (lastName !== undefined) updates.last_name = lastName;
      if (company !== undefined) updates.company = company;
      if (role !== undefined) updates.role = role;
      if (pin !== undefined) updates.pin = pin;

      return handleUpdateUser(userId, updates);
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
