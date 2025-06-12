import { vi, describe, it, expect, beforeEach } from 'vitest';
import { handler } from '../lambda/agenda-fetcher/src/index';
import fetch from 'node-fetch';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Context } from 'aws-lambda';
import * as parser from '../utils/sessionizeParser';

// Mock environment
process.env.DYNAMODB_TABLE_NAME = 'test-table';
process.env.S3_BUCKET = 'test-bucket';
process.env.SESSIONIZE_API_URL = 'https://sessionize.test/sessions';
process.env.APPSYNC_ENDPOINT = 'https://appsync.test/graphql';
process.env.APPSYNC_API_KEY = 'test-api-key';

// Mock AWS SDK clients
const sendMock = vi.fn();
vi.spyOn(DynamoDBDocumentClient.prototype, 'send').mockImplementation(sendMock);
vi.spyOn(S3Client.prototype, 'send').mockImplementation(sendMock);

// Mock fetch
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));
const mockedFetch = fetch as unknown as vi.Mock;

// Sample parsers
const samplePayload = { /* minimal payload with one session and room */
  sessions: [ { id: '1', title: 'Test', startsAt: '2025-01-01T10:00:00', endsAt: '2025-01-01T10:30:00', speakers: [], categoryItems: [], roomId: 101, status: 'Accepted', liveUrl: null, recordingUrl: null } ],
  speakers: [], rooms: [ { id: 101, name: 'RoomA' } ], questions: [], categories: []
};
const roomData = [ { location: 'RoomA', sessions: [{ id: '1', name: 'Test', speakers: [], time: '10:00:00 - 10:30:00', dateStart: '2025-01-01T10:00:00', dateEnd: '2025-01-01T10:30:00', duration: 30, location: 'RoomA', nationality: null, level: null, language: null, category: null, capacity: null, status: 'Accepted', liveUrl: null, recordingUrl: null }] } ];
const agendaData = { sessions: roomData[0].sessions };

describe('AgendaFetcher Lambda', () => {
  beforeEach(() => {
    sendMock.mockReset();
    mockedFetch.mockReset();
    vi.spyOn(parser, 'parseSessions').mockReturnValue(roomData as any);
    vi.spyOn(parser, 'parseAgenda').mockReturnValue(agendaData as any);
  });

  it('should write full blob and room blobs when hashes differ', async () => {
    // Setup: first getHash returns null, second for room returns null
    sendMock.mockResolvedValueOnce({}); // getHash ALL
    sendMock.mockResolvedValueOnce({}); // PutObject all-sessions
    sendMock.mockResolvedValueOnce({}); // putHash ALL
    sendMock.mockResolvedValueOnce({}); // getHash RoomA
    sendMock.mockResolvedValueOnce({}); // PutObject room-RoomA
    sendMock.mockResolvedValueOnce({}); // putHash RoomA
    sendMock.mockResolvedValueOnce({}); // publishUpdate -> fetch

    mockedFetch
      .mockResolvedValueOnce({ ok: true, json: async () => samplePayload }) // fetch sess
      .mockResolvedValueOnce({ ok: true, text: async () => '' });           // publishUpdate

    const result = await handler({}, {} as Context);

    // Expect PutObjectCommand to be called for full and room
    const putCalls = sendMock.mock.calls.filter(call => call[0] instanceof PutObjectCommand);
    expect(putCalls).toHaveLength(2);
    expect(result).toEqual({ status: 'ok' });
  });
});
