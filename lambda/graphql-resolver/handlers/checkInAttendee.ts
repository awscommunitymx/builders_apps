import { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { CheckInResponse, CheckInStatus } from '@awscommunity/generated-ts';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

const SERVICE_NAME = 'check-in-attendee';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME!;

type CheckInEvent = {
  arguments: {
    barcode_id: string | null | undefined;
    user_id: string | null | undefined;
    bypass_email: boolean | null | undefined;
    bypass_phone: boolean | null | undefined;
    email: string | null | undefined;
    phone: string | null | undefined;
  };
};

export const handler = async (event: CheckInEvent): Promise<CheckInResponse> => {
  const correlationId = `check-in-${Date.now()}`;
  logger.appendKeys({ correlationId });

  try {
    const { barcode_id, user_id, bypass_email, bypass_phone, email, phone } = event.arguments;
    logger.info('Processing check-in request', {
      barcode_id,
      user_id,
      bypass_email,
      bypass_phone,
      email,
      phone,
    });
    metrics.addMetric('CheckInAttempt', MetricUnit.Count, 1);

    if (!barcode_id && !user_id) {
      logger.warn('Missing identifier', { barcode_id, user_id });
      return {
        status: CheckInStatus.IncompleteProfile,
        message: 'Either barcode_id or user_id must be provided',
        missingFields: ['identifier'],
      };
    }

    const result = await dynamoDB.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        ...(barcode_id
          ? {
              IndexName: 'barcode-index',
              KeyConditionExpression: 'barcode = :barcode',
              ExpressionAttributeValues: { ':barcode': barcode_id },
            }
          : {
              KeyConditionExpression: 'PK = :pk',
              ExpressionAttributeValues: { ':pk': `USER#${user_id}` },
            }),
      })
    );

    if (!result.Items || result.Items.length === 0) {
      logger.warn('User not found', { barcode_id, user_id });
      return {
        status: CheckInStatus.IncompleteProfile,
        message: 'User not found',
        missingFields: ['profile'],
      };
    }

    const user = result.Items[0];
    const missingFields: string[] = [];

    // Check for required fields with bypass options
    if (!bypass_email && (!user.email || user.email.startsWith('tmp_order'))) {
      missingFields.push('email');
    }
    if (!bypass_phone && !user.cell_phone) {
      missingFields.push('phone');
    }
    if (!user.company) {
      missingFields.push('company');
    }
    if (!user.job_title) {
      missingFields.push('job_title');
    }

    // If we have updates and no missing fields (or bypasses), update the user
    if ((email || phone) && (missingFields.length === 0 || (bypass_email && bypass_phone))) {
      const updateExpressions: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};

      if (email) {
        updateExpressions.push('email = :email');
        expressionAttributeValues[':email'] = email;
      }
      if (phone) {
        updateExpressions.push('cell_phone = :phone');
        expressionAttributeValues[':phone'] = phone;
      }

      if (updateExpressions.length > 0) {
        await dynamoDB.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `USER#${user.user_id}`, SK: 'PROFILE' },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
          })
        );
        logger.info('Updated user profile', { user_id: user.user_id, updates: { email, phone } });
      }
    }

    if (missingFields.length > 0) {
      logger.info('Profile incomplete', { missingFields, bypass_email, bypass_phone });
      return {
        status: CheckInStatus.IncompleteProfile,
        message: 'Profile is missing required information',
        missingFields,
      };
    }

    logger.info('Check-in successful', { user_id: user.user_id });
    metrics.addMetric('CheckInSuccess', MetricUnit.Count, 1);

    return {
      status: CheckInStatus.Success,
      message: 'Check-in successful',
      missingFields: null,
    };
  } catch (error) {
    logger.error('Error in checkInAttendee', { error });
    metrics.addMetric('CheckInError', MetricUnit.Count, 1);
    throw new Error('Failed to process check-in');
  } finally {
    metrics.publishStoredMetrics();
  }
};
