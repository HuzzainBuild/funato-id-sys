import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUploadRecord extends Document {
  fileName: string;
  originalName: string;
  totalRecords: number;
  successRecords: number;
  duplicates: number;
  errorRecords: number;
  uploadErrors: { row: number; message: string }[];
  uploadedBy: string;
  uploadedByName: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const UploadRecordSchema = new Schema<IUploadRecord>(
  {
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    totalRecords: { type: Number, default: 0 },
    successRecords: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    errorRecords: { type: Number, default: 0 },
    uploadErrors: [{ row: Number, message: String }],
    uploadedBy: { type: String, required: true },
    uploadedByName: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);

const UploadRecord: Model<IUploadRecord> =
  mongoose.models.UploadRecord || mongoose.model<IUploadRecord>('UploadRecord', UploadRecordSchema);
export default UploadRecord;
