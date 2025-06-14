import { useState, useEffect } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Session } from '@awscommunity/generated-ts';

const GET_ROOM_AGENDA = gql`
  query GetRoomAgenda($location: String!) {
    getRoomAgenda(location: $location) {
      location
      sessions {
        id
        name
        description
        extendedDescription
        speakers {
          id
          name
          avatarUrl
          company
          bio
          nationality
          socialMedia {
            twitter
            linkedin
            company
          }
        }
        time
        dateStart
        dateEnd
        duration
        location
        nationality
        level
        language
        category
        capacity
        status
        liveUrl
        recordingUrl
      }
    }
  }
`;

export type AgendaDataState = {
  sessions: Session[];
  location: string;
  loading: boolean;
  error: Error | null | undefined;
  currentSession: Session | null;
};

export function useAgendaData(location: string): AgendaDataState {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  const { loading, error, data } = useQuery(GET_ROOM_AGENDA, {
    variables: { location },
    fetchPolicy: 'cache-and-network',
    skip: !location,
  });

  // Set sessions from query data
  useEffect(() => {
    if (data?.getRoomAgenda?.sessions) {
      setSessions(data.getRoomAgenda.sessions);
    }
  }, [data]);

  // Find current session based on time
  useEffect(() => {
    if (sessions.length === 0) {
      setCurrentSession(null);
      return;
    }

    const findCurrentSession = () => {
      const now = new Date();

      // Find session that is currently running
      const current = sessions.find((session) => {
        if (!session.dateStart || !session.dateEnd) return false;

        const startTime = new Date(session.dateStart);
        const endTime = new Date(session.dateEnd);

        return now >= startTime && now <= endTime;
      });

      if (current) {
        setCurrentSession((prevSession) => {
          if (prevSession?.id !== current.id) {
            console.log('Session changed:', {
              from: prevSession ? { id: prevSession.id, name: prevSession.name } : 'none',
              to: { id: current.id, name: current.name },
            });
          }
          return current;
        });
        return;
      }

      // If no current session, find the most recent past session
      const pastSessions = sessions
        .filter((session) => {
          if (!session.dateEnd) return false;
          const endTime = new Date(session.dateEnd);
          return endTime < now;
        })
        .sort((a, b) => {
          const aEnd = new Date(a.dateEnd!);
          const bEnd = new Date(b.dateEnd!);
          return bEnd.getTime() - aEnd.getTime(); // Sort in descending order (most recent first)
        });

      const mostRecentPast = pastSessions[0] || null;
      setCurrentSession((prevSession) => {
        if (prevSession?.id !== mostRecentPast?.id) {
          console.log('Session changed:', {
            from: prevSession ? { id: prevSession.id, name: prevSession.name } : 'none',
            to: mostRecentPast ? { id: mostRecentPast.id, name: mostRecentPast.name } : 'none',
          });
        }
        return mostRecentPast;
      });
    };

    // Initial check
    findCurrentSession();

    // Set up interval to check every minute
    const intervalId = setInterval(findCurrentSession, 60000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [sessions]);

  return {
    sessions,
    location: data?.getRoomAgenda?.location || location,
    loading,
    error,
    currentSession,
  };
}
