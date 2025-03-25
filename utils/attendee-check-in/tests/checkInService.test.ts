import { storeAttendeeCheckIn } from "../src/checkInService";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { AttendeeCheckIn } from "../src/types";

const ddbMock = mockClient(DynamoDBDocumentClient);

const mockAttendee: AttendeeCheckIn = {
  user_id: "123",
  first_name: "John",
  last_name: "Doe",
  age_range: "25-34",
  gender: "Male",
  company: "Acme Corp",
  area_of_interest: "Cloud Architecture",
  pin: "1234",
  role: "Cloud Architect",
  contact_information: {
    email: "john@example.com",
    phone: "1234567890",
    share_email: true,
    share_phone: false,
  },
  social_links: [
    { name: "LinkedIn", url: "https://linkedin.com/johndoe" },
  ],
  short_id: "ABC123",
};

describe("storeAttendeeCheckIn", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it("stores check-in data successfully", async () => {
    ddbMock.onAnyCommand().resolves({});

    await expect(storeAttendeeCheckIn(ddbMock as any, mockAttendee))
      .resolves.not.toThrow();

    expect(ddbMock.calls().length).toBe(1);
  });

  it("throws an error if DynamoDB fails", async () => {
    ddbMock.onAnyCommand().rejects(new Error("DynamoDB error"));

    await expect(storeAttendeeCheckIn(ddbMock as any, mockAttendee))
      .rejects.toThrow("Failed to store attendee check-in");
  });
});
