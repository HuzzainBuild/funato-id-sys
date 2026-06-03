// lib/utils.ts
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a cryptographically secure random security string
 * Used for ID card validation/verification
 * Format: XXXX-XXXX-XXXX-XXXX (alphanumeric, uppercase, OCR-A friendly)
 */
export function generateSecurityString(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // OCR-friendly chars (no I, O, 0, 1)
  const segments = 4;
  const segmentLength = 4;
  
  const result = Array.from({ length: segments }, () =>
    Array.from({ length: segmentLength }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  ).join('-');
  
  return result;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Format matric number consistently
 */
export function formatMatricNumber(matric: string): string {
  return matric
    .trim()
    .toUpperCase()
    .replace(/\b0(\d{4})\b/g, '$1');
}

/**
 * Validate matric number format
 */
export function isValidMatricNumber(matric: string): boolean {
  // Accept various formats: FUNATO/XXXX/XXXX, XXXXXXXX, etc.
  const cleaned = matric.trim();
  return cleaned.length >= 5 && cleaned.length <= 20;
}

/**
 * Convert image file to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Truncate text to fit within max width
 */
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 2) + '..';
}

/**
 * Get current academic year
 */
export function getCurrentYear(): number {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  // Academic year starts in September (month 8)
  return month >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Build QR code data string
 */
export function buildQRData(student: {
  surname: string;
  otherNames: string;
  matricNumber: string;
  department: string;
  sex: string;
  securityString: string;
}): string {
  return JSON.stringify({
    institution: 'FUNATO',
    surname: student.surname.toUpperCase(),
    otherNames: student.otherNames.toUpperCase(),
    matricNo: student.matricNumber.toUpperCase(),
    department: student.department,
    sex: student.sex,
    security: student.securityString,
    verified: 'FUNATO-AUTHENTICATED',
  });
}

const excelColumnPatterns: Record<string, RegExp[]> = {
  surname: [/surname/i, /last.?name/i, /family.?name/i],
  otherNames: [/other.?names?/i, /first.?name/i, /given.?name/i, /middle.?name/i],
  matricNumber: [/matric/i, /matriculation/i, /student.?id/i, /reg.?no/i, /registration/i],
  department: [/department/i, /dept/i, /programme/i, /program/i],
  sex: [/sex/i, /gender/i],
  bloodGroup: [/blood.?group/i, /blood.?type/i],
  genotype: [/genotype/i, /geno.?type/i],
  college: [/college/i, /school/i, /faculty/i],
  passportUrl: [/passport/i, /photo/i, /image/i, /picture/i],
};

export function getExcelColumnIndexes(headers: string[]): Record<string, number[]> {
  const indexes: Record<string, number[]> = {};

  headers.forEach((header, index) => {
    const cleanHeader = header.trim();
    for (const [field, patterns] of Object.entries(excelColumnPatterns)) {
      if (patterns.some(pattern => pattern.test(cleanHeader))) {
        indexes[field] = [...(indexes[field] || []), index];
      }
    }
  });

  return indexes;
}

/**
 * Validate Excel column mapping
 */
export function mapExcelColumns(headers: string[]): Record<string, number> {
  const columnMap: Record<string, number> = {};
  const columnIndexes = getExcelColumnIndexes(headers);

  Object.entries(columnIndexes).forEach(([field, indexes]) => {
    if (indexes.length > 0) columnMap[field] = indexes[0];
  });

  return columnMap;
}

/**
 * Normalize blood group input
 */
export function normalizeBloodGroup(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/\s/g, '');
  const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (validGroups.includes(normalized)) return normalized;
  // Try to fix common mistakes
  if (normalized === 'A' || normalized === 'APOSITIVE' || normalized === 'APLUS') return 'A+';
  if (normalized === 'ANEGATIVE' || normalized === 'AMINUS') return 'A-';
  if (normalized === 'B' || normalized === 'BPOSITIVE') return 'B+';
  if (normalized === 'BNEGATIVE') return 'B-';
  if (normalized === 'AB' || normalized === 'ABPOSITIVE') return 'AB+';
  if (normalized === 'ABNEGATIVE') return 'AB-';
  if (normalized === 'O' || normalized === 'OPOSITIVE') return 'O+';
  if (normalized === 'ONEGATIVE') return 'O-';
  return value.trim();
}

/**
 * Normalize genotype input
 */
export function normalizeGenotype(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/\s/g, '');
  const validGenotypes = ['AA', 'AS', 'SS', 'AC', 'SC'];
  return validGenotypes.includes(normalized) ? normalized : value.trim();
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function(...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
