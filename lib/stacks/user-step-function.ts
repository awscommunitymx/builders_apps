import { Construct } from 'constructs';
import { JsonPath, Parallel } from 'aws-cdk-lib/aws-stepfunctions';
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
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets';

interface UserStepFunctionStackProps {
  environmentName: string;
  userPool: UserPool;
  dynamoTable: ITable;
  webhookDomain: string;
  hostedZone: IHostedZone;
  certificate: ICertificate;
  eventbriteApiKeySecretArn: string;
}

export class UserStepFunctionStack extends Construct {
  public readonly stepFunction: StateMachine;
  public readonly apiGateway: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: UserStepFunctionStackProps) {
    super(scope, id);

    // Create Eventbrite API Key secret in Secrets Manager
    const eventbriteApiKey = Secret.fromSecretAttributes(this, 'EventbriteApiKey', {
      secretCompleteArn: props.eventbriteApiKeySecretArn,
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
          user_id: DynamoAttributeValue.fromString(JsonPath.stringAt('$.body.id')),
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
      )
      .next(
        // Add sub to DynamoDB
        new DynamoUpdateItem(this, 'AddSubToDynamoDB', {
          table: props.dynamoTable,
          key: {
            PK: DynamoAttributeValue.fromString(
              JsonPath.format('USER#{}', JsonPath.stringAt('$.body.id'))
            ),
            SK: DynamoAttributeValue.fromString('PROFILE'),
          },
          expressionAttributeValues: {
            ':sub': DynamoAttributeValue.fromString(JsonPath.stringAt('$.cognito.sub')),
          },
          updateExpression: 'SET cognito_sub = :sub',
          conditionExpression: 'attribute_exists(PK)',
        })
      );

    const processAttendeesUpdateChoice = new Choice(this, 'ProcessAttendeesUpdate')
      .when(
        Condition.stringEquals(JsonPath.stringAt('$.body.profile.first_name'), 'Info Requested'),
        new Succeed(this, 'AttendeeNotCreatedYet')
      )
      .otherwise(
        Chain.start(
          new DynamoUpdateItem(this, 'Set company', {
            table: props.dynamoTable,
            key: {
              PK: DynamoAttributeValue.fromString(
                JsonPath.format('USER#{}', JsonPath.stringAt('$.body.order_id'))
              ),
              SK: DynamoAttributeValue.fromString('PROFILE'),
            },
            expressionAttributeValues: {
              ':company': DynamoAttributeValue.fromString(
                JsonPath.stringAt('$.body.profile.company')
              ),
            },
            updateExpression: 'SET company = :company',
            resultPath: JsonPath.DISCARD,
          })
        ).next(
          new Parallel(this, 'ProcessAttendeesUpdateParallel')
            .branch(
              new Choice(this, 'JobTitlePresent')
                .when(
                  Condition.isPresent('$.body.profile.job_title'),
                  new DynamoUpdateItem(this, 'SetJobTitle', {
                    table: props.dynamoTable,
                    key: {
                      PK: DynamoAttributeValue.fromString(
                        JsonPath.format('USER#{}', JsonPath.stringAt('$.body.order_id'))
                      ),
                      SK: DynamoAttributeValue.fromString('PROFILE'),
                    },
                    expressionAttributeValues: {
                      ':job_title': DynamoAttributeValue.fromString(
                        JsonPath.stringAt('$.body.profile.job_title')
                      ),
                    },
                    updateExpression: 'SET job_title = :job_title',
                    conditionExpression: 'attribute_exists(PK)',
                    resultPath: JsonPath.DISCARD,
                  })
                )
                .otherwise(new Succeed(this, 'JobTitleNotPresent'))
            )
            .branch(
              new Choice(this, 'CellPhonePresent')
                .when(
                  Condition.isPresent('$.body.profile.cell_phone'),
                  new DynamoUpdateItem(this, 'SetCellPhone', {
                    table: props.dynamoTable,
                    key: {
                      PK: DynamoAttributeValue.fromString(
                        JsonPath.format('USER#{}', JsonPath.stringAt('$.body.order_id'))
                      ),
                      SK: DynamoAttributeValue.fromString('PROFILE'),
                    },
                    expressionAttributeValues: {
                      ':cell_phone': DynamoAttributeValue.fromString(
                        JsonPath.stringAt('$.body.profile.cell_phone')
                      ),
                    },
                    updateExpression: 'SET cell_phone = :cell_phone',
                    conditionExpression: 'attribute_exists(PK)',
                    resultPath: JsonPath.DISCARD,
                  })
                )
                .otherwise(new Succeed(this, 'CellPhoneNotPresent'))
            )
            .branch(
              new Choice(this, 'GenderPresent')
                .when(
                  Condition.isPresent('$.body.profile.gender'),
                  new DynamoUpdateItem(this, 'SetGender', {
                    table: props.dynamoTable,
                    key: {
                      PK: DynamoAttributeValue.fromString(
                        JsonPath.format('USER#{}', JsonPath.stringAt('$.body.order_id'))
                      ),
                      SK: DynamoAttributeValue.fromString('PROFILE'),
                    },
                    expressionAttributeValues: {
                      ':gender': DynamoAttributeValue.fromString(
                        JsonPath.stringAt('$.body.profile.gender')
                      ),
                    },
                    updateExpression: 'SET gender = :gender',
                    conditionExpression: 'attribute_exists(PK)',
                    resultPath: JsonPath.DISCARD,
                  })
                )
                .otherwise(new Succeed(this, 'GenderNotPresent'))
            )
        )
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
      stateMachineName: `UserStepFunction-${props.environmentName}`,
      definition: apiChain,
      tracingEnabled: true,
    });

    this.stepFunction = userStepFunction;

    // Create API Gateway to trigger the step function
    this.apiGateway = new apigateway.RestApi(this, 'UserStepFunctionApi', {
      restApiName: `UserStepFunction-API-${props.environmentName}`,
      description: 'API Gateway to trigger User Step Function',
      deployOptions: {
        stageName: props.environmentName,
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      domainName: {
        domainName: props.webhookDomain,
        certificate: props.certificate,
      },
    });

    // Create the execution role for API Gateway to invoke Step Function
    const apiGatewayStepFunctionRole = new iam.Role(this, 'ApiGatewayStepFunctionRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      description: 'Role for API Gateway to start execution of Step Function',
    });

    // Grant permission to execute the step function
    this.stepFunction.grantStartExecution(apiGatewayStepFunctionRole);

    // Add a resource and method to the API
    const stepFunctionResource = this.apiGateway.root.addResource('invoke');

    // Add POST method to invoke the step function
    stepFunctionResource.addMethod(
      'POST',
      new apigateway.AwsIntegration({
        service: 'states',
        action: 'StartExecution',
        integrationHttpMethod: 'POST',
        options: {
          credentialsRole: apiGatewayStepFunctionRole,
          requestTemplates: {
            'application/json': `{
              "input": "$util.escapeJavaScript($input.json('$'))",
              "stateMachineArn": "${this.stepFunction.stateMachineArn}"
            }`,
          },
          integrationResponses: [
            {
              statusCode: '200',
              responseTemplates: {
                'application/json': `{
                  "status": "success",
                }`,
              },
            },
            {
              selectionPattern: '4\\d{2}',
              statusCode: '400',
              responseTemplates: {
                'application/json': `{
                  "error": "Bad request"
                }`,
              },
            },
            {
              selectionPattern: '5\\d{2}',
              statusCode: '500',
              responseTemplates: {
                'application/json': `{
                  "error": "Internal server error"
                }`,
              },
            },
          ],
        },
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseModels: { 'application/json': apigateway.Model.EMPTY_MODEL },
          },
          {
            statusCode: '400',
            responseModels: { 'application/json': apigateway.Model.ERROR_MODEL },
          },
          {
            statusCode: '500',
            responseModels: { 'application/json': apigateway.Model.ERROR_MODEL },
          },
        ],
      }
    );

    // Add route53 record for the API Gateway
    new route53.ARecord(this, 'UserStepFunctionApiRecord', {
      zone: props.hostedZone,
      recordName: props.webhookDomain,
      target: route53.RecordTarget.fromAlias(new route53_targets.ApiGateway(this.apiGateway)),
    });

    // Create output for the API Gateway URL
    new cdk.CfnOutput(this, 'UserStepFunctionApiUrl', {
      value: this.apiGateway.url,
      description: 'URL of the API Gateway endpoint to invoke the User Step Function',
      exportName: `${props.environmentName}-UserStepFunctionApiUrl`,
    });

    // Create output for the Step Function ARN
    new cdk.CfnOutput(this, 'UserStepFunctionArn', {
      value: this.stepFunction.stateMachineArn,
      description: 'ARN of the User Step Function',
      exportName: `${props.environmentName}-UserStepFunctionArn`,
    });
  }
}
