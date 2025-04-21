// src/utils/attendee.ts
import axios from 'axios';
import { AttendeeCheckIn } from '../../../../utils/types';

export const fetchAttendeeData = async (url: string, token: string): Promise<any> => {
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
};

export const extractAndValidateData = (attendee: any): AttendeeCheckIn => {
  const profile = attendee.profile || {};

  return {
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    contact_information: {
      email: profile.email || '',
      phone: profile.cell_phone || '',
      share_email: !!profile.share_email,
      share_phone: !!profile.share_phone,
    },
    job_title: profile.job_title || '',
    company: profile.company || '',
    gender: profile.gender || '',
    user_id: profile.user_id,
    role: profile.job_title || '',
    age_range: profile.age_range || '',
    area_of_interest: profile.area_of_interest || '',
    social_links: profile.social_links || [],
    pin: profile.pin || '',
    short_id: profile.short_id || '',
    initialized: false,
  };
};
