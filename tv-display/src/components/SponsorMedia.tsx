import { useEffect, useState } from 'react';
import { Box, Container, Header } from '@cloudscape-design/components';

// This would typically come from your backend
const SPONSOR_MEDIA = [
  {
    id: '1',
    type: 'image',
    url: 'https://example.com/sponsor1.jpg',
    duration: 20, // seconds
  },
  {
    id: '2',
    type: 'video',
    url: 'https://example.com/sponsor2.mp4',
    duration: 30, // seconds
  },
  // Add more sponsor media as needed
];

export function SponsorMedia() {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SPONSOR_MEDIA[0].duration);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Move to next media item
          setCurrentMediaIndex(prevIndex => 
            (prevIndex + 1) % SPONSOR_MEDIA.length
          );
          return SPONSOR_MEDIA[(currentMediaIndex + 1) % SPONSOR_MEDIA.length].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentMediaIndex]);

  const currentMedia = SPONSOR_MEDIA[currentMediaIndex];

  return (
    <Container>
      <Box textAlign="center" padding="xxl">
        {currentMedia.type === 'image' ? (
          <img
            src={currentMedia.url}
            alt="Sponsor"
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              objectFit: 'contain',
            }}
          />
        ) : (
          <video
            src={currentMedia.url}
            autoPlay
            loop
            muted
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
            }}
          />
        )}
        {currentMedia.type === 'image' && (
          <Box margin={{ top: 'm' }}>
            <Header variant="h3">Next media in {timeLeft} seconds</Header>
          </Box>
        )}
      </Box>
    </Container>
  );
} 
