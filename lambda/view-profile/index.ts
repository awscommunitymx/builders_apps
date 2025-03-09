import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    QueryCommand,
    PutCommand
} from '@aws-sdk/lib-dynamodb';
import { AppSyncResolverHandler } from 'aws-lambda';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import { MutationViewProfileArgs, ProfileAccess, User } from '@awscommunity/generated-ts'

// Initialize Powertools
const tracer = new Tracer({ serviceName: 'view-profile-service' });
const logger = new Logger({ serviceName: 'view-profile-service' });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: 'view-profile-service' });

// Initialize DynamoDB client with X-Ray tracing
const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

// Original handler function
const handlerFunction: AppSyncResolverHandler<MutationViewProfileArgs, User | null> = async (event) => {
    // Add correlation ID for request tracing
    const correlationId = event.info?.fieldName + '-' + Date.now();
    logger.appendKeys({ correlationId });

    try {
        logger.info('Processing view profile request', { event });
        metrics.addMetric('ViewProfileAttempt', MetricUnit.Count, 1);

        // Extract arguments from the event
        const { shortId, pin, viewerId } = event.arguments;

        // Get user by shortId
        const queryParams = {
            TableName: tableName,
            IndexName: 'ShortIdIndex',
            KeyConditionExpression: 'short_id = :shortId',
            ExpressionAttributeValues: {
                ':shortId': shortId
            },
            Limit: 1
        };

        logger.debug('Querying user by shortId', { shortId });

        const segment = tracer.getSegment();
        const subSegment = segment?.addNewSubsegment('QueryUserByShortId');

        try {
            const queryResult = await docClient.send(new QueryCommand(queryParams));

            if (!queryResult.Items || queryResult.Items.length === 0) {
                logger.info('User not found with provided shortId', { shortId });
                metrics.addMetric('UserNotFound', MetricUnit.Count, 1);
                return null;
            }

            const user = queryResult.Items[0] as User;
            logger.debug('User found', { userId: user.user_id });

            // Verify PIN
            if (user.pin !== pin) {
                logger.warn('Incorrect PIN provided', { shortId, userId: user.user_id });
                metrics.addMetric('IncorrectPin', MetricUnit.Count, 1);
                throw new Error('Incorrect PIN');
            }

            // Log the profile view
            logger.info('Recording profile view', { viewerId, viewedId: user.user_id });

            const timestamp = new Date().toISOString();
            const viewItem: ProfileAccess = {
                PK: `VIEW#${viewerId}`,
                SK: `PROFILE#${user.user_id}`,
                timestamp: timestamp,
                viewer_id: viewerId,
                viewed_id: user.user_id
            };

            const putParams = {
                TableName: tableName,
                Item: viewItem
            };

            const putSubSegment = segment?.addNewSubsegment('RecordProfileView');

            try {
                await docClient.send(new PutCommand(putParams));
                logger.info('Profile view recorded successfully');
                metrics.addMetric('ProfileViewRecorded', MetricUnit.Count, 1);
            } finally {
                putSubSegment?.close();
            }

            // Return the user data
            return user;
        } finally {
            subSegment?.close();
        }
    } catch (error) {
        logger.error('Error processing view profile request', { error });
        metrics.addMetric('ViewProfileError', MetricUnit.Count, 1);
        throw error;
    } finally {
        metrics.publishStoredMetrics();
    }
};

// Export the handler wrapped with Powertools
// export const handler = captureLambdaHandler(handlerFunction);
export const handler = middy(handlerFunction).use(captureLambdaHandler(
    tracer
));