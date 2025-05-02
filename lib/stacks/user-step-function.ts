import { Construct } from 'constructs';
import { JsonPath } from 'aws-cdk-lib/aws-stepfunctions';
import {
  StateMachine,
  Choice,
  Chain,
  Succeed,
  Condition,
  Fail,
  TaskInput,
  Pass,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { SecretValue, Duration } from 'aws-cdk-lib';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

interface UserStepFunctionStackProps {
  environmentName: string;
}

export class UserStepFunctionStack extends Construct {
  constructor(scope: Construct, id: string, props: UserStepFunctionStackProps) {
    super(scope, id);

    // Create Eventbrite API Key secret in Secrets Manager
    const eventbriteApiKey = new Secret(this, `EventbriteApiKey-${props.environmentName}`, {
      secretName: `EventbriteApiKeySecret-${props.environmentName}`,
      description: 'Eventbrite API Key for authentication',
      secretStringValue: SecretValue.unsafePlainText('3R3JB2BGHUFVEK5IYYX3'), // TODO: DO NOT COMMIT
    });

    // Create the Lambda function for making API calls to Eventbrite
    const eventbriteApiCallLambda = new NodejsFunction(this, 'EventbriteApiCallFunction', {
      functionName: `eventbrite-api-call-${props.environmentName}`,
      runtime: Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/eventbrite-api-call/index.ts'),
      description: 'Makes API calls to Eventbrite with proper authentication',
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        SECRET_NAME: eventbriteApiKey.secretName,
      },
    });

    // Grant the Lambda function permission to read the secret
    eventbriteApiKey.grantRead(eventbriteApiCallLambda);

    // Create separate Lambda task instances for each flow
    // One for order.placed
    const callEventbriteApi = new LambdaInvoke(this, 'CallEventbriteApi', {
      lambdaFunction: eventbriteApiCallLambda,
      outputPath: '$.Payload',
    });

    const unknownWebhookTypeFail = new Fail(this, 'UnknownWebhookTypeFail');
    const apiFailure = new Fail(this, 'ApiFailure');
    const orderPlacedSuccess = new Succeed(this, 'OrderPlacedSuccess');
    const attendeeUpdatedSuccess = new Succeed(this, 'AttendeeUpdatedSuccess');

    const handlerChoice = new Choice(this, 'HandlerChoice')
      .when(Condition.stringEquals('$.config.action', 'order.placed'), orderPlacedSuccess)
      .when(Condition.stringEquals('$.config.action', 'attendee.updated'), attendeeUpdatedSuccess);

    const apiChoice = new Choice(this, 'ApiResponseChoice')
      .when(Condition.stringEquals('$.statusCode', '200'), handlerChoice)
      .otherwise(apiFailure);

    const apiChain = Chain.start(callEventbriteApi).next(apiChoice);

    // Create a Pass state to append "/attendee" to the API URL for order.placed events
    const appendAttendeeToUrl = new Pass(this, 'AppendAttendeeToUrl', {
      parameters: {
        'api_url.$': "States.Format('{}{}', $.api_url, 'attendees')",
        'config.$': '$.config',
      },
    });

    // Flow for order.placed: Append "/attendee" to URL before calling API
    const orderPlacedChain = Chain.start(appendAttendeeToUrl).next(apiChain);

    // Flow for attendee.updated: Call API directly
    const attendeeUpdatedChain = Chain.start(apiChain);

    // Define the choice state for different webhook types
    const webhook_type = new Choice(this, 'WebhookTypeChoice')
      .when(Condition.stringEquals('$.config.action', 'order.placed'), orderPlacedChain)
      .when(Condition.stringEquals('$.config.action', 'attendee.updated'), attendeeUpdatedChain)
      .otherwise(unknownWebhookTypeFail);

    // Define the state machine for user step functions
    const userStepFunction = new StateMachine(this, 'UserStepFunction', {
      stateMachineName: 'UserStepFunction',
      definition: webhook_type,
      tracingEnabled: true,
    });
  }
}
