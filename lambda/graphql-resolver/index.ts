import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  UpdateCommandInput
} from '@aws-sdk/lib-dynamodb';
import { AppSyncResolverHandler } from 'aws-lambda';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import {
  MutationViewProfileArgs,
  MutationUpdateUserArgs,
  ProfileAccess,
  User
} from '@awscommunity/generated-ts';

const tracer = new Tracer({ serviceName: 'view-profile-service' });
const logger = new Logger({ serviceName: 'view-profile-service' });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: 'view-profile-service' });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

type HandlerArgs = MutationViewProfileArgs | MutationUpdateUserArgs;

export const handler = middy(
  (async (event) => {
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
        if (lastName  !== undefined) updates.last_name  = lastName;
        if (company   !== undefined) updates.company    = company;
        if (role      !== undefined) updates.role       = role;
        if (pin       !== undefined) updates.pin        = pin;

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
  }) as AppSyncResolverHandler<HandlerArgs, any>
).use(captureLambdaHandler(tracer));

async function handleViewProfile(
  shortId: string,
  pin: number,
  viewerId: string
): Promise<User | null> {
  // We no longer reference `event` here. Use passed-in params.
  logger.info('Handling viewProfile', { shortId, viewerId });
  metrics.addMetric('ViewProfileAttempt', MetricUnit.Count, 1);

  // Query user by shortId
  const queryParams = {
    TableName: tableName,
    IndexName: 'ShortIdIndex',
    KeyConditionExpression: 'short_id = :shortId',
    ExpressionAttributeValues: { ':shortId': shortId },
    Limit: 1
  };

  const segment = tracer.getSegment();
  const subSegment = segment?.addNewSubsegment('QueryUserByShortId');
  try {
    const queryResult = await docClient.send(new QueryCommand(queryParams));
    if (!queryResult.Items || queryResult.Items.length === 0) {
      logger.info('User not found', { shortId });
      metrics.addMetric('UserNotFound', MetricUnit.Count, 1);
      return null;
    }
    const user = queryResult.Items[0] as User;
    if (user.pin !== pin) {
      logger.warn('Incorrect PIN', { shortId, userId: user.user_id });
      metrics.addMetric('IncorrectPin', MetricUnit.Count, 1);
      throw new Error('Incorrect PIN');
    }

    // record view
    const viewItem: ProfileAccess = {
      PK: `VIEW#${viewerId}`,
      SK: `PROFILE#${user.user_id}`,
      timestamp: new Date().toISOString(),
      viewer_id: viewerId,
      viewed_id: user.user_id
    };
    await docClient.send(new PutCommand({ TableName: tableName, Item: viewItem }));
    metrics.addMetric('ProfileViewRecorded', MetricUnit.Count, 1);
    return user;
  } finally {
    subSegment?.close();
  }
}

async function handleUpdateUser(
  userId: string,
  updates: Partial<Omit<User, 'user_id' | 'short_id'>>
): Promise<User> {
  logger.debug('Updating user', { userId, updates });

  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, any> = {};
  const setClauses: string[] = [];

  Object.entries(updates).forEach(([attr, val], i) => {
    const nameKey = `#n${i}`, valKey = `:v${i}`;
    exprAttrNames[nameKey] = attr;
    exprAttrValues[valKey] = val;
    setClauses.push(`${nameKey} = ${valKey}`);
  });
  if (setClauses.length === 0) throw new Error('No fields to update');

  const updateParams: UpdateCommandInput = {
    TableName: tableName,
    Key: { PK: `USER#${userId}`, SK: `META#${userId}` },
    UpdateExpression: 'SET ' + setClauses.join(', '),
    ExpressionAttributeNames: exprAttrNames,
    ExpressionAttributeValues: exprAttrValues,
    ReturnValues: 'ALL_NEW' as const
  };

  const result = await docClient.send(new UpdateCommand(updateParams));
  const updated = result.Attributes as User;
  metrics.addMetric('UpdateUserSuccess', MetricUnit.Count, 1);
  return updated;
}

export { handleViewProfile, handleUpdateUser };
