import { Construct } from 'constructs';
import { JsonPath } from 'aws-cdk-lib/aws-stepfunctions';
import {
  StateMachine,
  Choice,
  Chain,
  Succeed,
  Condition,
  Fail,
} from 'aws-cdk-lib/aws-stepfunctions';
import {
  LambdaInvoke,
  DynamoPutItem,
  DynamoAttributeValue,
  DynamoUpdateItem,
  CallAwsService,
} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { SecretValue, Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';

interface UserStepFunctionStackProps {
  environmentName: string;
  userPool: UserPool;
  dynamoTable: ITable;
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

    // // If a userPoolId was provided, grant the Lambda function permission to create Cognito users
    // if (props.userPoolId) {
    //   // Grant permissions to manage Cognito users
    //   const userPool = UserPool.fromUserPoolId(this, 'ExistingUserPool', props.userPoolId);
    //   userPool.grant(
    //     createCognitoUsersLambda,
    //     'cognito-idp:AdminCreateUser',
    //     'cognito-idp:AdminAddUserToGroup'
    //   );
    // }

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

    // Add the createCognitoUserTask to the Map state
    const processAttendees = Chain.start(
      new DynamoPutItem(this, 'CreateUser', {
        table: props.dynamoTable,
        item: {
          PK: DynamoAttributeValue.fromString(
            JsonPath.format('USER#{}', JsonPath.stringAt('$.body.id'))
          ),
          SK: DynamoAttributeValue.fromString('PROFILE'),
          email: DynamoAttributeValue.fromString(JsonPath.stringAt('$.body.email')),
          name: DynamoAttributeValue.fromString(JsonPath.stringAt('$.body.name')),
        },
        conditionExpression: 'attribute_not_exists(PK)',
        resultPath: JsonPath.DISCARD,
      })
    )
      .next(
        new CallAwsService(this, 'CreateCognitoUser', {
          action: 'adminCreateUser',
          iamAction: 'cognito-idp:AdminCreateUser',
          iamResources: [
            `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:userpool/${props.userPool.userPoolId}`,
          ],
          service: 'cognitoidentityprovider',
          parameters: {
            Username: JsonPath.stringAt('$.body.email'),
            UserPoolId: props.userPool.userPoolId,
            MessageAction: 'SUPPRESS',
          },
          outputPath: '$',
          resultPath: '$.cognito',
          resultSelector: {
            'sub.$': '$.User.Username',
          },
        })
      )
      .next(
        // Add user to group
        new CallAwsService(this, 'AddUserToGroup', {
          action: 'adminAddUserToGroup',
          iamAction: 'cognito-idp:AdminAddUserToGroup',
          iamResources: [
            `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:userpool/${props.userPool.userPoolId}`,
          ],
          service: 'cognitoidentityprovider',
          parameters: {
            UserPoolId: props.userPool.userPoolId,
            Username: JsonPath.stringAt('$.body.email'),
            GroupName: 'Attendees',
          },
          resultPath: JsonPath.DISCARD,
        })
      );

    const processAttendeesUpdateChoice = new Choice(this, 'ProcessAttendeesUpdate')
      .when(
        Condition.stringEquals(
          JsonPath.stringAt('$.body.profile.first_name'),
          'Information Requested'
        ),
        new Fail(this, 'AttendeeUpdateFail')
      )
      .otherwise(
        new DynamoUpdateItem(this, 'FillProfile', {
          table: props.dynamoTable,
          key: {
            PK: DynamoAttributeValue.fromString(
              JsonPath.format('USER#{}', JsonPath.stringAt('$.body.order_id'))
            ),
            SK: DynamoAttributeValue.fromString('PROFILE'),
          },
          expressionAttributeValues: {
            ':gender': DynamoAttributeValue.fromString(JsonPath.stringAt('$.body.profile.gender')),
            ':company': DynamoAttributeValue.fromString(
              JsonPath.stringAt('$.body.profile.company')
            ),
            ':job_title': DynamoAttributeValue.fromString(
              JsonPath.stringAt('$.body.profile.job_title')
            ),
            ':cell_phone': DynamoAttributeValue.fromString(
              JsonPath.stringAt('$.body.profile.cell_phone')
            ),
          },
          updateExpression:
            'SET gender = :gender, company = :company, job_title = :job_title, cell_phone = :cell_phone',
        })
      );

    const processAttendeesUpdate = Chain.start(
      new DynamoUpdateItem(this, 'SetTicketClassID', {
        table: props.dynamoTable,
        key: {
          PK: DynamoAttributeValue.fromString(
            JsonPath.format('USER#{}', JsonPath.stringAt('$.body.order_id'))
          ),
          SK: DynamoAttributeValue.fromString('PROFILE'),
        },
        expressionAttributeValues: {
          ':ticket_class_id': DynamoAttributeValue.fromString(
            JsonPath.stringAt('$.body.ticket_class_id')
          ),
        },
        updateExpression: 'SET ticket_class_id = :ticket_class_id',
        conditionExpression: 'attribute_exists(PK)',
        resultPath: JsonPath.DISCARD,
      })
    ).next(processAttendeesUpdateChoice);

    const handlerChoice = new Choice(this, 'HandlerChoice')
      .when(Condition.stringEquals('$.config.action', 'order.placed'), processAttendees)
      .when(Condition.stringEquals('$.config.action', 'attendee.updated'), processAttendeesUpdate);

    const apiChoice = new Choice(this, 'ApiResponseChoice')
      .when(Condition.numberEquals('$.statusCode', 200), handlerChoice)
      .otherwise(apiFailure);

    const apiChain = Chain.start(callEventbriteApi).next(apiChoice);

    // Define the state machine for user step functions
    const userStepFunction = new StateMachine(this, 'UserStepFunction', {
      stateMachineName: 'UserStepFunction',
      definition: apiChain,
      tracingEnabled: true,
    });
  }
}
