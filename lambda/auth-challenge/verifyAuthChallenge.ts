import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { decrypt } from '../../utils/encryption';

// Initialize Powertools
const logger = new Logger({ serviceName: 'verifyAuthChallenge' });
const tracer = new Tracer({ serviceName: 'verifyAuthChallenge' });
const metrics = new Metrics({ namespace: 'CustomAuth', serviceName: 'verifyAuthChallenge' });

// Define types
interface ChallengePayload {
  email: string;
  expiration: string;
  [key: string]: any; // Allow additional fields
}

interface CognitoVerifyAuthChallengeEvent {
  request: {
    userAttributes: {
      email: string;
      [key: string]: string;
    };
    privateChallengeParameters: {
      challenge: string;
      [key: string]: string;
    };
    challengeAnswer: string;
  };
  response: {
    answerCorrect: boolean;
  };
}

export const handler = async (
  event: CognitoVerifyAuthChallengeEvent,
  context: any
): Promise<CognitoVerifyAuthChallengeEvent> => {
  // Add context to logs
  logger.addContext(context);

  // Start tracing
  const segment = tracer.getSegment();
  const handlerSegment = segment?.addNewSubsegment('verifyAuthChallenge');

  try {
    const email = event.request.userAttributes.email;
    const expected = event.request.privateChallengeParameters.challenge;

    logger.info('Verifying auth challenge', {
      email,
      hasAnswer: !!event.request.challengeAnswer,
      hasExpectedChallenge: !!expected,
    });

    // Check if answer matches the expected challenge
    if (event.request.challengeAnswer !== expected) {
      logger.warn('Challenge answer does not match expected token', {
        email,
      });
      metrics.addMetric('ChallengeMismatch', MetricUnit.Count, 1);
      event.response.answerCorrect = false;
      return event;
    }

    // Decrypt and parse the challenge answer
    let payload: ChallengePayload;
    try {
      const decodedAnswer = Buffer.from(event.request.challengeAnswer, 'base64').toString('utf-8');
      const decryptedJson = await decrypt(decodedAnswer);
      payload = JSON.parse(decryptedJson) as ChallengePayload;

      logger.info('Challenge payload decrypted successfully', {
        email: payload.email,
        expiration: payload.expiration,
      });
    } catch (error) {
      logger.error('Failed to decrypt or parse challenge answer', {
        error: (error as Error).message,
        email,
      });
      metrics.addMetric('DecryptionError', MetricUnit.Count, 1);
      event.response.answerCorrect = false;
      return event;
    }

    // Check expiration
    const currentTime = new Date().toISOString();
    const isExpired = currentTime > payload.expiration;

    logger.info('Checking token expiration', {
      currentTime,
      tokenExpiration: payload.expiration,
      isExpired,
    });

    // Validate email and expiration
    if (payload.email === email && !isExpired) {
      logger.info('Challenge verification successful', {
        email,
      });
      metrics.addMetric('VerificationSuccess', MetricUnit.Count, 1);
      event.response.answerCorrect = true;
    } else {
      logger.warn('Challenge verification failed', {
        email,
        emailMatch: payload.email === email,
        isExpired,
        reason: payload.email !== email ? 'email_mismatch' : 'token_expired',
      });
      metrics.addMetric('VerificationFailed', MetricUnit.Count, 1);
      metrics.addMetric(isExpired ? 'TokenExpired' : 'EmailMismatch', MetricUnit.Count, 1);
      event.response.answerCorrect = false;
    }

    return event;
  } catch (error) {
    logger.error('Unexpected error during challenge verification', error as Error);
    metrics.addMetric('VerificationError', MetricUnit.Count, 1);

    // Fail verification on unexpected errors
    event.response.answerCorrect = false;
    return event;
  } finally {
    handlerSegment?.close();
    metrics.publishStoredMetrics();
  }
};
