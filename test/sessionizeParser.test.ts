import path = require('path');
import { buildLookupMaps, toSession, parseSessions, SessionizePayload } from '../utils/sessionizeParser';
import * as fs from 'fs';
import { describe, it, expect } from 'vitest';

describe('sessionize-parser', () => {
  const payload: SessionizePayload = {
    sessions: [
      {
        id: '1',
        title: 'Test Session',
        description: 'Desc',
        startsAt: '2025-06-13T10:00:00',
        endsAt: '2025-06-13T10:30:00',
        speakers: ['s1'],
        categoryItems: [101, 201],
        roomId: 301,
        status: 'Accepted',
        liveUrl: null,
        recordingUrl: null,
      },
    ],
    speakers: [
      {
        id: 's1',
        fullName: 'Speaker One',
        profilePicture: 'http://img',
        bio: 'Bio',
        questionAnswers: [{ questionId: 401, answerValue: 'USA' }],
        links: [{ title: '', url: 'http://twitter', linkType: 'Twitter' }],
      },
    ],
    rooms: [{ id: 301, name: 'Room A' }],
    questions: [{ id: 401, question: 'Nationality' }],
    categories: [
      { id: 1, title: 'Session format', type: '', items: [{ id: 101, name: 'Breakout Session', sort: 1 }] },
      { id: 2, title: 'Level', type: '', items: [{ id: 201, name: 'L100 (Beginner)', sort: 1 }] },
    ],
  };

  it('builds lookup maps correctly', () => {
    const maps = buildLookupMaps(payload);
    expect(maps.roomMap[301]).toBe('Room A');
    expect(maps.speakerMap['s1'].fullName).toBe('Speaker One');
    expect(maps.questionMap[401]).toBe('Nationality');
    expect(maps.categoryMap[101]).toBe('Breakout Session');
  });

  it('transforms raw to Session', () => {
    const maps = buildLookupMaps(payload);
    const session = toSession(payload.sessions[0], maps);
    expect(session.name).toBe('Test Session');
    expect(session.location).toBe('Room A');
    expect(session.duration).toBe(30);
    expect(session.speakers[0].name).toBe('Speaker One');
    expect(session.category).toBe('Breakout Session');
    expect(session.level).toBe('L100 (Beginner)');
  });

  it('parses sessions into RoomAgendaData', () => {
    const rooms = parseSessions(payload);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].location).toBe('Room A');
    expect(rooms[0].sessions[0].id).toBe('1');
  });
  it('parses from a JSON string input', () => {
    // Simulate raw JSON string as from Sessionize API
    const jsonString = JSON.stringify(payload);
    const parsed = JSON.parse(jsonString) as SessionizePayload;
    const rooms = parseSessions(parsed);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].location).toBe('Room A');
    expect(rooms[0].sessions[0].name).toBe('Test Session');
  });

  it('parses real Sessionize string payload', () => {
    const jsonString = fs.readFileSync(
      path.join(__dirname, 'resources', 'sessionize-sample-data.json'),
      'utf8'
    );
    const parsed = JSON.parse(jsonString) as SessionizePayload;

    const rooms = parseSessions(parsed);

    console.log(JSON.stringify(rooms, null, 2));

    expect(rooms.length).toBeGreaterThan(0);
    expect(rooms.some(r => r.location === 'Virtual stage')).toBe(true);

    const session = rooms.flatMap(r => r.sessions).find(s => s.id === '915715');
    expect(session).toBeDefined();
    expect(session!.name).toContain('Kubernetes Maturity Model');
    expect(session!.speakers.length).toBe(1);
    // ⚠️ Note: your sample only has "Adolfo Cabrera" with no matching session id, so expect may need adjusting
  });
});
