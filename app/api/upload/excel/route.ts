// app/api/upload/excel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/models/Student';
import UploadRecord from '@/models/UploadRecord';
import { isAuthenticated } from '@/lib/auth';
import { parseExcelFile } from '@/lib/excel';

export async function POST(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Please upload .xlsx, .xls, or .csv files' },
        { status: 400 }
      );
    }

    // File size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse Excel file
    const parseResult = await parseExcelFile(buffer);

    if (!parseResult.success && parseResult.students.length === 0) {
      return NextResponse.json({
        success: false,
        message: parseResult.errors[0]?.message || 'Failed to parse file',
        uploadErrors: parseResult.errors,
      }, { status: 400 });
    }

    // Create upload record
    const uploadRecord = await UploadRecord.create({
      fileName: `upload_${Date.now()}.xlsx`,
      originalName: file.name,
      totalRecords: parseResult.total,
      successRecords: 0,
      duplicates: 0,
      errorRecords: parseResult.errors.length,
      uploadErrors: parseResult.errors,
      uploadedBy: user.adminId,
      uploadedByName: user.name,
      fileSize: file.size,
      status: 'processing',
    });

    // Insert students (skip duplicates)
    let importedCount = 0;
    let duplicateCount = 0;
    const importErrors: { row: number; message: string }[] = [...parseResult.errors];

    const matricNumbers = parseResult.students.map(student => student.matricNumber);
    const existingStudents = await Student.find({
      matricNumber: { $in: matricNumbers },
    }).select('matricNumber').lean();
    const existingMatricNumbers = new Set(
      existingStudents.map(student => student.matricNumber),
    );

    const studentsToInsert = [];
    for (let i = 0; i < parseResult.students.length; i++) {
      const studentData = parseResult.students[i];

      if (existingMatricNumbers.has(studentData.matricNumber)) {
        duplicateCount++;
        importErrors.push({
          row: i + 2,
          message: `Duplicate matric number: ${studentData.matricNumber} (already in database)`,
        });
        continue;
      }

      studentsToInsert.push({
        ...studentData,
        uploadRecordId: uploadRecord._id,
      });
    }

    if (studentsToInsert.length > 0) {
      try {
        const insertedStudents = await Student.insertMany(studentsToInsert, {
          ordered: false,
        });
        importedCount = insertedStudents.length;
      } catch (err: unknown) {
        const insertError = err as {
          insertedDocs?: unknown[];
          writeErrors?: Array<{ index?: number; errmsg?: string }>;
          result?: { insertedCount?: number };
          message?: string;
        };
        importedCount =
          insertError.insertedDocs?.length ??
          insertError.result?.insertedCount ??
          0;

        if (insertError.writeErrors?.length) {
          for (const writeError of insertError.writeErrors) {
            const failedStudent =
              typeof writeError.index === 'number'
                ? studentsToInsert[writeError.index]
                : undefined;
            importErrors.push({
              row: (writeError.index ?? 0) + 2,
              message:
                writeError.errmsg ||
                `Failed to import ${failedStudent?.matricNumber || 'student'}`,
            });
          }
        } else {
          importErrors.push({
            row: 0,
            message: insertError.message || 'Bulk student insert failed',
          });
        }
      }
    }

    // Update upload record
    await UploadRecord.findByIdAndUpdate(uploadRecord._id, {
      successRecords: importedCount,
      duplicates: duplicateCount,
      errorRecords: importErrors.length,
      uploadErrors: importErrors.slice(0, 100), // Store max 100 errors
      status: 'completed',
    });

    return NextResponse.json({
      success: true,
      message: `Import completed: ${importedCount} students imported`,
      result: {
        total: parseResult.total,
        imported: importedCount,
        duplicates: duplicateCount,
        errors: importErrors.length,
        errorDetails: importErrors.slice(0, 20), // Return first 20 errors to client
        uploadId: uploadRecord._id,
      },
    });
  } catch (error) {
    console.error('Excel upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during file upload' },
      { status: 500 }
    );
  }
}
