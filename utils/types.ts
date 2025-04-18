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
}
