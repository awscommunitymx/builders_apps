import {
  Session,
  Speaker,
  SocialMedia,
  RoomAgendaData,
  AgendaData,
} from '@awscommunity/generated-ts';

// Sessionize API payload interfaces
export interface SessionizePayload {
  sessions: SessionizeSession[];
  speakers: SessionizeSpeaker[];
  rooms: SessionizeRoom[];
  questions: SessionizeQuestion[];
  categories: SessionizeCategory[];
}

interface SessionizeSession {
  id: string;
  title: string;
  description?: string;
  extendedDescription?: string;
  startsAt: string;
  endsAt: string;
  isServiceSession: boolean;
  isPlenumSession?: boolean;
  speakers: string[];
  categoryItems: number[];
  roomId: number;
  liveUrl?: string;
  recordingUrl?: string;
  status: string;
}

interface SessionizeSpeaker {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  bio?: string;
  tagLine?: string;
  profilePicture?: string;
  links?: SessionizeLink[];
  sessions?: string[];
  isTopSpeaker: boolean;
  questionAnswers?: SessionizeQuestionAnswer[];
}

interface SessionizeLink {
  title: string;
  url: string;
  linkType: string;
}

interface SessionizeQuestionAnswer {
  questionId: number;
  answerValue: string;
}

interface SessionizeRoom {
  id: number;
  name: string;
  capacity?: number;
}

interface SessionizeQuestion {
  id: number;
  question: string;
  questionType: string;
  sort: number;
}

interface SessionizeCategory {
  id: number;
  title: string;
  items: SessionizeCategoryItem[];
  sort: number;
}

interface SessionizeCategoryItem {
  id: number;
  name: string;
  sort: number;
}

// Lookup maps for efficient data retrieval
interface LookupMaps {
  speakerMap: Record<string, SessionizeSpeaker>;
  roomMap: Record<string, string>;
  questionMap: Record<string, string>;
  categoryMap: {
    format: Record<number, string>;
    level: Record<number, string>;
    language: Record<number, string>;
  };
}

// Constants for filtering
const NATIONALITY_QUESTION_ID = 100798;
const EXCLUDED_ROOM_KEYWORDS = ['virtual stage'];
const EXCLUDED_TITLE_KEYWORDS = ['CAPITAL ONE'];
const EXCLUDED_SESSION_IDS = ['935400'];

// Level translation map
const LEVEL_TRANSLATIONS: Record<string, string> = {
  'L100 (Beginner)': 'Principiante',
  'L200 (Intermediate)': 'Intermedio',
  'L300 (Advanced)': 'Avanzado',
  'L400 (Expert)': 'Experto',
};

// Room capacity estimates
const ROOM_CAPACITY_MAP: Record<string, number> = {
  corona: 200,
  mundo: 180,
  sol: 150,
  gorrito: 120,
};

/**
 * Builds lookup maps for efficient data retrieval
 */
export function buildLookupMaps(payload: SessionizePayload): LookupMaps {
  // Build speaker map
  const speakerMap: Record<string, SessionizeSpeaker> = {};
  payload.speakers.forEach(speaker => {
    speakerMap[speaker.id] = speaker;
  });

  // Build room map
  const roomMap: Record<string, string> = {};
  payload.rooms.forEach(room => {
    roomMap[room.id.toString()] = room.name;
  });

  // Build question map
  const questionMap: Record<string, string> = {};
  payload.questions.forEach(question => {
    questionMap[question.id.toString()] = question.question;
  });

  // Build category maps
  const categoryMap = {
    format: {} as Record<number, string>,
    level: {} as Record<number, string>,
    language: {} as Record<number, string>,
  };

  payload.categories.forEach(category => {
    switch (category.title) {
      case 'Session format':
        category.items.forEach(item => {
          categoryMap.format[item.id] = item.name;
        });
        break;
      case 'Level':
        category.items.forEach(item => {
          categoryMap.level[item.id] = item.name;
        });
        break;
      case 'Language':
        category.items.forEach(item => {
          categoryMap.language[item.id] = item.name;
        });
        break;
    }
  });

  return { speakerMap, roomMap, questionMap, categoryMap };
}

/**
 * Transforms a SessionizeSpeaker to a Speaker
 */
function transformSpeaker(
  speakerId: string,
  speakerMap: Record<string, SessionizeSpeaker>
): Speaker | null {
  const speaker = speakerMap[speakerId];
  if (!speaker) return null;

  // Extract social media links
  const socialMedia: SocialMedia = {};
  if (speaker.links && Array.isArray(speaker.links)) {
    speaker.links.forEach(link => {
      switch (link.linkType) {
        case 'LinkedIn':
          socialMedia.linkedin = link.url;
          break;
        case 'Twitter':
          socialMedia.twitter = link.url;
          break;
        case 'Company_Website':
          socialMedia.company = link.url;
          break;
      }
    });
  }

  // Extract nationality
  let nationality: string | null = null;
  if (speaker.questionAnswers) {
    const nationalityAnswer = speaker.questionAnswers.find(
      qa => qa.questionId === NATIONALITY_QUESTION_ID
    );
    if (nationalityAnswer) {
      nationality = nationalityAnswer.answerValue;
      // If nationality contains a slash, take only the first part
      if (nationality && nationality.includes('/')) {
        nationality = nationality.split('/')[0].trim();
      }
    }
  }

  return {
    id: speaker.id,
    name: speaker.fullName || `${speaker.firstName} ${speaker.lastName}`.trim(),
    avatarUrl: speaker.profilePicture || null,
    company: speaker.tagLine || null,
    bio: speaker.bio || null,
    nationality,
    socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : null,
  };
}

/**
 * Extracts category information from a session
 */
function extractCategoryInfo(
  categoryItems: number[],
  categoryMap: LookupMaps['categoryMap']
): {
  level: string;
  language: string;
  category: string;
} {
  let level = 'Intermedio'; // Default
  let language = 'Spanish'; // Default
  let category = 'Breakout Session'; // Default

  categoryItems.forEach(categoryId => {
    // Check for level
    if (categoryMap.level[categoryId]) {
      const levelName = categoryMap.level[categoryId];
      level = LEVEL_TRANSLATIONS[levelName] || levelName;
    }

    // Check for format (category)
    if (categoryMap.format[categoryId]) {
      const formatName = categoryMap.format[categoryId];
      // Remove time information (e.g., "(30 min)")
      const formatNameClean = formatName.split('(')[0].trim();
      // Capitalize each word
      category = formatNameClean
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // Check for language
    if (categoryMap.language[categoryId]) {
      language = categoryMap.language[categoryId];
    }
  });

  return { level, language, category };
}

/**
 * Estimates room capacity based on room name
 */
function estimateCapacity(roomName: string): number {
  const lowerRoomName = roomName.toLowerCase();
  
  for (const [keyword, capacity] of Object.entries(ROOM_CAPACITY_MAP)) {
    if (lowerRoomName.includes(keyword)) {
      return capacity;
    }
  }
  
  return 100; // Default capacity
}

/**
 * Formats time from ISO string to HH:MM format
 */
function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculates duration in minutes between two ISO date strings
 */
function calculateDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

/**
 * Determines if a session should be filtered out
 */
function shouldFilterSession(
  session: SessionizeSession,
  roomMap: Record<string, string>
): boolean {
  // Filter service sessions
  if (session.isServiceSession) return true;

  // Filter excluded session IDs
  if (EXCLUDED_SESSION_IDS.includes(session.id)) return true;

  // Filter sessions with excluded keywords in title
  const title = session.title || '';
  if (EXCLUDED_TITLE_KEYWORDS.some(keyword => title.includes(keyword))) {
    return true;
  }

  // Filter sessions in excluded rooms
  const roomName = roomMap[session.roomId?.toString()] || '';
  if (EXCLUDED_ROOM_KEYWORDS.some(keyword => 
    roomName.toLowerCase().includes(keyword)
  )) {
    return true;
  }

  return false;
}

/**
 * Transforms a SessionizeSession to a Session
 */
export function toSession(
  rawSession: SessionizeSession,
  maps: LookupMaps
): Session {
  const { speakerMap, roomMap, categoryMap } = maps;

  // Transform speakers
  const speakers: Speaker[] = rawSession.speakers
    .map(speakerId => transformSpeaker(speakerId, speakerMap))
    .filter((speaker): speaker is Speaker => speaker !== null);

  // Extract category information
  const { level, language, category } = extractCategoryInfo(
    rawSession.categoryItems || [],
    categoryMap
  );

  // Get room information
  const location = roomMap[rawSession.roomId?.toString()] || 'UNKNOWN';

  // Format time
  const timeStart = formatTime(rawSession.startsAt);
  const timeEnd = formatTime(rawSession.endsAt);
  const time = `${timeStart} - ${timeEnd}`;

  // Calculate duration
  const duration = calculateDuration(rawSession.startsAt, rawSession.endsAt);

  // Get nationality from first speaker (for backward compatibility)
  const nationality = speakers.length > 0 ? speakers[0].nationality : null;

  // Estimate capacity
  const capacity = estimateCapacity(location);

  return {
    id: rawSession.id,
    name: rawSession.title || null,
    description: rawSession.description || null,
    extendedDescription: rawSession.extendedDescription || rawSession.description || null,
    speakers,
    time,
    dateStart: rawSession.startsAt,
    dateEnd: rawSession.endsAt,
    duration,
    location,
    nationality,
    level,
    language,
    category,
    capacity,
    status: rawSession.status || null,
    liveUrl: rawSession.liveUrl || null,
    recordingUrl: rawSession.recordingUrl || null,
  };
}

/**
 * Parses sessions grouped by room
 */
export function parseSessions(payload: SessionizePayload): RoomAgendaData[] {
  const maps = buildLookupMaps(payload);
  
  // Filter and transform sessions
  const sessions = payload.sessions
    .filter(session => !shouldFilterSession(session, maps.roomMap))
    .map(session => toSession(session, maps));

  // Group sessions by location
  const sessionsByRoom: Record<string, Session[]> = {};
  
  sessions.forEach(session => {
    const location = session.location || 'UNKNOWN';
    if (!sessionsByRoom[location]) {
      sessionsByRoom[location] = [];
    }
    sessionsByRoom[location].push(session);
  });

  // Convert to RoomAgendaData array
  return Object.entries(sessionsByRoom).map(([location, sessions]) => ({
    location,
    sessions,
  }));
}

/**
 * Parses all sessions into AgendaData format
 */
export function parseAgenda(payload: SessionizePayload): AgendaData {
  const maps = buildLookupMaps(payload);
  
  // Filter and transform sessions
  const sessions = payload.sessions
    .filter(session => !shouldFilterSession(session, maps.roomMap))
    .map(session => toSession(session, maps));

  return {
    sessions,
  };
}
