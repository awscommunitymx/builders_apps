import { Session, Speaker, RoomAgendaData, AgendaData } from '@awscommunity/generated-ts';

export interface SessionizePayload {
  sessions: any[];
  speakers: any[];
  rooms: any[];
  questions: any[];
  categories: any[];
}

export function buildLookupMaps(payload: SessionizePayload) {
  const speakerMap: Record<string, any> = Object.fromEntries(
    payload.speakers.map(s => [s.id, s])
  );
  const roomMap: Record<number, string> = Object.fromEntries(
    payload.rooms.map(r => [r.id, r.name])
  );
  const questionMap: Record<number, string> = Object.fromEntries(
    payload.questions.map(q => [q.id, q.question])
  );
  const categoryMap: Record<number, string> = {};
  payload.categories.forEach(cat => {
    cat.items.forEach((i: any) => {
      categoryMap[i.id] = i.name;
    });
  });
  return { speakerMap, roomMap, questionMap, categoryMap };
}

export function toSession(
  raw: any,
  maps: ReturnType<typeof buildLookupMaps>
): Session {
  const { speakerMap, roomMap, questionMap, categoryMap } = maps;

  // map speakers
  const speakers: Speaker[] = (raw.speakers || [])
    .map((id: string) => speakerMap[id])
    .filter(Boolean)
    .map((sp: any) => ({
      id: sp.id,
      name: sp.fullName,
      avatarUrl: sp.profilePicture || null,
      company: null,
      bio: sp.bio || null,
      nationality:
        sp.questionAnswers?.find(
          (qa: any) => questionMap[qa.questionId] === 'Nationality'
        )?.answerValue ?? null,
      socialMedia:
        sp.links?.reduce((acc: any, link: any) => {
          if (link.linkType === 'Twitter') acc.twitter = link.url;
          if (link.linkType === 'LinkedIn') acc.linkedin = link.url;
          return acc;
        }, {} as any) || null,
    }));

  // helper to pick category, level, language
  const pick = (pattern: string): string | null => {
    const ids: number[] = raw.categoryItems?.filter(
      (i: number) => categoryMap[i]?.includes(pattern)
    ) || [];
    return ids.map(i => categoryMap[i]).join(', ') || null;
  };

  return {
    id: raw.id,
    name: raw.title,
    description: raw.description || null,
    extendedDescription: raw.description || null,
    speakers,
    time: `${raw.startsAt.split('T')[1]} - ${raw.endsAt.split('T')[1]}`,
    dateStart: raw.startsAt,
    dateEnd: raw.endsAt,
    duration: (new Date(raw.endsAt).getTime() - new Date(raw.startsAt).getTime()) / 60000,
    location: roomMap[raw.roomId] || 'UNKNOWN',
    nationality: null,
    level: pick('L'),
    language: pick('English') || pick('Spanish'),
    category: pick('Breakout') || pick('Lightning') || null,
    capacity: null,
    status: raw.status,
    liveUrl: raw.liveUrl || null,
    recordingUrl: raw.recordingUrl || null,
  };
}

export function parseSessions(
  payload: SessionizePayload
): RoomAgendaData[] {
  const maps = buildLookupMaps(payload);
  const sessions = payload.sessions.map(raw => toSession(raw, maps));
  const byRoom: Record<string, Session[]> = {};
  sessions.forEach(sess => {
    const loc = sess.location || 'UNKNOWN';
    (byRoom[loc] ||= []).push(sess);
  });
  return Object.entries(byRoom).map(([location, sessions]) => ({
    location,
    sessions,
  }));
}

export function parseAgenda(payload: SessionizePayload): AgendaData {
  const maps = buildLookupMaps(payload);
  const sessions = payload.sessions.map(raw => toSession(raw, maps));
  return { sessions };
}
