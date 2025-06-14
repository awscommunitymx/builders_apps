import { useRef, useEffect, useMemo, useState } from 'react';
import { gsap } from 'gsap';
import { Clock, MapPin, Users } from 'lucide-react';
import { Speaker } from '@awscommunity/generated-ts';
import { useAgendaDisplay } from '@/hooks/useAgendaDisplay';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { useParams } from 'react-router-dom';

interface TVAgendaDisplayProps {
  sponsorIndex: number;
  onSponsorIndexChange: (index: number) => void;
}

// Register the ScrollToPlugin
gsap.registerPlugin(ScrollToPlugin);

const DISPLAY_TIMES = {
  CURRENT_SESSION: 10000, // 15 seconds
  UPCOMING_SESSIONS: 20000, // 20 seconds
  SPONSOR_MEDIA: 20000, // 20 seconds
  TRANSITION_DELAY: 500, // 0.5 second transition
} as const;

type DisplayMode = 'current' | 'upcoming' | 'sponsor';

// Sponsor content
const sponsorContent = [
  {
    type: 'video',
    url: '/epam.mp4?height=600&width=800',
    duration: 20000,
    title: 'Epam',
  },
  {
    type: 'image',
    url: '/zillow.png?height=200&width=400',
    duration: 20000,
    title: 'Zillow',
  },
  {
    type: 'video',
    url: '/wizeline.mp4?height=600&width=800',
    duration: 20000,
    title: 'Wizeline',
  },
  {
    type: 'image',
    url: '/uala.png?height=600&width=800',
    duration: 20000,
    title: 'Ualá',
  },
  {
    type: 'image',
    url: '/softserve.png?height=600&width=800',
    duration: 20000,
    title: 'Softserve',
  },
  {
    type: 'video',
    url: '/nu.mp4?height=600&width=800',
    duration: 20000,
    title: 'nu',
  },
  {
    type: 'image',
    url: '/ibm.png?height=600&width=800',
    duration: 20000,
    title: 'IBM',
  },
  {
    type: 'image',
    url: '/grafana.png?height=600&width=800',
    duration: 20000,
    title: 'Grafana',
  },
  {
    type: 'image',
    url: '/globant.png?height=600&width=800',
    duration: 20000,
    title: 'Globant',
  },
  {
    type: 'video',
    url: '/doit.mp4?height=600&width=800',
    duration: 20000,
    title: 'Doit',
  },
  {
    type: 'image',
    url: '/collectors.png?height=600&width=800',
    duration: 20000,
    title: 'Collectors',
  },
  {
    type: 'video',
    url: '/caylent.mp4?height=600&width=800',
    duration: 20000,
    title: 'Caylent',
  },
  {
    type: 'image',
    url: '/capitalone.png?height=600&width=800',
    duration: 20000,
    title: 'Capital One',
  },
  {
    type: 'image',
    url: '/AZ.png?height=600&width=800',
    duration: 20000,
    title: 'Astra Zeneca',
  },
];

// Helper function to convert URL location to display location
const formatLocation = (location: string): string => {
  // Convert kebab-case to Title Case with spaces
  return location
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function TVAgendaDisplay({ sponsorIndex, onSponsorIndexChange }: TVAgendaDisplayProps) {
  const { location: locationParam } = useParams<{ location: string }>();
  const location = locationParam ? formatLocation(locationParam) : 'La Corona';

  const { loading, error, sessions, location: actualLocation } = useAgendaDisplay(location);

  // Local display rotation state
  const [displayMode, setDisplayMode] = useState<DisplayMode>('current');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Timer for current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // State for fullscreen video display
  const [isFullscreenVideo, setIsFullscreenVideo] = useState(false);

  // Display rotation logic
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let transitionTimeoutId: NodeJS.Timeout;

    const rotateDisplay = () => {
      setIsTransitioning(true);
      transitionTimeoutId = setTimeout(() => {
        setDisplayMode((current) => {
          if (current === 'current') {
            return 'upcoming';
          } else if (current === 'upcoming') {
            // Increment sponsor index when entering sponsor mode
            onSponsorIndexChange((sponsorIndex + 1) % sponsorContent.length);
            return 'sponsor';
          } else {
            return 'current';
          }
        });
        setIsTransitioning(false);
      }, DISPLAY_TIMES.TRANSITION_DELAY);

      // Only set timeout for non-video content or when not in sponsor mode
      const nextDelay =
        displayMode === 'current'
          ? DISPLAY_TIMES.CURRENT_SESSION
          : displayMode === 'upcoming'
            ? DISPLAY_TIMES.UPCOMING_SESSIONS
            : DISPLAY_TIMES.SPONSOR_MEDIA;

      console.log(
        'Display mode:',
        displayMode,
        'Sponsor type:',
        displayMode === 'sponsor' ? sponsorContent[sponsorIndex]?.type : 'N/A'
      );

      // DON'T set timeout if we're about to show a video sponsor - let the video control the timing
      const nextSponsorIndex = (sponsorIndex + 1) % sponsorContent.length;
      const willShowVideoSponsor =
        displayMode === 'upcoming' && sponsorContent[nextSponsorIndex]?.type === 'video';
      const isCurrentVideoSponsor =
        displayMode === 'sponsor' && sponsorContent[sponsorIndex]?.type === 'video';

      if (!isCurrentVideoSponsor && !willShowVideoSponsor) {
        timeoutId = setTimeout(rotateDisplay, nextDelay);
      }
    };

    // Only start rotation if not currently showing a video sponsor
    const isCurrentlyVideoSponsor =
      displayMode === 'sponsor' && sponsorContent[sponsorIndex]?.type === 'video';
    if (!isCurrentlyVideoSponsor) {
      const initialDelay =
        displayMode === 'current'
          ? DISPLAY_TIMES.CURRENT_SESSION
          : displayMode === 'upcoming'
            ? DISPLAY_TIMES.UPCOMING_SESSIONS
            : DISPLAY_TIMES.SPONSOR_MEDIA;

      timeoutId = setTimeout(rotateDisplay, initialDelay);
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(transitionTimeoutId);
    };
  }, [displayMode, sponsorIndex, onSponsorIndexChange]);

  // Separate effect to handle fullscreen video mode
  useEffect(() => {
    if (displayMode === 'sponsor' && sponsorContent[sponsorIndex]?.type === 'video') {
      console.log('Activating fullscreen for video:', sponsorContent[sponsorIndex].title);
      setIsFullscreenVideo(true);
    } else {
      setIsFullscreenVideo(false);
    }
  }, [displayMode, sponsorIndex]);

  // Handle video end event - this is the ONLY way videos should end
  const handleVideoEnd = () => {
    console.log('Video ended:', sponsorContent[sponsorIndex].title);
    setIsFullscreenVideo(false);

    // Trigger the next rotation after video ends
    setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setDisplayMode('current');
        setIsTransitioning(false);
      }, DISPLAY_TIMES.TRANSITION_DELAY);
    }, 100);
  };

  // Derive currentSession and upcomingSessions from sessions and currentTime
  const { currentSession, upcomingSessions } = useMemo(() => {
    const now = currentTime;
    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
    );
    const current = sortedSessions.find((session) => {
      const start = new Date(session.dateStart);
      const end = new Date(session.dateEnd);
      return now >= start && now <= end;
    });
    const currentEndTime = current ? new Date(current.dateEnd) : now;
    const upcoming = sortedSessions
      .filter((session) => {
        const start = new Date(session.dateStart);
        // Include sessions that start at the same time as the current session ends
        return start >= currentEndTime;
      })
      .slice(0, 3);
    return { currentSession: current || null, upcomingSessions: upcoming };
  }, [sessions, currentTime]);

  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const upcomingSessionsRef = useRef<HTMLDivElement>(null);
  const currentSessionRef = useRef<HTMLDivElement>(null);
  const scrollAnimationRef = useRef<gsap.core.Tween | null>(null);
  const currentSessionScrollRef = useRef<gsap.core.Tween | null>(null);

  // GSAP animation for transitions
  useEffect(() => {
    if (isTransitioning && contentRef.current) {
      gsap.to(contentRef.current, {
        opacity: 0,
        y: 50,
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: () => {
          gsap.fromTo(
            contentRef.current,
            { opacity: 0, y: -50 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' }
          );
        },
      });
    }
  }, [isTransitioning, displayMode]);

  // Scroll animation for current session
  useEffect(() => {
    // Clean up any existing animation when display mode changes
    if (currentSessionScrollRef.current) {
      currentSessionScrollRef.current.kill();
      currentSessionScrollRef.current = null;
    }

    // Start scroll animation when in current mode
    if (displayMode === 'current' && currentSessionRef.current) {
      const container = currentSessionRef.current;
      const content = container.firstElementChild as HTMLElement;

      if (content) {
        // Reset scroll position
        gsap.set(content, { y: 0 });

        // Calculate the total scroll distance
        const scrollDistance = content.scrollHeight - container.clientHeight;

        // Only animate if there's content to scroll
        if (scrollDistance > 0) {
          // Create a smooth scroll animation with yoyo effect
          currentSessionScrollRef.current = gsap.to(content, {
            y: -scrollDistance,
            duration: DISPLAY_TIMES.CURRENT_SESSION / 2000,
            ease: 'power1.inOut',
            repeat: -1,
            yoyo: true,
            onRepeat: () => {
              // Add a small pause at the top and bottom
              gsap.delayedCall(1, () => {
                gsap.to(content, {
                  y: 0,
                  duration: DISPLAY_TIMES.CURRENT_SESSION / 2000,
                  ease: 'power1.inOut',
                  onComplete: () => {
                    gsap.delayedCall(1, () => {
                      gsap.to(content, {
                        y: -scrollDistance,
                        duration: DISPLAY_TIMES.CURRENT_SESSION / 2000,
                        ease: 'power1.inOut',
                      });
                    });
                  },
                });
              });
            },
          });
        }
      }
    }

    // Cleanup function
    return () => {
      if (currentSessionScrollRef.current) {
        currentSessionScrollRef.current.kill();
        currentSessionScrollRef.current = null;
      }
    };
  }, [displayMode, currentSession]); // Added currentSession as dependency

  useEffect(() => {
    // Clean up any existing animation when display mode changes
    if (scrollAnimationRef.current) {
      scrollAnimationRef.current.kill();
      scrollAnimationRef.current = null;
    }

    // Start scroll animation when in upcoming mode
    if (displayMode === 'upcoming' && upcomingSessionsRef.current) {
      const container = upcomingSessionsRef.current;
      const content = container.firstElementChild as HTMLElement;

      if (content) {
        // Reset scroll position
        container.scrollTop = 0;

        // Calculate the total scroll distance
        const scrollDistance = content.scrollHeight - container.clientHeight;

        // Only animate if there's content to scroll
        if (scrollDistance > 0) {
          // Create a smooth scroll animation
          scrollAnimationRef.current = gsap.to(container, {
            scrollTo: {
              y: scrollDistance,
              autoKill: false,
            },
            duration: DISPLAY_TIMES.UPCOMING_SESSIONS / 1000, // Convert ms to seconds
            ease: 'none', // Linear scrolling
            repeat: -1, // Infinite repeat
            yoyo: true, // Reverse the animation
            onRepeat: () => {
              // Reset to top when done
              container.scrollTop = 0;
            },
          });
        }
      }
    }

    // Cleanup function
    return () => {
      if (scrollAnimationRef.current) {
        scrollAnimationRef.current.kill();
        scrollAnimationRef.current = null;
      }
    };
  }, [displayMode]); // Only depend on displayMode, not upcomingSessions

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderContent = () => {
    if (isTransitioning) {
      return (
        <div className="h-full flex items-center justify-center bg-blue-cd-200 relative">
          <div className="absolute inset-0 bg-[url('/Pattern.svg')] opacity-10"></div>
          <div className="animate-pulse relative z-10">
            <div className="w-16 h-16 border-4 border-purple-cd-100 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      );
    }

    switch (displayMode) {
      case 'current':
        return (
          <div className="h-full flex flex-col bg-blue-cd-200 relative">
            <div className="absolute inset-0 bg-[url('/Pattern.svg')] opacity-10"></div>
            {/* Header */}
            <div className="bg-blue-cd-200/60 backdrop-blur-xl border-b border-purple-cd-100/20 p-8 text-white relative z-10">
              <div className="flex items-center justify-between mb-6">
                <img src="/logo.svg" alt="Logo" className="h-12 w-auto" />
                <div className="flex items-center gap-4">
                  <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-purple-cd-100 to-pink-cd-100 bg-clip-text text-transparent">
                    CURRENT SESSION
                  </h1>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-mono font-bold text-purple-cd-100">
                    {formatTime(currentTime)}
                  </div>
                  <div className="text-3xl font-bold text-purple-cd-100/80">
                    {formatDate(currentTime)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-2xl font-bold">
                <div className="flex items-center gap-3 text-purple-cd-100">
                  <MapPin className="w-6 h-6 text-purple-cd-100" />
                  <span>{actualLocation}</span>
                </div>
              </div>
            </div>

            {/* Current Session Content */}
            <div className="flex-1 p-8 relative z-10">
              {currentSession ? (
                <div ref={currentSessionRef} className="h-full overflow-hidden relative">
                  <div className="absolute w-full">
                    <div className="max-w-5xl mx-auto bg-blue-cd-200/60 backdrop-blur-xl border border-purple-cd-100/20 rounded-lg p-8">
                      <h2 className="text-4xl font-display font-bold mb-6 bg-gradient-to-r from-purple-cd-100 to-pink-cd-100 bg-clip-text text-transparent">
                        {currentSession.name}
                      </h2>
                      <p className="text-2xl text-white/80 mb-10">{currentSession.description}</p>

                      {/* Session Details with Badges */}
                      <div className="flex flex-wrap items-center gap-4 mb-10">
                        <div className="flex items-center gap-3 text-white">
                          <Clock className="w-6 h-6" />
                          <span className="text-xl">
                            {formatTime(new Date(currentSession.dateStart))} -{' '}
                            {formatTime(new Date(currentSession.dateEnd))}
                          </span>
                        </div>
                        {currentSession.location && (
                          <div className="bg-purple-cd-100/10 text-white px-4 py-2 rounded-full text-xl border border-purple-cd-100/20 flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            {currentSession.location}
                          </div>
                        )}
                        {currentSession.level && (
                          <div className="bg-purple-cd-100/10 text-white px-4 py-2 rounded-full text-xl border border-purple-cd-100/20">
                            {currentSession.level}
                          </div>
                        )}
                        {currentSession.language && (
                          <div className="bg-purple-cd-100/10 text-white px-4 py-2 rounded-full text-xl border border-purple-cd-100/20">
                            {currentSession.language}
                          </div>
                        )}
                        {currentSession.category && (
                          <div className="bg-purple-cd-100/10 text-white px-4 py-2 rounded-full text-xl border border-purple-cd-100/20">
                            {currentSession.category}
                          </div>
                        )}
                      </div>

                      {/* Speakers */}
                      {currentSession.speakers && currentSession.speakers.length > 0 && (
                        <div className="mb-12">
                          <h3 className="text-3xl font-display font-semibold mb-6 flex items-center gap-3 text-purple-cd-100">
                            <Users className="w-7 h-7" />
                            Speakers
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {currentSession.speakers
                              ?.filter(
                                (speaker: Speaker | null): speaker is Speaker => speaker !== null
                              )
                              .map((speaker: Speaker, index: number) => (
                                <div
                                  key={speaker.id || index}
                                  className="flex items-center gap-6 p-6 bg-purple-cd-200/30 backdrop-blur-sm rounded-lg border border-purple-cd-100/20"
                                >
                                  <img
                                    src={
                                      speaker.avatarUrl || '/placeholder.svg?height=100&width=100'
                                    }
                                    alt={speaker.name}
                                    className="w-16 h-16 rounded-full object-cover border border-purple-cd-100/20"
                                  />
                                  <div>
                                    <h4 className="text-xl font-semibold text-white">
                                      {speaker.name}
                                    </h4>
                                    {speaker.company && (
                                      <p className="text-lg text-white/60">{speaker.company}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Session Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-3 text-purple-cd-100">
                          <Clock className="w-6 h-6" />
                          <span className="text-xl">
                            {formatTime(new Date(currentSession.dateStart))} -{' '}
                            {formatTime(new Date(currentSession.dateEnd))}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-purple-cd-100">
                          <MapPin className="w-6 h-6" />
                          <span className="text-xl">{currentSession.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-3xl mx-auto">
                    <h2 className="text-4xl font-display font-bold mb-6 text-white">
                      No Current Session
                    </h2>
                    <p className="text-2xl text-white/80">
                      There is no session currently in progress.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'upcoming':
        return (
          <div className="h-full flex flex-col bg-blue-cd-200 relative">
            <div className="absolute inset-0 bg-[url('/Pattern.svg')] opacity-10"></div>
            {/* Header */}
            <div className="bg-blue-cd-200/60 backdrop-blur-xl border-b border-purple-cd-100/20 p-8 text-white relative z-10">
              <div className="flex items-center justify-between mb-6">
                <img src="/logo.svg" alt="Logo" className="h-12 w-auto" />
                <div className="flex items-center gap-4">
                  <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-cyan-cd-100 to-blue-cd-100 bg-clip-text text-transparent">
                    UPCOMING SESSIONS
                  </h1>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-mono font-bold text-cyan-cd-100">
                    {formatTime(currentTime)}
                  </div>
                  <div className="text-3xl font-bold text-cyan-cd-100/80">
                    {formatDate(currentTime)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-2xl font-bold">
                <div className="flex items-center gap-3 text-cyan-cd-100">
                  <MapPin className="w-6 h-6 text-cyan-cd-100" />
                  <span>{actualLocation}</span>
                </div>
              </div>
            </div>

            {/* Upcoming Sessions List */}
            <div
              ref={upcomingSessionsRef}
              className="flex-1 overflow-hidden relative z-10 bg-blue-cd-200/40"
            >
              <div className="max-w-5xl mx-auto p-12">
                {upcomingSessions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-8">
                    {upcomingSessions.map((session, index) => (
                      <div
                        key={session.id || index}
                        className="bg-blue-cd-200/60 backdrop-blur-xl border border-purple-cd-100/20 rounded-lg p-8 hover:border-purple-cd-100/40 transition-all duration-500 hover:scale-[1.02]"
                      >
                        <div className="flex flex-col md:flex-row md:items-start gap-6">
                          <div className="flex-1">
                            <h2 className="text-3xl font-display font-bold mb-4 bg-gradient-to-r from-cyan-cd-100 to-blue-cd-100 bg-clip-text text-transparent">
                              {session.name}
                            </h2>

                            {/* Session Details with Badges */}
                            <div className="flex flex-wrap items-center gap-4 mb-6">
                              <div className="flex items-center gap-3 text-white">
                                <Clock className="w-6 h-6" />
                                <span className="text-xl">
                                  {formatTime(new Date(session.dateStart))} -{' '}
                                  {formatTime(new Date(session.dateEnd))}
                                </span>
                              </div>
                              {session.level && (
                                <div className="bg-cyan-cd-100/10 text-white px-4 py-2 rounded-full text-xl border border-cyan-cd-100/20">
                                  {session.level}
                                </div>
                              )}
                              {session.language && (
                                <div className="bg-cyan-cd-100/10 text-white px-4 py-2 rounded-full text-xl border border-cyan-cd-100/20">
                                  {session.language}
                                </div>
                              )}
                              {session.category && (
                                <div className="bg-cyan-cd-100/10 text-white px-4 py-2 rounded-full text-xl border border-cyan-cd-100/20">
                                  {session.category}
                                </div>
                              )}
                            </div>

                            {/* Speakers */}
                            {session.speakers && session.speakers.length > 0 && (
                              <div className="flex flex-wrap gap-4">
                                {session.speakers
                                  ?.filter(
                                    (speaker: Speaker | null): speaker is Speaker =>
                                      speaker !== null
                                  )
                                  .map((speaker: Speaker, speakerIndex: number) => (
                                    <div
                                      key={speaker.id || speakerIndex}
                                      className="flex items-center gap-3 bg-blue-cd-200/40 px-4 py-2 rounded-full border border-cyan-cd-100/20"
                                    >
                                      <img
                                        src={
                                          speaker.avatarUrl || '/placeholder.svg?height=48&width=48'
                                        }
                                        alt={speaker.name}
                                        className="w-12 h-12 rounded-full object-cover border border-cyan-cd-100/20"
                                      />
                                      <span className="text-xl text-white">
                                        {speaker.name}
                                        {speaker.company && (
                                          <span className="text-white/60">
                                            {' '}
                                            • {speaker.company}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-3xl mx-auto">
                      <h2 className="text-4xl font-display font-bold mb-6 text-white">
                        No More Sessions Today
                      </h2>
                      <p className="text-2xl text-cyan-cd-100/80 mb-8">
                        {currentSession ? (
                          <>
                            The current session "{currentSession.name}" is the last one for today.
                            <br />
                            Thank you for attending!
                          </>
                        ) : (
                          'There are no more sessions scheduled for today. Thank you for attending!'
                        )}
                      </p>
                      {currentSession && (
                        <div className="inline-block bg-cyan-cd-100/10 px-6 py-3 rounded-lg border border-cyan-cd-100/20">
                          <p className="text-xl text-cyan-cd-100">
                            Current session ends at {formatTime(new Date(currentSession.dateEnd))}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'sponsor':
        // Don't show regular sponsor content when fullscreen video is active
        if (isFullscreenVideo && sponsorContent[sponsorIndex].type === 'video') {
          return (
            <div className="h-full flex items-center justify-center bg-black">
              {/* Placeholder while fullscreen video plays */}
            </div>
          );
        }

        return (
          <div className="h-full flex flex-col bg-blue-cd-200 relative">
            <div className="absolute inset-0 bg-[url('/Pattern.svg')] opacity-10"></div>
            {/* Header */}
            <div className="bg-blue-cd-200/60 backdrop-blur-xl border-b border-purple-cd-100/20 p-8 text-white relative z-10">
              <div className="flex items-center justify-between mb-6">
                <img src="/logo.svg" alt="Logo" className="h-12 w-auto" />
                <div className="flex items-center gap-4">
                  <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-orange-cd-100 to-pink-cd-100 bg-clip-text text-transparent">
                    SPONSOR HIGHLIGHT
                  </h1>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-mono font-bold text-orange-cd-100">
                    {formatTime(currentTime)}
                  </div>
                  <div className="text-3xl font-bold text-orange-cd-100/80">
                    {formatDate(currentTime)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-2xl font-bold">
                <div className="flex items-center gap-3 text-orange-cd-100">
                  <MapPin className="w-6 h-6 text-orange-cd-100" />
                  <span>{actualLocation}</span>
                </div>
              </div>
            </div>

            {/* Sponsor Content */}
            <div className="flex-1 flex items-center justify-center p-4 relative z-10">
              <div className="w-full h-full max-w-[95vw] max-h-[85vh] flex items-center justify-center">
                <div className="relative w-full h-full max-h-[70vh] flex items-center justify-center">
                  {sponsorContent[sponsorIndex]?.type === 'video' ? (
                    <div className="text-white text-center">
                      <p className="text-2xl">Loading video...</p>
                      <p className="text-lg text-white/60">{sponsorContent[sponsorIndex].title}</p>
                    </div>
                  ) : (
                    <img
                      src={sponsorContent[sponsorIndex]?.url}
                      alt={sponsorContent[sponsorIndex]?.title}
                      className="w-auto h-auto max-w-full max-h-full object-contain"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="animate-pulse">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900 to-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2 text-white">Error Loading Agenda</h2>
          <p className="text-red-200/80">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={stageRef} className="h-screen w-screen overflow-hidden bg-black">
      <div ref={contentRef} className="h-full w-full">
        {renderContent()}
      </div>

      {/* Fullscreen Video Overlay */}
      {isFullscreenVideo &&
        displayMode === 'sponsor' &&
        sponsorContent[sponsorIndex]?.type === 'video' && (
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            <video
              key={`fullscreen-${sponsorIndex}-${sponsorContent[sponsorIndex].title}`} // Unique key for each video
              src={sponsorContent[sponsorIndex].url}
              className="fullscreen-video w-full h-full object-contain"
              autoPlay
              loop={false}
              muted
              playsInline
              onEnded={handleVideoEnd}
              onLoadedData={() => {
                console.log(`Fullscreen video loaded: ${sponsorContent[sponsorIndex].title}`);
              }}
              onPlay={() => {
                console.log(`Video started playing: ${sponsorContent[sponsorIndex].title}`);
              }}
              onTimeUpdate={(e) => {
                const video = e.target as HTMLVideoElement;
                if (video.duration && video.currentTime) {
                  const progress = (video.currentTime / video.duration) * 100;
                  if (progress % 25 < 1) {
                    // Log every 25%
                    console.log(
                      `Video progress: ${Math.round(progress)}% - ${sponsorContent[sponsorIndex].title}`
                    );
                  }
                }
              }}
              onError={(e) => {
                console.error('Video error:', e, sponsorContent[sponsorIndex].title);
              }}
            />
          </div>
        )}
    </div>
  );
}
