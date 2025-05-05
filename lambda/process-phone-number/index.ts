import { Handler } from 'aws-lambda';

interface PhoneNumberEvent {
  [key: string]: string;
}

interface PhoneNumberResult {
  processedPhoneNumber: string;
}

/**
 * Lambda function to process phone numbers
 * - Removes all whitespace from the phone number
 * - If the phone number has 10 digits (plus the '+' prefix), add "+52" to make it "+52XXXXXXXXXX"
 * - If the phone number has exactly 10 digits without any prefix, add "+52" prefix
 * - If the phone number already has 12 digits (including the '+' prefix), keep it as is
 */
export const handler: Handler<PhoneNumberEvent, PhoneNumberResult> = async (event) => {
  console.log('Processing phone number:', event);

  // Get the phone number from the event
  const phoneNumber = typeof event === 'string' ? event : JSON.stringify(event);

  // First remove all whitespace from the phone number
  let processedNumber = phoneNumber.trim().replace(/\s+/g, '');
  console.log('After removing whitespace:', processedNumber);

  // Case 1: Check if the phone number starts with '+' and has exactly 11 characters ('+' plus 10 digits)
  if (processedNumber.startsWith('+') && processedNumber.length === 11) {
    // Add the country code '+52'
    processedNumber = '+52' + processedNumber.substring(1);
    console.log('Added country code to phone number with + prefix:', processedNumber);
  }
  // Case 2: Check if the phone number is exactly 10 digits without a '+' prefix
  else if (/^\d{10}$/.test(processedNumber)) {
    // Add the country code '+52'
    processedNumber = '+52' + processedNumber;
    console.log('Added country code to 10-digit phone number without prefix:', processedNumber);
  } else {
    console.log('Phone number already has correct format or is invalid:', processedNumber);
  }

  return {
    processedPhoneNumber: processedNumber,
  };
};
