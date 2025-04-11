import { base36Encode } from './base36';
import { AttendeeData } from '../types/attendee';
import * as crypto from 'crypto';

export const generateEventCode = (data: AttendeeData): string => {
  const uniqueString = `${data.barcode}_${data.email}_${data.first_name}_${data.last_name}`;
  const hash = crypto.createHash('sha256').update(uniqueString).digest('hex');
  const hashInt = BigInt('0x' + hash);

  const truncatedHash = Number(hashInt & ((1n << 36n) - 1n));
  let eventCode = base36Encode(truncatedHash).padStart(6, '0');

  return eventCode;
};
