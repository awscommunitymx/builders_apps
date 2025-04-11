import axios from 'axios';
import { AttendeeData } from '../types/attendee';

export const fetchAttendeeData = async (url: string, token: string): Promise<any> => {
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
};

export const extractAndValidateData = (attendee: any): AttendeeData => {
  const profile = attendee.profile || {};

  return {
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    cell_phone: profile.cell_phone || '',
    email: profile.email || '',
    job_title: profile.job_title || '',
    company: profile.company || '',
    gender: profile.gender || '',
    barcode: attendee.barcodes?.[0]?.barcode || '',
    initialized: false,
  };
};
