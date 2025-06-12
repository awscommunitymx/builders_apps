import { User } from '@awscommunity/generated-react/hooks';

/**
 * Generates a VCF (vCard) file content from user data
 * @param user - User object containing contact information
 * @returns VCF file content as string
 */
export function generateVCF(user: User): string {
  const vcfLines: string[] = [];
  
  // VCF version and begin
  vcfLines.push('BEGIN:VCARD');
  vcfLines.push('VERSION:3.0');
  
  // Full name
  if (user.name) {
    vcfLines.push(`FN:${user.name}`);
    // Split name for structured name field (N:Last;First;Middle;Prefix;Suffix)
    const nameParts = user.name.trim().split(' ');
    if (nameParts.length === 1) {
      vcfLines.push(`N:${nameParts[0]};;;;`);
    } else if (nameParts.length === 2) {
      vcfLines.push(`N:${nameParts[1]};${nameParts[0]};;;`);
    } else {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      const middleNames = nameParts.slice(1, -1).join(' ');
      vcfLines.push(`N:${lastName};${firstName};${middleNames};;`);
    }
  }
  
  // Organization and title
  if (user.company) {
    vcfLines.push(`ORG:${user.company}`);
  }
  
  if (user.job_title) {
    vcfLines.push(`TITLE:${user.job_title}`);
  }
  
  // Email
  if (user.email) {
    vcfLines.push(`EMAIL;TYPE=WORK:${user.email}`);
  }
  
  // Phone number
  if (user.cell_phone) {
    // Clean phone number (remove any formatting)
    const cleanPhone = user.cell_phone.replace(/[^\d+]/g, '');
    vcfLines.push(`TEL;TYPE=CELL:${cleanPhone}`);
  }
  
  // Add a note about the source
  vcfLines.push('NOTE:Contacto obtenido en AWS Community Day');
  
  // End VCF
  vcfLines.push('END:VCARD');
  
  return vcfLines.join('\r\n');
}

/**
 * Downloads a VCF file with the given content
 * @param vcfContent - VCF file content
 * @param fileName - Name for the downloaded file (without extension)
 */
export function downloadVCF(vcfContent: string, fileName: string): void {
  // Create blob with VCF content
  const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8' });
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.vcf`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a VCF file for a user
 * @param user - User object containing contact information
 */
export function downloadUserVCF(user: User): void {
  if (!user) {
    console.error('No user data provided for VCF generation');
    return;
  }
  
  const vcfContent = generateVCF(user);
  const fileName = user.name ? user.name.replace(/[^a-zA-Z0-9]/g, '_') : 'contacto';
  
  downloadVCF(vcfContent, fileName);
}
