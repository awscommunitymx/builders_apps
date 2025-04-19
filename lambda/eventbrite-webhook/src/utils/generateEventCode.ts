import { base36Encode } from './base36';
import { AttendeeCheckIn } from '../../../../utils/types';
import * as crypto from 'crypto';

export const generateEventCode = (data: AttendeeCheckIn): string => {
  const uniqueString = `${data.user_id}_${data.contact_information.email}_${data.first_name}_${data.last_name}`;
  const hash = crypto.createHash('sha256').update(uniqueString).digest('hex');
  const hashInt = BigInt('0x' + hash);

  const truncatedHash = Number(hashInt & ((1n << 36n) - 1n));
  return base36Encode(truncatedHash).padStart(6, '0');

};
