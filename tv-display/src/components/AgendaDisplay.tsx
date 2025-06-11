import { useEffect, useState } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { gql } from '@apollo/client';
import {
  Box,
  Container,
  Grid,
  Header,
  SpaceBetween,
  Spinner,
  TextContent,
} from '@cloudscape-design/components';
import { SessionCard } from './SessionCard';
import { SponsorMedia } from './SponsorMedia';

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

const ON_ROOM_AGENDA_UPDATE = gql`
  subscription OnRoomAgendaUpdate($location: String!) {
    onRoomAgendaUpdate(location: $location) {
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

// Display timing configuration (in milliseconds)
const DISPLAY_TIMES = {
  CURRENT_SESSION: 5000,  // 30 seconds
  UPCOMING_SESSIONS: 5000, // 20 seconds
  SPONSOR_MEDIA: 15000,    // 15 seconds
  TRANSITION_DELAY: 1000,  // 1 second transition
};

type DisplayMode = 'current' | 'upcoming' | 'sponsor';

interface AgendaDisplayProps {
  location: string;
}

export function AgendaDisplay({ location }: AgendaDisplayProps) {
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('current');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Initial query to get the agenda
  const { loading, error, data } = useQuery(GET_ROOM_AGENDA, {
    variables: { location },
    fetchPolicy: 'network-only',
  });

  // Subscribe to updates
  const { data: subscriptionData } = useSubscription(ON_ROOM_AGENDA_UPDATE, {
    variables: { location },
  });

  useEffect(() => {
    if (data?.getRoomAgenda?.sessions) {
      updateSessions(data.getRoomAgenda.sessions);
    }
  }, [data]);

  useEffect(() => {
    if (subscriptionData?.onRoomAgendaUpdate?.sessions) {
      updateSessions(subscriptionData.onRoomAgendaUpdate.sessions);
    }
  }, [subscriptionData]);

  // Handle display rotation
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let transitionTimeoutId: NodeJS.Timeout;

    const rotateDisplay = () => {
      // Start transition
      setIsTransitioning(true);
      
      // After transition delay, change the display mode
      transitionTimeoutId = setTimeout(() => {
        setDisplayMode(current => {
          if (current === 'current' && upcomingSessions.length > 0) {
            return 'upcoming';
          } else if (current === 'upcoming') {
            return 'sponsor';
          } else {
            return 'current';
          }
        });
        setIsTransitioning(false);
      }, DISPLAY_TIMES.TRANSITION_DELAY);

      // Schedule next rotation
      const nextDelay = displayMode === 'current' 
        ? DISPLAY_TIMES.CURRENT_SESSION 
        : displayMode === 'upcoming' 
          ? DISPLAY_TIMES.UPCOMING_SESSIONS 
          : DISPLAY_TIMES.SPONSOR_MEDIA;

      timeoutId = setTimeout(rotateDisplay, nextDelay);
    };

    // Start rotation if we have content to show
    if (currentSession || upcomingSessions.length > 0) {
      timeoutId = setTimeout(rotateDisplay, DISPLAY_TIMES.CURRENT_SESSION);
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(transitionTimeoutId);
    };
  }, [currentSession, upcomingSessions, displayMode]);

  const updateSessions = (sessions: any[]) => {
    const now = new Date();
    
    // Create a copy of the array before sorting to avoid mutating the frozen array
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
    );

    // Find current session
    const current = sortedSessions.find(session => {
      const start = new Date(session.dateStart);
      const end = new Date(session.dateEnd);
      return now >= start && now <= end;
    });

    // Find upcoming sessions (sessions that start after the current session ends)
    const currentEndTime = current ? new Date(current.dateEnd) : now;
    const upcoming = sortedSessions.filter(session => {
      const start = new Date(session.dateStart);
      return start > currentEndTime;
    });

    setCurrentSession(current);
    setUpcomingSessions(upcoming);
  };

  if (loading) {
    return (
      <Box textAlign="center" padding="xxl">
        <Spinner size="large" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" padding="xxl">
        <TextContent>Error loading agenda: {error.message}</TextContent>
      </Box>
    );
  }

  const renderContent = () => {
    if (isTransitioning) {
      return (
        <Box textAlign="center" padding="xxl">
          <Spinner size="large" />
        </Box>
      );
    }

    switch (displayMode) {
      case 'current':
        return currentSession ? (
          <Container>
            <Header variant="h1">Current Session</Header>
            <SessionCard session={currentSession} isCurrent={true} />
          </Container>
        ) : null;
      
      case 'upcoming':
        return upcomingSessions.length > 0 ? (
          <Container>
            <Header variant="h1">Upcoming Sessions</Header>
            <Grid gridDefinition={[
              { colspan: 3 }, 
              { colspan: 3 }, 
              { colspan: 3 }, 
              { colspan: 3 }
            ]}>
              {upcomingSessions.map(session => (
                <SessionCard key={session.id} session={session} isCurrent={false} />
              ))}
            </Grid>
          </Container>
        ) : null;
      
      case 'sponsor':
        return <SponsorMedia />;
    }
  };

  return (
    <SpaceBetween size="l">
      {renderContent()}
    </SpaceBetween>
  );
}
