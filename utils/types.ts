export interface SocialLink {
  name: string;
  url: string;
}

export interface ContactInformation {
  email: string;
  phone: string;
  share_email: boolean;
  share_phone: boolean;
}

// Basic user profile with minimal required fields
export interface BasicUserProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AttendeeCheckIn {
  age_range: string;
  area_of_interest: string;
  company: string;
  job_title: string;
  contact_information: ContactInformation;
  first_name: string;
  last_name: string;
  gender: string;
  user_id: string;
  pin: string;
  role: string;
  social_links: SocialLink[];
  short_id: string;
  initialized: boolean;
  created_at?: string;
  updated_at?: string;
}

// For partial updates
export type PartialAttendeeProfile = Partial<AttendeeCheckIn>;

// Database schema for profile records
export interface ProfileRecord extends AttendeeCheckIn {
  PK: string;
  SK: string;
}
