import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { encrypt } from '../../utils/encryption';
import { TIMEOUT_MINS } from '../../utils/constants';
import Twilio from 'twilio';

const {
  SES_FROM_ADDRESS,
  USER_POOL_ID,
  BASE_URL,
  TABLE_NAME,
  TWILIO_SECRET_NAME,
  TWILIO_MESSAGING_SERVICE_SID,
} = process.env;
const ONE_MIN = 60 * 1000;

// Initialize AWS Powertools
const logger = new Logger({ serviceName: 'short-id-auth' });
const tracer = new Tracer({ serviceName: 'short-id-auth' });
const metrics = new Metrics({ namespace: 'Authentication', serviceName: 'short-id-auth' });

// Initialize AWS clients
const dynamoDBClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);
const sesClient = tracer.captureAWSv3Client(new SESv2Client({}));
const secretsClient = tracer.captureAWSv3Client(new SecretsManagerClient({}));

// Twilio credentials cache
let twilioCredentials: { account_sid: string; auth_token: string } | null = null;

interface AuthRequest {
  short_id: string;
}

interface UserProfile {
  PK: string;
  SK: string;
  email: string;
  short_id: string;
  cognito_sub?: string;
  name?: string;
  cell_phone?: string;
  [key: string]: any;
}

const getTwilioCredentials = async (): Promise<{ account_sid: string; auth_token: string }> => {
  if (twilioCredentials) {
    return twilioCredentials;
  }

  if (!TWILIO_SECRET_NAME) {
    throw new Error('TWILIO_SECRET_NAME environment variable is not set');
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

    // Send the message using Twilio Content API
    const message = await client.messages.create({
      from: TWILIO_MESSAGING_SERVICE_SID!,
      to: formattedPhone,
      contentSid: 'HX8b1f55e6942288e05b18603c923f82c9',
      contentVariables: JSON.stringify({
        '1': name,
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

const sendEmail = async (email: string, name: string, magicLink: string): Promise<void> => {
  const emailParams = {
    FromEmailAddress: SES_FROM_ADDRESS,
    Destination: {
      ToAddresses: [email],
    },
    Content: {
      Simple: {
        Subject: {
          Data: 'Your Magic Link - AWS Community Builders',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: `
              <html>
                <body>
                  <h2>Hello ${name || 'Builder'}!</h2>
                  <p>Click the link below to sign in to your account:</p>
                  <a href="${magicLink}" style="background-color: #4CAF50; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 4px;">
                    Sign In
                  </a>
                  <p>This link will expire in ${TIMEOUT_MINS} minutes.</p>
                  <p>If you didn't request this link, please ignore this email.</p>
                </body>
              </html>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `Hello ${name || 'Builder'}!\n\nClick the link below to sign in: ${magicLink}\n\nThis link will expire in ${TIMEOUT_MINS} minutes.\n\nIf you didn't request this link, please ignore this email.`,
            Charset: 'UTF-8',
          },
        },
      },
    },
  };

  await sesClient.send(new SendEmailCommand(emailParams));
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Parse JSON body
  let requestBody: AuthRequest;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch (error) {
    logger.warn('Invalid JSON in request body');
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'JSON inválido en el cuerpo de la solicitud.',
      }),
    };
  }

  const { short_id } = requestBody;

  if (!short_id) {
    logger.warn('Missing short_id in request body');
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Debes proporcionar un short_id válido.',
      }),
    };
  }

  try {
    // Query DynamoDB using the short_id-index GSI
    logger.info('Querying user by short_id', { short_id });

    const queryParams = {
      TableName: TABLE_NAME,
      IndexName: 'short_id-index',
      KeyConditionExpression: 'short_id = :short_id',
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: {
        ':short_id': short_id,
        ':sk': 'PROFILE',
      },
    };

    const result = await docClient.send(new QueryCommand(queryParams));

    if (!result.Items || result.Items.length === 0) {
      logger.warn('User not found with short_id', { short_id });
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'Usuario no encontrado.',
        }),
      };
    }

    const userProfile = result.Items[0] as UserProfile;

    if (!userProfile.email) {
      logger.error('User profile missing email', { short_id, userProfile });
      return {
        statusCode: 400,
        body: JSON.stringify({
          message:
            'El perfil del usuario está incompleto - falta la dirección de correo electrónico.',
        }),
      };
    }

    // Generate magic link token
    const now = new Date();
    const expiration = new Date(now.getTime() + ONE_MIN * TIMEOUT_MINS);
    const payload = {
      email: userProfile.email,
      short_id: userProfile.short_id,
      expiration: expiration.toJSON(),
    };

    const tokenRaw = await encrypt(JSON.stringify(payload));
    const tokenB64 = Buffer.from(tokenRaw).toString('base64');
    const token = encodeURIComponent(tokenB64);
    const magicLink = `https://${BASE_URL}/magic-link?email=${userProfile.email}&token=${token}`;

    // Store auth challenge token in DynamoDB
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `AUTH#${userProfile.email}`,
            SK: 'AUTH_CHALLENGE',
            token: tokenB64,
            expiration: expiration.toJSON(),
            created_at: now.toJSON(),
            ttl: Math.floor(expiration.getTime() / 1000), // TTL for automatic cleanup
          },
        })
      );

      logger.info('Stored auth challenge token in DynamoDB', { email: userProfile.email });
    } catch (dynamoError) {
      logger.error('Failed to store auth challenge token in DynamoDB', {
        error: dynamoError,
        email: userProfile.email,
      });
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Error al generar el token de autenticación.',
        }),
      };
    }

    // Send magic link email
    await sendEmail(userProfile.email, userProfile.name || 'Builder', magicLink);

    // Track WhatsApp delivery success
    let whatsappSent = false;

    // Send WhatsApp message if user has a cell phone
    if (userProfile.cell_phone) {
      try {
        await sendWhatsAppMessage(userProfile.cell_phone, userProfile.name || 'Builder', magicLink);
        whatsappSent = true;
        logger.info('WhatsApp message sent successfully', {
          email: userProfile.email,
          phone: userProfile.cell_phone,
        });
      } catch (whatsappError) {
        // Log the error but don't fail the entire request since email was sent
        logger.error('Failed to send WhatsApp message, but email was sent successfully', {
          error: whatsappError,
          email: userProfile.email,
          phone: userProfile.cell_phone,
        });
      }
    }

    // Create appropriate message based on delivery methods
    let deliveryMessage: string;
    if (whatsappSent) {
      deliveryMessage = 'Enlace mágico enviado exitosamente a tu WhatsApp y correo electrónico.';
    } else {
      deliveryMessage = 'Enlace mágico enviado exitosamente a tu correo electrónico.';
    }

    logger.info('Magic link sent successfully', {
      email: userProfile.email,
      short_id: userProfile.short_id,
      whatsapp_sent: whatsappSent,
    });

    metrics.addMetadata('short_id', short_id);
    metrics.addMetric('auth_requests', 'Count', 1);

    return {
      statusCode: 202,
      body: JSON.stringify({
        message: deliveryMessage,
      }),
    };
  } catch (error) {
    logger.error('Error processing short_id authentication', { error, short_id });

    metrics.addMetric('auth_errors', 'Count', 1);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error interno del servidor al procesar tu solicitud.',
      }),
    };
  }
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json',
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Parse JSON body
  let requestBody: AuthRequest;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch (error) {
    logger.warn('Invalid JSON in request body');
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'JSON inválido en el cuerpo de la solicitud.',
      }),
    };
  }

  const result = await lambdaHandler(event);
  return {
    ...result,
    headers: {
      ...result.headers,
      ...corsHeaders,
    },
  };
};
