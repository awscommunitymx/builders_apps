import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

interface CsatQrDisplayStackProps extends cdk.StackProps {
  apiUrl: string;
  apiKey: string;
  environment: string;
  certificateArn: string;
  hostedZoneId: string;
  hostedZoneName: string;
  domainName: string;
}

export class CsatQrDisplayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CsatQrDisplayStackProps) {
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

    // Create S3 bucket to host the CSAT QR display app
    const websiteBucket = new s3.Bucket(this, 'CsatQrDisplayBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing support
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      removalPolicy: ['production', 'staging'].includes(props.environment)
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !['production', 'staging'].includes(props.environment), // Only allow auto-delete for non-production
    });

    // CloudFront distribution for HTTPS and caching
    const distribution = new cloudfront.Distribution(this, 'CsatQrDisplayDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      domainNames: [props.domainName],
      certificate: domainCert,
    });

    new route53.AaaaRecord(this, 'CsatQrDisplayAliasAaaa', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      recordName: props.domainName,
    });

    new route53.ARecord(this, 'CsatQrDisplayAliasA', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      recordName: props.domainName,
    });

    // Create a policy document for CloudFront invalidation
    const cloudfrontPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: [
            'cloudfront:CreateInvalidation',
            'cloudfront:GetInvalidation',
            'cloudfront:ListInvalidations',
          ],
          effect: iam.Effect.ALLOW,
          resources: [distribution.distributionArn],
        }),
      ],
    });

    // Build and deploy CSAT QR display app
    const csatQrDisplayPath = path.join(__dirname, '../csat-qr-display');

    // Deploy with pre-created execution role with CloudFront permissions
    const customRole = new iam.Role(this, 'CsatQrDisplayCloudFrontInvalidationRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        'cloudfront-invalidation': cloudfrontPolicy,
      },
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Add S3 permissions to the role
    customRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          's3:GetObject*',
          's3:GetBucket*',
          's3:List*',
          's3:DeleteObject*',
          's3:PutObject*',
          's3:Abort*',
        ],
        resources: [websiteBucket.bucketArn, `${websiteBucket.bucketArn}/*`],
      })
    );

    new s3deploy.BucketDeployment(this, 'DeployCsatQrDisplayWebsite', {
      sources: [s3deploy.Source.asset(path.join(csatQrDisplayPath, 'dist'))],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
      role: customRole,
      prune: true,
      memoryLimit: 1024,
      useEfs: false,
      retainOnDelete: ['production', 'staging'].includes(props.environment), // Retain deployment in production
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
    });

    // Output the CloudFront URL
    new cdk.CfnOutput(this, 'CsatQrDisplayWebsiteURL', {
      value: `https://${props.domainName}`,
      description: 'CSAT QR Display Website URL',
    });

    // Output the distribution ID for future reference
    new cdk.CfnOutput(this, 'CsatQrDisplayDistributionId', {
      value: distribution.distributionId,
      description: 'CSAT QR Display CloudFront Distribution ID',
    });
  }
}