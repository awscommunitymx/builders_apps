import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface CheckinQueuesProps {
  environmentName: string;
}

export class CheckinQueues extends Construct {
  public readonly mainQueue: sqs.Queue;
  public readonly secondaryQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: CheckinQueuesProps) {
    super(scope, id);

    // Create the main FIFO queue for the main location (used by all 4 main location check-in volunteers)
    this.mainQueue = new sqs.Queue(this, 'MainCheckinQueue', {
      queueName: `main-checkin-queue-${props.environmentName}`,
      fifo: false,
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'MainCheckinDLQ', {
          queueName: `main-checkin-dlq-${props.environmentName}`,
          fifo: false,
          visibilityTimeout: cdk.Duration.seconds(30),
          retentionPeriod: cdk.Duration.days(14),
        }),
        maxReceiveCount: 3,
      },
    });

    // Create the secondary FIFO queue for the secondary location (used by the single secondary location check-in volunteer)
    this.secondaryQueue = new sqs.Queue(this, 'SecondaryCheckinQueue', {
      queueName: `secondary-checkin-queue-${props.environmentName}`,
      fifo: false,
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'SecondaryCheckinDLQ', {
          queueName: `secondary-checkin-dlq-${props.environmentName}`,
          fifo: false,
          visibilityTimeout: cdk.Duration.seconds(30),
          retentionPeriod: cdk.Duration.days(14),
        }),
        maxReceiveCount: 3,
      },
    });
  }
}
