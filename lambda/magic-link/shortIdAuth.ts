import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { encrypt } from '../../utils/encryption';
import { TIMEOUT_MINS } from '../../utils/constants';

const { SES_FROM_ADDRESS, USER_POOL_ID, BASE_URL, TABLE_NAME } = process.env;
const ONE_MIN = 60 * 1000;

// Initialize AWS Powertools
const logger = new Logger({ serviceName: 'short-id-auth' });
const tracer = new Tracer({ serviceName: 'short-id-auth' });
const metrics = new Metrics({ namespace: 'Authentication', serviceName: 'short-id-auth' });

// Initialize AWS clients
const dynamoDBClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);
const cognitoClient = tracer.captureAWSv3Client(new CognitoIdentityProviderClient({}));
const sesClient = tracer.captureAWSv3Client(new SESv2Client({}));

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
        message: 'Invalid JSON in request body.',
      }),
    };
  }

  const { short_id } = requestBody;

  if (!short_id) {
    logger.warn('Missing short_id in request body');
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'You must provide a valid short_id.',
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
          message: 'User not found with the provided short_id.',
        }),
      };
    }

    const userProfile = result.Items[0] as UserProfile;

    if (!userProfile.email) {
      logger.error('User profile missing email', { short_id, userProfile });
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'User profile is incomplete - missing email address.',
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

    // Update Cognito user with auth challenge token
    try {
      await cognitoClient.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: USER_POOL_ID,
          Username: userProfile.email,
          UserAttributes: [
            {
              Name: 'custom:authChallenge',
              Value: tokenB64,
            },
          ],
        })
      );

      logger.info('Updated Cognito user attributes', { email: userProfile.email });
    } catch (cognitoError) {
      logger.error('Failed to update Cognito user attributes', {
        error: cognitoError,
        email: userProfile.email,
      });
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'User not found in authentication system.',
        }),
      };
    }

    // Send magic link email
    await sendEmail(userProfile.email, userProfile.name || 'Builder', magicLink);

    logger.info('Magic link sent successfully', {
      email: userProfile.email,
      short_id: userProfile.short_id,
    });

    metrics.addMetadata('short_id', short_id);
    metrics.addMetric('auth_requests', 'Count', 1);

    return {
      statusCode: 202,
      body: JSON.stringify({
        message: 'Magic link sent successfully to your registered email address.',
      }),
    };
  } catch (error) {
    logger.error('Error processing short_id authentication', { error, short_id });

    metrics.addMetric('auth_errors', 'Count', 1);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error occurred while processing your request.',
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
        message: 'Invalid JSON in request body.',
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
