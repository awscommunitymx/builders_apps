import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import _ from 'lodash';

// Initialize Powertools
const logger = new Logger({ serviceName: 'customAuthHandler' });
const tracer = new Tracer({ serviceName: 'customAuthHandler' });
const metrics = new Metrics({ namespace: 'CustomAuth', serviceName: 'customAuthHandler' });

// Define types for the Cognito Custom Authentication event
interface CognitoCustomAuthEvent {
  request: {
    userAttributes?: Record<string, string>;
    userNotFound?: boolean;
    session: Array<{
      challengeName?: string;
      challengeResult: boolean;
      challengeMetadata?: string;
    }>;
  };
  response: {
    issueTokens: boolean;
    failAuthentication: boolean;
    challengeName?: string;
  };
}

export const handler = async (event: CognitoCustomAuthEvent): Promise<CognitoCustomAuthEvent> => {
  // Start tracing
  const segment = tracer.getSegment();
  const handlerSegment = segment?.addNewSubsegment('customAuthHandler');

  try {
    logger.info('Processing custom auth challenge', {
      userNotFound: event.request.userNotFound,
      sessionLength: event.request.session.length,
    });

    if (event.request.userNotFound) {
      logger.warn('User not found, failing authentication');
      metrics.addMetric('UserNotFound', MetricUnit.Count, 1);

      event.response.issueTokens = false;
      event.response.failAuthentication = true;
      return event;
    }

    if (_.isEmpty(event.request.session)) {
      // Issue new challenge
      logger.info('No session found, issuing new challenge');
      metrics.addMetric('NewChallenge', MetricUnit.Count, 1);

      event.response.issueTokens = false;
      event.response.failAuthentication = false;
      event.response.challengeName = 'CUSTOM_CHALLENGE';
    } else {
      const lastAttempt = _.last(event.request.session);

      if (lastAttempt?.challengeResult === true) {
        // User gave right answer
        logger.info('Challenge passed, issuing tokens');
        metrics.addMetric('ChallengeSuccess', MetricUnit.Count, 1);

        event.response.issueTokens = true;
        event.response.failAuthentication = false;
      } else {
        // User gave wrong answer
        logger.warn('Challenge failed, denying authentication');
        metrics.addMetric('ChallengeFailed', MetricUnit.Count, 1);

        event.response.issueTokens = false;
        event.response.failAuthentication = true;
      }
    }

    return event;
  } catch (error) {
    logger.error('Error processing custom auth challenge', error as Error);
    metrics.addMetric('AuthError', MetricUnit.Count, 1);

    // Fail authentication on error
    event.response.issueTokens = false;
    event.response.failAuthentication = true;

    throw error;
  } finally {
    handlerSegment?.close();
    metrics.publishStoredMetrics();
  }
};
