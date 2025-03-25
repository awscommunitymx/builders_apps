import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { AttendeeCheckIn } from "./types";
import {
  ConditionalCheckFailedException,
  ProvisionedThroughputExceededException,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";

export async function storeAttendeeCheckIn(
  client: DynamoDBDocumentClient,
  attendee: AttendeeCheckIn,
  tableName: string,
): Promise<void> {
  try {
    const item = {
      PK: `USER#${attendee.user_id}`,
      SK: "PROFILE",
      ...attendee,
      contact_information: {
        email: attendee.contact_information.email,
        phone: attendee.contact_information.phone,
        share_email: attendee.contact_information.share_email,
        share_phone: attendee.contact_information.share_phone,
      },
      social_links: attendee.social_links.map((link) => ({
        name: link.name,
        url: link.url,
      })),
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });

    await client.send(command);
    console.log("✅ Check-in stored successfully");
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      console.error("❌ Check-in already exists:", error);
      throw new Error("Attendee already checked in.");
    } else if (error instanceof ProvisionedThroughputExceededException) {
      console.error("❌ DynamoDB throughput exceeded:", error);
      throw new Error("Service is busy, please try again later.");
    } else if (error instanceof ResourceNotFoundException) {
      console.error("❌ DynamoDB table not found:", error);
      throw new Error("Configuration error: DynamoDB table missing.");
    } else if (error instanceof Error) {
      console.error("❌ Unknown error storing check-in:", error);
      throw new Error("An unexpected error occurred while storing check-in.");
    } else {
      console.error("❌ Unhandled error type:", error);
      throw new Error("An unknown error occurred.");
    }
  }
}
