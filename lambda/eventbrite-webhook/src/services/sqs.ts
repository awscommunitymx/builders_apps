import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { AttendeeCheckIn } from '../../../../utils/types';

export const sendToSqs = async (sqsClient: SQSClient, queueUrl: string, data: AttendeeCheckIn): Promise<any> => {
  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(data),
    MessageGroupId: data.user_id,
    MessageDeduplicationId: data.user_id,
  });

  try {
    const result = await sqsClient.send(command);
    return {
      success: true,
      message_id: result.MessageId,
      sequence_number: result.SequenceNumber,
    };
  } catch (err: any) {
    // Change: Throwing error so that the catch block in the lambda catches it.
    throw new Error(`SQS send failed: ${err.message}`);
  }
};
