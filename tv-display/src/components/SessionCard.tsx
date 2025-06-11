import {
  Box,
  Container,
  Header,
  SpaceBetween,
  TextContent,
  StatusIndicator,
} from '@cloudscape-design/components';

interface Speaker {
  id: string;
  name: string;
  avatarUrl?: string;
  company?: string;
  bio?: string;
  nationality?: string;
  socialMedia?: {
    twitter?: string;
    linkedin?: string;
    company?: string;
  };
}

interface Session {
  id: string;
  name: string;
  description: string;
  extendedDescription?: string;
  speakers: Speaker[];
  time: string;
  dateStart: string;
  dateEnd: string;
  duration: number;
  location: string;
  nationality?: string;
  level?: string;
  language?: string;
  category?: string;
  capacity?: number;
  status: string;
  liveUrl?: string;
  recordingUrl?: string;
}

interface SessionCardProps {
  session: Session;
  isCurrent: boolean;
}

export function SessionCard({ session, isCurrent }: SessionCardProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusType = (status: string) => {
    switch (status.toLowerCase()) {
      case 'live':
        return 'success';
      case 'upcoming':
        return 'info';
      case 'completed':
        return 'stopped';
      default:
        return 'pending';
    }
  };

  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <StatusIndicator type={getStatusType(session.status)}>
              {session.status}
            </StatusIndicator>
          }
        >
          {session.name}
        </Header>
      }
    >
      <SpaceBetween size="m">
        <Box>
          <TextContent>
            <strong>Time:</strong> {formatTime(session.dateStart)} - {formatTime(session.dateEnd)}
          </TextContent>
          {session.description && (
            <TextContent>
              <strong>Description:</strong> {session.description}
            </TextContent>
          )}
          {session.level && (
            <TextContent>
              <strong>Level:</strong> {session.level}
            </TextContent>
          )}
          {session.language && (
            <TextContent>
              <strong>Language:</strong> {session.language}
            </TextContent>
          )}
        </Box>

        {session.speakers && session.speakers.length > 0 && (
          <Box>
            <Header variant="h3">Speakers</Header>
            <SpaceBetween size="s">
              {session.speakers.map(speaker => (
                <Box key={speaker.id}>
                  <TextContent>
                    <strong>{speaker.name}</strong>
                    {speaker.company && ` - ${speaker.company}`}
                  </TextContent>
                  {speaker.bio && (
                    <TextContent>
                      <small>{speaker.bio}</small>
                    </TextContent>
                  )}
                </Box>
              ))}
            </SpaceBetween>
          </Box>
        )}

        {isCurrent && session.liveUrl && (
          <Box>
            <TextContent>
              <a href={session.liveUrl} target="_blank" rel="noopener noreferrer">
                Watch Live Stream
              </a>
            </TextContent>
          </Box>
        )}
      </SpaceBetween>
    </Container>
  );
} 
