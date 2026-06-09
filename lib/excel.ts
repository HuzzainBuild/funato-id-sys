// lib/excel.ts
import * as XLSX from 'xlsx';
import {
  generateSecurityString,
  mapExcelColumns,
  getExcelColumnIndexes,
  formatMatricNumber,
  normalizeBloodGroup,
  normalizeGenotype,
  getCurrentYear,
} from './utils';
import { fetchPassportDataUrl } from './passport';
import { canonicalizeDepartment, resolveStudentCollege } from './cardTemplates';
import { uploadPassportToCloudinary } from './cloudinary';
import type { Student, ImportResult } from '../types';

const PASSPORT_UPLOAD_CONCURRENCY = Number(process.env.PASSPORT_UPLOAD_CONCURRENCY || 5);

export async function parseExcelFile(buffer: Buffer): Promise<ImportResult> {
  const errors: { row: number; message: string }[] = [];
  const students: Student[] = [];
  const passportTasks: Array<() => Promise<void>> = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with headers
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: '',
    }) as string[][];

    if (!rawData || rawData.length < 2) {
      return {
        success: false,
        total: 0,
        imported: 0,
        duplicates: 0,
        errors: [{ row: 0, message: 'Excel file is empty or has no data rows' }],
        students: [],
      };
    }

    const headers = rawData[0].map((h: string) => String(h || '').trim());
    const columnMap = mapExcelColumns(headers);
    const columnIndexes = getExcelColumnIndexes(headers);
    const dataRows = rawData.slice(1);

    // Validate required columns
    const requiredFields = ['surname', 'otherNames', 'matricNumber', 'department'];
    const missingFields = requiredFields.filter(field => !(field in columnMap));

    if (missingFields.length > 0) {
      return {
        success: false,
        total: 0,
        imported: 0,
        duplicates: 0,
        errors: [{
          row: 0,
          message: `Missing required columns: ${missingFields.join(', ')}. Found columns: ${headers.join(', ')}`
        }],
        students: [],
      };
    }

    // Track matric numbers for duplicate detection within file
    const matricSet = new Set<string>();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // Account for header row and 1-indexing

      // Skip empty rows
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }

      const getValue = (field: string): string => {
        const indexes = columnIndexes[field] || [];
        for (const idx of indexes) {
          const value = String(row[idx] || '').trim();
          if (value) return value;
        }

        const idx = columnMap[field];
        if (idx === undefined) return '';
        return String(row[idx] || '').trim();
      };

      const surname = getValue('surname');
      const otherNames = getValue('otherNames');
      const matricNumber = formatMatricNumber(getValue('matricNumber'));
      const department = canonicalizeDepartment(getValue('department'));
      const sex = getValue('sex');
      const bloodGroup = normalizeBloodGroup(getValue('bloodGroup'));
      const genotype = normalizeGenotype(getValue('genotype'));
      const college = getValue('college');
      const passportUrl = getValue('passportUrl');

      // Validate required fields
      if (!surname) {
        errors.push({ row: rowNum, message: 'Surname is required' });
        continue;
      }
      if (!otherNames) {
        errors.push({ row: rowNum, message: 'Other names are required' });
        continue;
      }
      if (!matricNumber) {
        errors.push({ row: rowNum, message: 'Matric number is required' });
        continue;
      }
      if (!department) {
        errors.push({ row: rowNum, message: 'Department is required' });
        continue;
      }

      // Validate sex
      const normalizedSex = sex.toLowerCase();
      const validSex = normalizedSex === 'male' || normalizedSex === 'female' || normalizedSex === 'm' || normalizedSex === 'f';
      const formattedSex = (normalizedSex === 'm' || normalizedSex === 'male') ? 'Male' : 
                           (normalizedSex === 'f' || normalizedSex === 'female') ? 'Female' : sex;

      if (!validSex && sex) {
        errors.push({ row: rowNum, message: `Invalid sex value: "${sex}". Must be Male or Female` });
      }

      // Check for in-file duplicates
      if (matricSet.has(matricNumber)) {
        errors.push({ row: rowNum, message: `Duplicate matric number: ${matricNumber} (within file)` });
        continue;
      }
      matricSet.add(matricNumber);

      const student: Student = {
        surname: surname.toUpperCase(),
        otherNames: otherNames.toUpperCase(),
        matricNumber,
        department,
        college: resolveStudentCollege(college, department),
        sex: formattedSex as 'Male' | 'Female',
        bloodGroup: bloodGroup || 'N/A',
        genotype: genotype || 'N/A',
        securityString: generateSecurityString(),
        importYear: getCurrentYear(),
      };

      if (passportUrl) {
        passportTasks.push(async () => {
          const passport = await fetchPassportDataUrl(passportUrl);
          if (passport.success) {
            try {
              student.passportUrl = await uploadPassportToCloudinary({
                buffer: passport.buffer,
                mimeType: passport.mimeType,
                fileName: `${matricNumber}.jpg`,
                studentId: matricNumber,
              });
            } catch (error) {
              errors.push({
                row: rowNum,
                message: `Passport upload failed: ${(error as Error).message}`,
              });
            }
          } else {
            errors.push({ row: rowNum, message: passport.error });
          }
        });
      }

      students.push(student);
    }

    await runWithConcurrency(passportTasks, PASSPORT_UPLOAD_CONCURRENCY);

    return {
      success: true,
      total: dataRows.filter(r => r && !r.every(c => !c || String(c).trim() === '')).length,
      imported: students.length,
      duplicates: 0, // Will be calculated after DB check
      errors,
      students,
    };
  } catch (error) {
    console.error('Excel parsing error:', error);
    return {
      success: false,
      total: 0,
      imported: 0,
      duplicates: 0,
      errors: [{ row: 0, message: `Failed to parse Excel file: ${(error as Error).message}` }],
      students: [],
    };
  }
}

async function runWithConcurrency(
  tasks: Array<() => Promise<void>>,
  concurrency: number,
) {
  const workerCount = Math.max(1, Math.min(concurrency, tasks.length));
  let nextTask = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextTask < tasks.length) {
        const task = tasks[nextTask++];
        await task();
      }
    }),
  );
}

/**
 * Generate a sample Excel file structure
 */
export function generateSampleExcel(): Buffer {
  const sampleData = [
    ['Surname', 'Other Names', 'Matric Number', 'Department', 'Sex', 'Blood Group', 'Genotype', 'Passport'],
    ['ADEKUNLE', 'JOHN DAVID', 'FUNATO/2023/001', 'Computer Science', 'Male', 'O+', 'AA', 'https://drive.google.com/open?id=YOUR_FILE_ID'],
    ['IBRAHIM', 'FATIMA AISHA', 'FUNATO/2023/002', 'Agricultural and Bio-systems Engineering', 'Female', 'A+', 'AS', ''],
    ['OKONKWO', 'CHUKWUEMEKA', 'FUNATO/2023/003', 'Mechanical Engineering', 'Male', 'B+', 'AA', ''],
    ['ADELEKE', 'BLESSING OMOWUNMI', 'FUNATO/2023/004', 'Biochemistry', 'Female', 'AB+', 'AS', ''],
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(sampleData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Surname
    { wch: 30 }, // Other Names
    { wch: 20 }, // Matric Number
    { wch: 30 }, // Department
    { wch: 10 }, // Sex
    { wch: 15 }, // Blood Group
    { wch: 12 }, // Genotype
    { wch: 50 }, // Passport
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}
