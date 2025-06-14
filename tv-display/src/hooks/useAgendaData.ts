import { useState, useEffect } from 'react';
import { useQuery, useSubscription, gql } from '@apollo/client';
import { RoomAgendaData, Session } from '@awscommunity/generated-ts';

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

// Mock data for testing environment
const mockAgendaData: RoomAgendaData = {
  location: 'El Gorrito',
  sessions: [
    {
      id: '925338',
      name: 'Leading through change, leveraging the cloud for business acceleration',
      description:
        'The substance will be a focus on how cloud technologists and technologies can support not just digital transformation, but also business acceleration, especially in light of the unprecedented pace of technical advancement.',
      extendedDescription:
        'The substance will be a focus on how cloud technologists and technologies can support not just digital transformation, but also business acceleration, especially in light of the unprecedented pace of technical advancement.',
      speakers: [
        {
          id: 'e9fa97d0-8aba-484c-9fe4-77fd5924bd10',
          name: 'Robert Wenier',
          avatarUrl: 'https://sessionize.com/image/5f4d-400o400o1-KJL3APxfuQz3C9mSrx34yL.jpg',
          company: 'Global Head of Cloud & Infrastructure',
          bio: 'biography',
          nationality: 'USA',
          socialMedia: undefined,
        },
      ],
      time: '22:36 - 22:40',
      dateStart: '2025-06-12T22:36:00',
      dateEnd: '2025-06-12T22:40:00',
      duration: 30,
      location: 'El Gorrito',
      nationality: 'USA',
      level: 'L100',
      language: 'English',
      category: 'Breakout Session',
      capacity: 120,
      status: 'Accepted',
      liveUrl: undefined,
      recordingUrl: undefined,
    },
    {
      id: '925340',
      name: 'Microservices Architecture Best Practices',
      description:
        'Learn the essential patterns and practices for building scalable microservices.',
      speakers: [
        {
          name: 'Michael Rodriguez',
          company: 'Cloud Solutions Ltd',
          avatarUrl: '/placeholder.svg?height=100&width=100',
        },
      ],
      time: '22:40 - 22:50',
      dateStart: '2025-06-12T22:40:00',
      dateEnd: '2025-06-12T22:50:00',
      duration: 45,
      location: 'El Gorrito',
      level: 'L300',
      language: 'English',
      category: 'Technical Session',
      capacity: 120,
    },
  ],
};

export type AgendaDataState = {
  sessions: Session[];
  location: string;
  loading: boolean;
  error: Error | null | undefined;
};

export function useAgendaData(location: string): AgendaDataState {
  const [sessions, setSessions] = useState<Session[]>([]);
  const isTesting = process.env.NODE_ENV === 'test';

  const { loading, error, data, refetch } = useQuery(GET_ROOM_AGENDA, {
    variables: { location },
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-only',
    skip: isTesting,
  });

  const { data: subscriptionData } = useSubscription(ON_ROOM_AGENDA_UPDATE, {
    variables: { location },
    skip: isTesting,
    onSubscriptionComplete: () => {
      if (!isTesting) {
        refetch();
      }
    },
  });

  // Set sessions from initial query or mock data
  useEffect(() => {
    if (isTesting) {
      setSessions(mockAgendaData.sessions);
    } else if (data?.getRoomAgenda?.sessions) {
      setSessions(data.getRoomAgenda.sessions);
    }
  }, [data, isTesting]);

  // Set sessions from subscription
  useEffect(() => {
    if (!isTesting && subscriptionData?.onRoomAgendaUpdate?.sessions) {
      setSessions(subscriptionData.onRoomAgendaUpdate.sessions);
    }
  }, [subscriptionData, isTesting]);

  return {
    sessions,
    location: isTesting ? mockAgendaData.location : data?.getRoomAgenda?.location || location,
    loading: isTesting ? false : loading,
    error: isTesting ? null : error,
  };
}
