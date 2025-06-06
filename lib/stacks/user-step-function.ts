import { Construct } from 'constructs';
import { JsonPath, Parallel, Pass, TaskInput, Result } from 'aws-cdk-lib/aws-stepfunctions';
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
  DynamoGetItem,
  DynamoDeleteItem,
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
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

interface UserStepFunctionStackProps {
  environmentName: string;
  userPool: UserPool;
  dynamoTable: ITable;
  webhookDomain: string;
  hostedZone: IHostedZone;
  certificate: ICertificate;
  eventbriteApiKeySecretArn: string;
  algoliaApiKeySecretArn: string;
  algoliaAppIdSecretArn: string;
  twilioMessageSender: PythonFunction;
}

export class UserStepFunctionStack extends Construct {
  public readonly stepFunction: StateMachine;
  public readonly apiGateway: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: UserStepFunctionStackProps) {
    super(scope, id);

    const validatePhoneNumberLambda = new PythonFunction(this, 'ValidatePhoneNumberFunction', {
      functionName: `validate-phone-number-${props.environmentName}`,
      entry: path.join(__dirname, '../../lambda/phone_validation'),
      runtime: Runtime.PYTHON_3_11,
      handler: 'lambda_handler',
      index: 'handler.py',
      description: 'Validates phone numbers to ensure they are in the correct format',
      timeout: Duration.seconds(10),
      memorySize: 128,
    });

    // Create the Lambda function for generating short IDs
    const generateShortIdLambda = new NodejsFunction(this, 'GenerateShortIdFunction', {
      functionName: `generate-short-id-${props.environmentName}`,
      runtime: Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/generate-short-id/index.ts'),
      description: 'Generates a unique 5-character short ID for users',
      timeout: Duration.seconds(10),
      memorySize: 128,
    });

    // Create Eventbrite API Key secret in Secrets Manager
    const eventbriteApiKey = Secret.fromSecretAttributes(this, 'EventbriteApiKey', {
      secretCompleteArn: props.eventbriteApiKeySecretArn,
    });

    // Create Algolia secrets in Secrets Manager if provided
    let algoliaApiKey, algoliaAppId;
    if (props.algoliaApiKeySecretArn && props.algoliaAppIdSecretArn) {
      algoliaApiKey = Secret.fromSecretAttributes(this, 'AlgoliaApiKey', {
        secretCompleteArn: props.algoliaApiKeySecretArn,
      });

      algoliaAppId = Secret.fromSecretAttributes(this, 'AlgoliaAppId', {
        secretCompleteArn: props.algoliaAppIdSecretArn,
      });
    }

    // Create the Lambda function for Algolia updates
    const algoliaUpdateLambda = new NodejsFunction(this, 'AlgoliaUpdateFunction', {
      functionName: `algolia-update-${props.environmentName}`,
      runtime: Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/algolia-update/index.ts'),
      description: 'Updates Algolia index with user data',
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        ALGOLIA_API_KEY_SECRET: algoliaApiKey?.secretName || 'algolia/api_key',
        ALGOLIA_APP_ID_SECRET: algoliaAppId?.secretName || 'algolia/app_id',
        ALGOLIA_INDEX_NAME: `${props.environmentName}_attendees`,
      },
      bundling: {
        externalModules: ['aws-sdk'],
        nodeModules: [
          'algoliasearch',
          '@aws-lambda-powertools/tracer',
          '@aws-lambda-powertools/logger',
          '@aws-lambda-powertools/metrics',
        ],
      },
    });

    // Grant the Lambda function permission to read Algolia secrets
    if (algoliaApiKey && algoliaAppId) {
      algoliaApiKey.grantRead(algoliaUpdateLambda);
      algoliaAppId.grantRead(algoliaUpdateLambda);
    } else {
      // If no ARNs provided, grant permission to read secrets by name
      const secretsManagerPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:algolia/api_key*`,
          `arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:algolia/app_id*`,
        ],
      });
      algoliaUpdateLambda.addToRolePolicy(secretsManagerPolicy);
    }

    // Create task to call Algolia update Lambda
    const updateAlgoliaTask = new LambdaInvoke(this, 'UpdateAlgoliaIndex', {
      lambdaFunction: algoliaUpdateLambda,
      inputPath: '$',
      resultPath: '$.algoliaResult',
      payloadResponseOnly: true,
      payload: TaskInput.fromObject({
        user: JsonPath.stringAt('$.body'),
        action: JsonPath.stringAt('$.config.action'),
      }),
    });

    const updateAlgoliaAfterProfileUpdate = new LambdaInvoke(
      this,
      'UpdateAlgoliaAfterProfileUpdate',
      {
        lambdaFunction: algoliaUpdateLambda,
        inputPath: '$',
        resultPath: '$.algoliaUpdateResult',
        payloadResponseOnly: true,
        payload: TaskInput.fromObject({
          user: {
            user_id: JsonPath.stringAt('$.body.order_id'),
            email: JsonPath.stringAt('$.body.profile.email'),
            name: JsonPath.stringAt('$.body.profile.name'),
            cell_phone: JsonPath.stringAt(
              '$.processedPhoneNumber.processedPhoneNumber.clean_phone'
            ),
          },
          action: JsonPath.stringAt('$.config.action'),
        }),
      }
    );

    // Create Twilio WhatsApp message sender task
    const sendWhatsAppMessage = new LambdaInvoke(this, 'SendWhatsAppMessage', {
      lambdaFunction: props.twilioMessageSender,
      inputPath: '$',
      resultPath: '$.whatsappResult',
      payloadResponseOnly: true,
      payload: TaskInput.fromObject({
        nombre_usuario: JsonPath.stringAt('$.body.profile.first_name'),
        email_usuario: JsonPath.stringAt('$.body.profile.email'),
        telefono: JsonPath.stringAt('$.processedPhoneNumber.processedPhoneNumber.clean_phone'),
        texto_qr: JsonPath.stringAt('$.body.barcodes[0].barcode'),
        nombre_completo: JsonPath.stringAt('$.body.profile.name'),
      }),
    });

    // Create the Lambda function for Algolia deletions

    const algoliaDeleteLambda = new NodejsFunction(this, 'AlgoliaDeleteFunction', {
      functionName: `algolia-delete-${props.environmentName}`,
      runtime: Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/algolia-delete/index.ts'),
      description: 'Deletes users from Algolia index',
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        ALGOLIA_API_KEY_SECRET: algoliaApiKey?.secretName || 'algolia/api_key',
        ALGOLIA_APP_ID_SECRET: algoliaAppId?.secretName || 'algolia/app_id',
        ALGOLIA_INDEX_NAME: `${props.environmentName}_attendees`,
      },
      bundling: {
        externalModules: ['aws-sdk'],
        nodeModules: [
          'algoliasearch',
          '@aws-lambda-powertools/tracer',
          '@aws-lambda-powertools/logger',
          '@aws-lambda-powertools/metrics',
        ],
      },
    });

    // Grant the Lambda function permission to read Algolia secrets
    if (algoliaApiKey && algoliaAppId) {
      algoliaApiKey.grantRead(algoliaDeleteLambda);
      algoliaAppId.grantRead(algoliaDeleteLambda);
    } else {
      // If no ARNs provided, grant permission to read secrets by name
      const secretsManagerPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:algolia/api_key*`,
          `arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:algolia/app_id*`,
        ],
      });
      algoliaDeleteLambda.addToRolePolicy(secretsManagerPolicy);
    }

    // Task to delete user from Algolia index
    const deleteFromAlgoliaTask = new LambdaInvoke(this, 'DeleteFromAlgoliaIndex', {
      lambdaFunction: algoliaDeleteLambda,
      inputPath: '$',
      resultPath: '$.algoliaDeleteResult',
      payloadResponseOnly: true,
      payload: TaskInput.fromObject({
        userId: JsonPath.stringAt('$.body.id'),
        action: 'delete',
      }),
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

    // Define what happens after Algolia update
    const algoliaUpdateSucceeded = new Succeed(this, 'AlgoliaUpdateSucceeded');

    const unknownWebhookTypeFail = new Fail(this, 'UnknownWebhookTypeFail');
    const apiFailure = new Fail(this, 'ApiFailure');
    const orderPlacedSuccess = new Succeed(this, 'OrderPlacedSuccess');
    const attendeeUpdatedSuccess = new Succeed(this, 'AttendeeUpdatedSuccess');
    const orderRefundedSuccess = new Succeed(this, 'OrderRefundedSuccess');
    const userNotFoundSuccess = new Succeed(this, 'UserNotFoundSuccess');

    const generateShortIdTask = new LambdaInvoke(this, 'GenerateShortId', {
      lambdaFunction: generateShortIdLambda,
      resultPath: '$.shortIdResult',
      payloadResponseOnly: true,
    });

    // Create a Pass step to add tempEmail variable
    const addTempEmailPass = new Pass(this, 'AddTempEmail', {
      parameters: {
        'body.$': '$.body',
        'config.$': '$.config',
        tempEmail: JsonPath.format('tmp_order+{}@awscommunity.mx', JsonPath.stringAt('$.body.id')),
      },
    });

    // Add the createCognitoUserTask to the Map state
    const processAttendees = Chain.start(addTempEmailPass)
      .next(generateShortIdTask)
      .next(
        new DynamoPutItem(this, 'CreateUser', {
          table: props.dynamoTable,
          item: {
            PK: DynamoAttributeValue.fromString(
              JsonPath.format('USER#{}', JsonPath.stringAt('$.body.id'))
            ),
            SK: DynamoAttributeValue.fromString('PROFILE'),
            email: DynamoAttributeValue.fromString(JsonPath.stringAt('$.tempEmail')),
            name: DynamoAttributeValue.fromString(JsonPath.stringAt('$.body.name')),
            user_id: DynamoAttributeValue.fromString(JsonPath.stringAt('$.body.id')),
            short_id: DynamoAttributeValue.fromString(JsonPath.stringAt('$.shortIdResult')),
          },
          conditionExpression: 'attribute_not_exists(PK)',
          resultPath: JsonPath.DISCARD,
        }).addCatch(generateShortIdTask, {
          errors: ['ConditionalCheckFailedException'],
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
            Username: JsonPath.stringAt('$.tempEmail'),
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
            Username: JsonPath.stringAt('$.tempEmail'),
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
          resultPath: JsonPath.DISCARD,
        })
      )
      .next(
        // Update Algolia with new user data
        new LambdaInvoke(this, 'UpdateAlgoliaAfterCreate', {
          lambdaFunction: algoliaUpdateLambda,
          inputPath: '$',
          resultPath: '$.algoliaResult',
          payloadResponseOnly: true,
          payload: TaskInput.fromObject({
            user: {
              user_id: JsonPath.stringAt('$.body.id'),
              email: JsonPath.stringAt('$.body.email'),
              name: JsonPath.stringAt('$.body.name'),
            },
            action: 'create',
          }),
        })
      )
      .next(orderPlacedSuccess);

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
        )
          .next(
            new Parallel(this, 'ProcessAttendeesUpdateParallel', {})
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
                    Chain.start(
                      new LambdaInvoke(this, 'ProcessPhoneNumber', {
                        lambdaFunction: validatePhoneNumberLambda,
                        payload: TaskInput.fromObject({
                          phoneNumber: JsonPath.stringAt('$.body.profile.cell_phone'),
                        }),
                        resultSelector: {
                          'processedPhoneNumber.$': '$.Payload',
                        },
                        resultPath: '$.processedPhoneNumber',
                      })
                    ).next(
                      new Choice(this, 'ProcessedPhoneNumberPresent')
                        .when(
                          Condition.booleanEquals(
                            JsonPath.stringAt(
                              '$.processedPhoneNumber.processedPhoneNumber.validation_result.is_valid'
                            ),
                            true
                          ),
                          // Start of new/changed code block
                          (() => {
                            const getExistingUserForPhoneStep = new CallAwsService(
                              this,
                              'GetExistingUserForPhone',
                              {
                                service: 'dynamodb',
                                action: 'getItem',
                                iamResources: [props.dynamoTable.tableArn],
                                iamAction: 'dynamodb:GetItem',
                                parameters: {
                                  TableName: props.dynamoTable.tableName,
                                  Key: {
                                    PK: {
                                      S: JsonPath.format(
                                        'USER#{}',
                                        JsonPath.stringAt('$.body.order_id')
                                      ),
                                    },
                                    SK: {
                                      S: 'PROFILE',
                                    },
                                  },
                                },
                                resultPath: '$.existingUserForPhone',
                              }
                            );

                            const setCellPhoneStep = new DynamoUpdateItem(this, 'SetCellPhone', {
                              table: props.dynamoTable,
                              key: {
                                PK: DynamoAttributeValue.fromString(
                                  JsonPath.format('USER#{}', JsonPath.stringAt('$.body.order_id'))
                                ),
                                SK: DynamoAttributeValue.fromString('PROFILE'),
                              },
                              expressionAttributeValues: {
                                ':cell_phone': DynamoAttributeValue.fromString(
                                  JsonPath.stringAt(
                                    '$.processedPhoneNumber.processedPhoneNumber.clean_phone'
                                  )
                                ),
                              },
                              updateExpression: 'SET cell_phone = :cell_phone',
                              conditionExpression: 'attribute_exists(PK)',
                              resultPath: JsonPath.DISCARD,
                            });

                            const updateCognitoUserPhoneStep = new CallAwsService(
                              this,
                              'UpdateCognitoUserPhone',
                              {
                                service: 'cognitoidentityprovider',
                                action: 'adminUpdateUserAttributes',
                                iamAction: 'cognito-idp:AdminUpdateUserAttributes',
                                iamResources: [
                                  `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${
                                    cdk.Stack.of(this).account
                                  }:userpool/${props.userPool.userPoolId}`,
                                ],
                                parameters: {
                                  UserPoolId: props.userPool.userPoolId,
                                  Username: JsonPath.stringAt(
                                    '$.existingUserForPhone.Item.email.S'
                                  ),
                                  UserAttributes: [
                                    {
                                      Name: 'phone_number',
                                      Value: JsonPath.stringAt(
                                        '$.processedPhoneNumber.processedPhoneNumber.clean_phone'
                                      ),
                                    },
                                    {
                                      Name: 'phone_number_verified',
                                      Value: 'true',
                                    },
                                  ],
                                },
                                resultPath: JsonPath.DISCARD,
                              }
                            );

                            // If UpdateCognitoUserPhone fails, retry from GetExistingUserForPhone
                            updateCognitoUserPhoneStep.addCatch(getExistingUserForPhoneStep, {
                              errors: ['States.ALL'], // Catch all errors
                              resultPath: JsonPath.DISCARD, // Discard error object before retry
                            });

                            const phoneNumberNotChangedSucceed = new Succeed(
                              this,
                              'PhoneNumberNotChanged'
                            );

                            const processPhoneChain = Chain.start(getExistingUserForPhoneStep)
                              .next(setCellPhoneStep)
                              .next(sendWhatsAppMessage) // sendWhatsAppMessage is assumed to be a defined state/chain
                              .next(
                                new Choice(this, 'PhoneNumberChanged')
                                  .when(
                                    Condition.or(
                                      Condition.not(
                                        Condition.isPresent(
                                          '$.existingUserForPhone.Item.cell_phone'
                                        )
                                      ),
                                      Condition.not(
                                        Condition.stringEqualsJsonPath(
                                          JsonPath.stringAt(
                                            '$.processedPhoneNumber.processedPhoneNumber.clean_phone'
                                          ),
                                          JsonPath.stringAt(
                                            '$.existingUserForPhone.Item.cell_phone.S'
                                          )
                                        )
                                      )
                                    ),
                                    updateCognitoUserPhoneStep
                                  )
                                  .otherwise(phoneNumberNotChangedSucceed)
                              );
                            return processPhoneChain;
                          })() // End of new/changed code block
                        )
                        .otherwise(new Succeed(this, 'InvalidPhoneNumberFormatFail'))
                    )
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
              .branch(
                new Choice(this, 'EmailPresent')
                  .when(
                    Condition.isPresent('$.body.profile.email'),
                    Chain.start(
                      // First, get the existing item to get the current email
                      new CallAwsService(this, 'GetExistingUser', {
                        service: 'dynamodb',
                        action: 'getItem',
                        iamResources: [props.dynamoTable.tableArn],
                        iamAction: 'dynamodb:GetItem',
                        parameters: {
                          TableName: props.dynamoTable.tableName,
                          Key: {
                            PK: {
                              S: JsonPath.format('USER#{}', JsonPath.stringAt('$.body.order_id')),
                            },
                            SK: {
                              S: 'PROFILE',
                            },
                          },
                        },
                        resultPath: '$.existingUser',
                      })
                    ).next(
                      new Choice(this, 'EmailChanged')
                        .when(
                          // Check if the email has changed
                          Condition.not(
                            Condition.stringEqualsJsonPath(
                              JsonPath.stringAt('$.body.profile.email'),
                              JsonPath.stringAt('$.existingUser.Item.email.S')
                            )
                          ),
                          Chain.start(
                            // Update email in DynamoDB
                            new DynamoUpdateItem(this, 'UpdateEmail', {
                              table: props.dynamoTable,
                              key: {
                                PK: DynamoAttributeValue.fromString(
                                  JsonPath.format('USER#{}', JsonPath.stringAt('$.body.order_id'))
                                ),
                                SK: DynamoAttributeValue.fromString('PROFILE'),
                              },
                              expressionAttributeValues: {
                                ':email': DynamoAttributeValue.fromString(
                                  JsonPath.stringAt('$.body.profile.email')
                                ),
                              },
                              updateExpression: 'SET email = :email',
                              conditionExpression: 'attribute_exists(PK)',
                              resultPath: JsonPath.DISCARD,
                            })
                          ).next(
                            // Update the user's email in Cognito
                            new CallAwsService(this, 'UpdateCognitoUserEmail', {
                              service: 'cognitoidentityprovider',
                              action: 'adminUpdateUserAttributes',
                              iamAction: 'cognito-idp:AdminUpdateUserAttributes',
                              iamResources: [
                                `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${
                                  cdk.Stack.of(this).account
                                }:userpool/${props.userPool.userPoolId}`,
                              ],
                              parameters: {
                                UserPoolId: props.userPool.userPoolId,
                                Username: JsonPath.stringAt('$.existingUser.Item.email.S'),
                                UserAttributes: [
                                  {
                                    Name: 'email',
                                    Value: JsonPath.stringAt('$.body.profile.email'),
                                  },
                                  {
                                    Name: 'email_verified',
                                    Value: 'true',
                                  },
                                ],
                              },
                              resultPath: JsonPath.DISCARD,
                            })
                          )
                        )
                        .otherwise(new Succeed(this, 'EmailNotChanged'))
                    )
                  )
                  .otherwise(new Succeed(this, 'EmailNotPresent'))
              )
              .branch(
                new Choice(this, 'BarcodePresent')
                  .when(
                    Condition.isPresent('$.body.barcodes[0].barcode'),
                    new DynamoUpdateItem(this, 'SetBarcode', {
                      table: props.dynamoTable,
                      key: {
                        PK: DynamoAttributeValue.fromString(
                          JsonPath.format('USER#{}', JsonPath.stringAt('$.body.order_id'))
                        ),
                        SK: DynamoAttributeValue.fromString('PROFILE'),
                      },
                      expressionAttributeValues: {
                        ':barcode': DynamoAttributeValue.fromString(
                          JsonPath.stringAt('$.body.barcodes[0].barcode')
                        ),
                      },
                      updateExpression: 'SET barcode = :barcode',
                      conditionExpression: 'attribute_exists(PK)',
                      resultPath: JsonPath.DISCARD,
                    })
                  )
                  .otherwise(new Succeed(this, 'BarcodeNotPresent'))
              )
          )
          .next(
            new Choice(this, 'ProcessAttendeesUpdateComplete')
              .when(
                Condition.isPresent('$[1].processedPhoneNumber'),
                new Pass(this, 'ProcessAttendeesUpdateCompleteWithPhone', {
                  parameters: {
                    'body.$': '$[1].body',
                    'config.$': '$[1].config',
                    'processedPhoneNumber.$': '$[1].processedPhoneNumber',
                  },
                })
              )
              .otherwise(
                new Pass(this, 'ProcessAttendeesUpdateCompleteWithoutPhone', {
                  parameters: {
                    'body.$': '$[1].body',
                    'config.$': '$[1].config',
                    processedPhoneNumber: {
                      processedPhoneNumber: {
                        clean_phone: '',
                      },
                    },
                  },
                })
              )
              .afterwards()
              .next(updateAlgoliaAfterProfileUpdate)
              .next(attendeeUpdatedSuccess)
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

    const processAttendeesDelete = Chain.start(
      new DynamoGetItem(this, 'GetUserForRefund', {
        table: props.dynamoTable,
        key: {
          PK: DynamoAttributeValue.fromString(
            JsonPath.format('USER#{}', JsonPath.stringAt('$.body.id'))
          ),
          SK: DynamoAttributeValue.fromString('PROFILE'),
        },
        resultPath: '$.existingUser',
      })
    ).next(
      new Choice(this, 'UserExistsForRefund')
        .when(
          // Check if the user exists
          Condition.isPresent('$.existingUser.Item'),
          Chain.start(
            // Delete from Algolia first
            deleteFromAlgoliaTask
          )
            .next(
              // Then delete the user from Cognito
              new CallAwsService(this, 'DeleteCognitoUser', {
                service: 'cognitoidentityprovider',
                action: 'adminDeleteUser',
                iamAction: 'cognito-idp:AdminDeleteUser',
                iamResources: [
                  `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:userpool/${props.userPool.userPoolId}`,
                ],
                parameters: {
                  UserPoolId: props.userPool.userPoolId,
                  Username: JsonPath.stringAt('$.existingUser.Item.email.S'),
                },
                resultPath: JsonPath.DISCARD,
              })
            )
            .next(
              // Finally, delete the user from DynamoDB
              new DynamoDeleteItem(this, 'DeleteUserFromDynamoDB', {
                table: props.dynamoTable,
                key: {
                  PK: DynamoAttributeValue.fromString(
                    JsonPath.format('USER#{}', JsonPath.stringAt('$.existingUser.Item.user_id.S'))
                  ),
                  SK: DynamoAttributeValue.fromString('PROFILE'),
                },
                resultPath: JsonPath.DISCARD,
              })
            )
            .next(orderRefundedSuccess)
        )
        .otherwise(userNotFoundSuccess)
    );

    // Pass state to inject order_id into body.id for cancelled/refunded orders
    const injectOrderIdIntoBodyId = new Pass(this, 'InjectOrderIdIntoBodyId', {
      parameters: {
        body: {
          'id.$': '$.body.order_id',
          'order_id.$': '$.body.order_id',
          'cancelled.$': '$.body.cancelled',
          'refunded.$': '$.body.refunded',
        },
        'config.$': '$.config',
        'statusCode.$': '$.statusCode',
      },
    }).next(processAttendeesDelete);

    const handlerChoice = new Choice(this, 'HandlerChoice')
      .when(
        Condition.and(
          Condition.isPresent('$.body.cancelled'),
          Condition.booleanEquals('$.body.cancelled', true)
        ),
        injectOrderIdIntoBodyId
      )
      .when(
        Condition.and(
          Condition.isPresent('$.body.refunded'),
          Condition.booleanEquals('$.body.refunded', true)
        ),
        injectOrderIdIntoBodyId
      )
      .when(Condition.stringEquals('$.config.action', 'order.placed'), processAttendees)
      .when(Condition.stringEquals('$.config.action', 'attendee.updated'), processAttendeesUpdate)
      .when(Condition.stringEquals('$.config.action', 'order.refunded'), processAttendeesDelete);

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
