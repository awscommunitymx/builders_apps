import { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { CheckInResponse, CheckInStatus } from '@awscommunity/generated-ts';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { encrypt } from '../../../utils/encryption';
import { TIMEOUT_MINS } from '../../../utils/constants';
import Twilio from 'twilio';
import { AppSyncIdentityCognito } from 'aws-lambda';

const SERVICE_NAME = 'check-in-attendee';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const secretsClient = new SecretsManagerClient({});
const sqsClient = new SQSClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const TWILIO_SECRET_NAME = 'twilio-credentials';
const TWILIO_MESSAGING_SERVICE_SID = 'MGdfbfa02e47fe0e9a0eb32e5a59b48c90';
const TWILIO_CONTENT_SID = 'HXe650886b56ae897af0d34b0b3c267389';
const BASE_URL = process.env.BASE_URL!;
const LABEL_PRINTER_QUEUE_URL = process.env.LABEL_PRINTER_QUEUE_URL!;
const SECONDARY_QUEUE_URL = process.env.SECONDARY_QUEUE_URL!;
const ONE_MIN = 60 * 1000;
const MAGIC_LINK_TIMEOUT_MINS = 30; // 30 minutes timeout for magic links

// Twilio credentials cache
let twilioCredentials: { account_sid: string; auth_token: string } | null = null;

const getTwilioCredentials = async (): Promise<{ account_sid: string; auth_token: string }> => {
  if (twilioCredentials) {
    return twilioCredentials;
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: TWILIO_SECRET_NAME });
    const response = await secretsClient.send(command);

    if (!response.SecretString) {
      throw new Error('No secret string found in Twilio credentials');
    }

    twilioCredentials = JSON.parse(response.SecretString);

    if (!twilioCredentials?.account_sid || !twilioCredentials?.auth_token) {
      throw new Error('Invalid Twilio credentials structure');
    }

    return twilioCredentials;
  } catch (error) {
    logger.error('Failed to retrieve Twilio credentials', { error });
    throw error;
  }
};

const sendWhatsAppMessage = async (
  phoneNumber: string,
  name: string,
  magicLink: string
): Promise<void> => {
  try {
    const credentials = await getTwilioCredentials();

    // Initialize Twilio client
    const client = Twilio(credentials.account_sid, credentials.auth_token);

    // Format phone number for WhatsApp
    const formattedPhone = phoneNumber.startsWith('whatsapp:')
      ? phoneNumber
      : `whatsapp:${phoneNumber.replace(/^\+/, '')}`;

    // Extract first name
    const firstName = name.split(' ')[0];

    // Send the message using Twilio Content API
    const message = await client.messages.create({
      from: TWILIO_MESSAGING_SERVICE_SID,
      to: formattedPhone,
      contentSid: TWILIO_CONTENT_SID,
      contentVariables: JSON.stringify({
        '1': firstName,
        '2': magicLink,
      }),
      shortenUrls: true,
    });

    logger.info('WhatsApp message sent successfully', {
      messageSid: message.sid,
      phone: formattedPhone,
      status: message.status,
    });
  } catch (error) {
    logger.error('Failed to send WhatsApp message', { error, phoneNumber });
    throw error;
  }
};

type CheckInEvent = {
  arguments: {
    barcode_id: string | null | undefined;
    user_id: string | null | undefined;
    bypass_email: boolean | null | undefined;
    bypass_phone: boolean | null | undefined;
    email: string | null | undefined;
    phone: string | null | undefined;
  };
  identity: AppSyncIdentityCognito;
};

export const handler = async (event: CheckInEvent): Promise<CheckInResponse> => {
  const correlationId = `${Date.now()}`;
  logger.appendKeys({ correlationId });

  try {
    const { barcode_id, user_id, bypass_email, bypass_phone, email, phone } = event.arguments;
    const { groups } = event.identity;
    logger.info('Processing check-in request', {
      barcode_id,
      user_id,
      bypass_email,
      bypass_phone,
      email,
      phone,
      groups,
    });
    metrics.addMetric('CheckInAttempt', MetricUnit.Count, 1);

    if (!barcode_id && !user_id) {
      logger.warn('Missing identifier', { barcode_id, user_id });
      metrics.addMetric('CheckInFailed', MetricUnit.Count, 1, {
        reason: 'missing_identifier',
      } as any);
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
      metrics.addMetric('CheckInFailed', MetricUnit.Count, 1, { reason: 'user_not_found' } as any);
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

    const phoneUpdate = phone || (missingFields.includes('phone') && bypass_phone);
    const emailUpdate = email || (missingFields.includes('email') && bypass_email);

    // If we have updates and no missing fields (or bypasses), update the user
    if (phoneUpdate || emailUpdate) {
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
      metrics.addMetric('CheckInFailed', MetricUnit.Count, 1, {
        reason: 'incomplete_profile',
      } as any);
      return {
        status: CheckInStatus.IncompleteProfile,
        message: 'Profile is missing required information',
        missingFields,
      };
    }

    // Generate magic link token
    const now = new Date();
    const expiration = new Date(now.getTime() + ONE_MIN * MAGIC_LINK_TIMEOUT_MINS);
    const payload = {
      email: user.email,
      short_id: user.short_id,
      expiration: expiration.toJSON(),
    };

    const tokenRaw = await encrypt(JSON.stringify(payload));
    const tokenB64 = Buffer.from(tokenRaw).toString('base64');
    const token = encodeURIComponent(tokenB64);
    const magicLink = `https://${BASE_URL}/magic-link?email=${user.email}&token=${token}`;

    // Store auth challenge token in DynamoDB
    try {
      await dynamoDB.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `AUTH#${user.email}`,
            SK: 'AUTH_CHALLENGE',
            token: tokenB64,
            expiration: expiration.toJSON(),
            created_at: now.toJSON(),
            ttl: Math.floor(expiration.getTime() / 1000), // TTL for automatic cleanup
          },
        })
      );

      logger.info('Stored auth challenge token in DynamoDB', { email: user.email });
    } catch (dynamoError) {
      logger.error('Failed to store auth challenge token in DynamoDB', {
        error: dynamoError,
        email: user.email,
      });
      return {
        status: CheckInStatus.IncompleteProfile,
        message: 'Error generating authentication token',
        missingFields: ['token'],
      };
    }

    // Send WhatsApp message if user has a cell phone
    if (user.cell_phone) {
      try {
        await sendWhatsAppMessage(user.cell_phone, user.name, magicLink);
        logger.info('WhatsApp message sent successfully', {
          email: user.email,
          phone: user.cell_phone,
        });
      } catch (whatsappError) {
        // Log the error but don't fail the check-in since it was successful
        logger.error('Failed to send WhatsApp message, but check-in was successful', {
          error: whatsappError,
          email: user.email,
          phone: user.cell_phone,
        });
      }
    }

    // Send message to label printer queue
    if (LABEL_PRINTER_QUEUE_URL) {
      try {
        // Determine printer ID based on the user's groups
        let printerId = 'printer1'; // Default printer ID
        if (groups?.includes('CheckInVolunteerMain1')) {
          printerId = 'MainPrinter1';
        } else if (groups?.includes('CheckInVolunteerMain2')) {
          printerId = 'MainPrinter2';
        } else if (groups?.includes('CheckInVolunteerMain3')) {
          printerId = 'MainPrinter3';
        } else if (groups?.includes('CheckInVolunteerMain4')) {
          printerId = 'MainPrinter4';
        } else if (groups?.includes('CheckInVolunteerSecondary')) {
          printerId = 'SecondaryPrinter';
        }

        const labelMessage = {
          name: user.name,
          company: user.company || '',
          role: user.job_title || '',
          employee_id: user.short_id,
          printer_id: printerId,
        };

        // Determine which queue to use based on the user's groups
        const queueUrl = groups?.includes('CheckInVolunteerSecondary')
          ? SECONDARY_QUEUE_URL
          : LABEL_PRINTER_QUEUE_URL;

        await sqsClient.send(
          new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(labelMessage),
          })
        );

        logger.info('Label printer message sent successfully', {
          user_id: user.user_id,
          queue_url: queueUrl,
          printer_id: printerId,
        });
        metrics.addMetric('LabelPrinterMessageSent', MetricUnit.Count, 1);
      } catch (sqsError) {
        // Log the error but don't fail the check-in since it was successful
        logger.error('Failed to send label printer message, but check-in was successful', {
          error: sqsError,
          user_id: user.user_id,
        });
        metrics.addMetric('LabelPrinterMessageError', MetricUnit.Count, 1);
      }
    }

    logger.info('Check-in successful', { user_id: user.user_id });
    metrics.addMetric('CheckInSuccess', MetricUnit.Count, 1);
    metrics.addMetric('CheckInTotal', MetricUnit.Count, 1);

    return {
      status: CheckInStatus.Success,
      message: 'Check-in successful',
      missingFields: null,
    };
  } catch (error) {
    logger.error('Error in checkInAttendee', { error });
    metrics.addMetric('CheckInError', MetricUnit.Count, 1);
    metrics.addMetric('CheckInFailed', MetricUnit.Count, 1, { reason: 'internal_error' } as any);
    throw new Error('Failed to process check-in');
  } finally {
    metrics.publishStoredMetrics();
  }
};
