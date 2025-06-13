import { useState, useEffect } from 'react';
import { Session } from '@awscommunity/generated-ts';

// Display timing configuration (in milliseconds)
export const DISPLAY_TIMES = {
  CURRENT_SESSION: 15000,  // 15 seconds
  UPCOMING_SESSIONS: 20000, // 20 seconds
  SPONSOR_MEDIA: 20000,    // 20 seconds
  TRANSITION_DELAY: 500,   // 0.5 second transition
} as const;

export type DisplayMode = 'current' | 'upcoming' | 'sponsor';

export type DisplayState = {
  displayMode: DisplayMode;
  isTransitioning: boolean;
  currentTime: Date;
};

export function useDisplayRotation(
  currentSession: Session | null,
  upcomingSessions: Session[]
): DisplayState {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('current');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Display rotation logic
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let transitionTimeoutId: NodeJS.Timeout;

    const rotateDisplay = () => {
      setIsTransitioning(true);

      transitionTimeoutId = setTimeout(() => {
        setDisplayMode(current => {
          // Always rotate through all modes, regardless of session count
          if (current === 'current') {
            return 'upcoming'; // Always go to upcoming, even if empty
          } else if (current === 'upcoming') {
            return 'sponsor';
          } else {
            return 'current';
          }
        });
        setIsTransitioning(false);
      }, DISPLAY_TIMES.TRANSITION_DELAY);

      const nextDelay =
        displayMode === 'current'
          ? DISPLAY_TIMES.CURRENT_SESSION
          : displayMode === 'upcoming'
          ? DISPLAY_TIMES.UPCOMING_SESSIONS
          : DISPLAY_TIMES.SPONSOR_MEDIA;

      timeoutId = setTimeout(rotateDisplay, nextDelay);
    };

    // Always start rotation
    timeoutId = setTimeout(rotateDisplay, DISPLAY_TIMES.CURRENT_SESSION);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(transitionTimeoutId);
    };
  }, [currentSession, upcomingSessions, displayMode]);

  return {
    displayMode,
    isTransitioning,
    currentTime,
  };
} 