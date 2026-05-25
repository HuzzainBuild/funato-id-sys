// lib/qrcode.ts
import QRCode from 'qrcode';
import { buildQRData } from './utils';
import type { Student } from '../types';

export interface QROptions {
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate QR code as Data URL (PNG with transparent background)
 */
export async function generateQRCode(
  student: Pick<Student, 'surname' | 'otherNames' | 'matricNumber' | 'department' | 'sex' | 'securityString'>,
  options: QROptions = {}
): Promise<string> {
  const qrData = buildQRData(student);

  const qrOptions: QRCode.QRCodeToDataURLOptions = {
    type: 'image/png',
    errorCorrectionLevel: options.errorCorrectionLevel || 'H', // High error correction for print
    margin: options.margin !== undefined ? options.margin : 1,
    width: options.size || 300,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#00000000', // Transparent background
    },
  };

  try {
    return await QRCode.toDataURL(qrData, qrOptions);
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(
  student: Pick<Student, 'surname' | 'otherNames' | 'matricNumber' | 'department' | 'sex' | 'securityString'>,
  options: QROptions = {}
): Promise<string> {
  const qrData = buildQRData(student);

  const qrOptions: QRCode.QRCodeToStringOptions = {
    type: 'svg',
    errorCorrectionLevel: options.errorCorrectionLevel || 'H',
    margin: options.margin !== undefined ? options.margin : 1,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff',
    },
  };

  try {
    return await QRCode.toString(qrData, qrOptions);
  } catch (error) {
    console.error('QR SVG generation failed:', error);
    throw new Error('Failed to generate QR code SVG');
  }
}

/**
 * Generate QR code for batch processing (returns base64 buffer)
 */
export async function generateQRCodeBuffer(
  student: Pick<Student, 'surname' | 'otherNames' | 'matricNumber' | 'department' | 'sex' | 'securityString'>,
  size: number = 300
): Promise<Buffer> {
  const qrData = buildQRData(student);

  return await QRCode.toBuffer(qrData, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 1,
    width: size,
    color: {
      dark: '#000000',
      light: '#00000000',
    },
  });
}
