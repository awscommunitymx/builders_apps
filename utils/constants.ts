// Timeout for magic link authentication in minutes
export const TIMEOUT_MINS = 15;

// Default pagination limits
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Authentication constants
export const AUTH_CHALLENGE_ATTRIBUTE = 'custom:authChallenge';

// Event types
export const EVENT_TYPES = {
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  SPONSOR_VISIT_REGISTERED: 'SPONSOR_VISIT_REGISTERED',
} as const;
