import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatabaseStack } from './stacks/database';
import { ApiStack } from './stacks/api';
import { LambdaStack } from './stacks/lambda';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';

export interface AppStackProps extends cdk.StackProps {
  environmentName: string;
  certificateArn: string;
  hostedZoneId: string;
  hostedZoneName: string;
  domainName: string;
}

export class BackendStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly apiKey: string;

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const domainCert = certificatemanager.Certificate.fromCertificateArn(
      this,
      'domainCert',
      props.certificateArn
    );

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.hostedZoneName,
    });

    const databaseStack = new DatabaseStack(this, 'DatabaseStack', {
      environmentName: props.environmentName,
    });

    const lambdaStack = new LambdaStack(this, 'LambdaStack', {
      environmentName: props.environmentName,
      table: databaseStack.table,
    });

    const apiStack = new ApiStack(this, 'ApiStack', {
      environmentName: props.environmentName,
      table: databaseStack.table,
      viewProfileFunction: lambdaStack.viewProfileFunction,
      certificate: domainCert,
      hostedZone: hostedZone,
      domainName: props.domainName,
    });

    // Expose API URL and Key
    this.apiUrl = apiStack.api.graphqlUrl;
    this.apiKey = apiStack.api.apiKey || '';
  }
}
