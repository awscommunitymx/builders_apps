import { AppSyncIdentityCognito, AppSyncResolverEvent, AppSyncResolverHandler } from 'aws-lambda';
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
  Session,
  AgendaData,
  MutationUpdateAgendaArgs,
  MutationUpdateRoomAgendaArgs,
  SessionInput,
  CategoryItemInput,
  SpeakerInput,
  CategoryInput,
} from '@awscommunity/generated-ts';
import handleViewProfile from './handlers/viewProfile';
import handleUpdateUser from './handlers/updateUser';

const SERVICE_NAME = 'graphql-resolver';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

type HandlerArgs = MutationViewProfileArgs | MutationUpdateUserArgs | MutationUpdateAgendaArgs | MutationUpdateRoomAgendaArgs;

export const handler = middy((async (event: AppSyncResolverEvent<HandlerArgs>) => {
  const correlationId = `${event.info.fieldName}-${Date.now()}`;
  logger.appendKeys({ correlationId });
  logger.info(`event: ${event}`);
  try {

    logger.info(`Processing ${event.info.fieldName}`, { event });
    metrics.addMetric(`${event.info.fieldName}Attempt`, MetricUnit.Count, 1);

    const identity = event.identity as AppSyncIdentityCognito;

    if (event.info.fieldName === 'viewProfile') {
      const { id, pin } = event.arguments as MutationViewProfileArgs;
      return handleViewProfile(id, identity.sub, pin);
    }

    if (event.info.fieldName === 'updateUser') {
      const updates: Partial<Omit<User, 'user_id' | 'short_id'>> = {};
      const { input } = event.arguments as MutationUpdateUserArgs;
      return handleUpdateUser(identity.sub, input);
    }

    // === 1) Mutation: updateAgenda (general feed) ===
    if (event.info.fieldName === 'updateAgenda') {
      const { data } = event.arguments as MutationUpdateAgendaArgs;
      metrics.addMetric('updateAgendaSuccess', MetricUnit.Count, 1);

      // Convert SessionInput[] → Session[]
      const agendaData: AgendaData = {
        sessions: data.sessions.map((sess: SessionInput) => ({
          id: sess.id,
          roomId: sess.room.id,
          title: sess.title,
          description: sess.description,
          startsAt: sess.startsAt,
          endsAt: sess.endsAt,
          isServiceSession: sess.isServiceSession,
          isPlenumSession: sess.isPlenumSession,
          liveUrl: sess.liveUrl,
          recordingUrl: sess.recordingUrl,
          status: sess.status,
          isInformed: sess.isInformed,
          isConfirmed: sess.isConfirmed,
          room: { id: sess.room.id, name: sess.room.name },
          speakers: sess.speakers.map((s: SpeakerInput) => ({ id: s.id, name: s.name })),
          categories: sess.categories.map((cat: CategoryInput) => ({
            id: cat.id,
            name: cat.name,
            categoryItems: cat.categoryItems.map((ci: CategoryItemInput) => ({ id: ci.id, name: ci.name })),
            sort: cat.sort,
          })),
        })),
      };
      // Returning AgendaData will trigger onAgendaUpdate subscription (no filter args)
      return agendaData;
    }

    // === 2) Mutation: updateRoomAgenda (room-specific feed) ===
    if (event.info.fieldName === 'updateRoomAgenda') {
      const { session } = event.arguments as MutationUpdateRoomAgendaArgs;

      // Build Session payload exactly matching the Subscription’s return type
      const resultSession: Session = {
        id: session.id,
        roomId: session.room.id,
        title: session.title,
        description: session.description,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        isServiceSession: session.isServiceSession,
        isPlenumSession: session.isPlenumSession,
        liveUrl: session.liveUrl,
        recordingUrl: session.recordingUrl,
        status: session.status,
        isInformed: session.isInformed,
        isConfirmed: session.isConfirmed,
        room: { id: session.room.id, name: session.room.name },
        speakers: session.speakers.map((s: SpeakerInput) => ({ id: s.id, name: s.name })),
        categories: session.categories.map((cat: CategoryInput) => ({
          id: cat.id,
          name: cat.name,
          categoryItems: cat.categoryItems.map(ci => ({ id: ci.id, name: ci.name })),
          sort: cat.sort,
        })),
      };

      metrics.addMetric('updateRoomAgendaSuccess', MetricUnit.Count, 1);
      // Returning this Session will cause AppSync to invoke onRoomAgendaUpdate with source = this object
      return resultSession;
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
