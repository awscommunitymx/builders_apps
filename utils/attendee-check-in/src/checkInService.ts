import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { AttendeeCheckIn } from "./types";

export async function storeAttendeeCheckIn(
  client: DynamoDBDocumentClient,
  attendee: AttendeeCheckIn
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
      TableName: process.env.DYNAMODB_TABLE!,
      Item: item,
    });

    await client.send(command);
    console.log("✅ Check-in stored successfully");
  } catch (error) {
    console.error("❌ Error storing check-in:", error);
    throw new Error("Failed to store attendee check-in");
  }
}
