import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { execSync } from 'child_process';

interface FrontendStackProps extends cdk.StackProps {
  apiUrl: string;
  apiKey: string;
  environment?: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // Create S3 bucket to host the React app
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing support
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development - change for production
      autoDeleteObjects: true, // For development - change for production
    });

    // CloudFront distribution for HTTPS and caching
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
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
          resources: ['*'], // Ideally restrict to just this distribution
        }),
      ],
    });

    // Build and deploy React app
    // Using environment variables for the build process
    const frontendPath = path.join(__dirname, '../frontend');

    // Define environment variables for the build
    const env = {
      ...process.env,
      VITE_GRAPHQL_API_URL: props.apiUrl,
      VITE_GRAPHQL_API_KEY: props.apiKey,
      VITE_ENVIRONMENT: props.environment || 'dev',
    };

    // Build the React app
    const buildCommand = 'npm run build';
    try {
      console.log('Building React app...');
      execSync(buildCommand, {
        cwd: frontendPath,
        env,
        stdio: 'inherit',
      });
      console.log('React app build completed successfully.');
    } catch (error) {
      console.error('Failed to build React app:', error);
      throw error;
    }

    // Deploy with pre-created execution role with CloudFront permissions
    const customRole = new iam.Role(this, 'CloudFrontInvalidationRole', {
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

    // Use priveledged mode to avoid permission issues
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(frontendPath, 'dist'))],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
      role: customRole,
      prune: true,
      memoryLimit: 1024, // Increase memory for the deployment Lambda
      useEfs: false, // Don't use EFS
      retainOnDelete: false, // Clean up when deleting stack
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
    });

    // Output the CloudFront URL
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Website URL',
    });

    // Output the S3 bucket URL
    new cdk.CfnOutput(this, 'S3BucketURL', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'S3 Bucket URL',
    });
  }
}
