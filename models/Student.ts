// models/Student.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStudent extends Document {
  surname: string;
  otherNames: string;
  matricNumber: string;
  department: string;
  college?: string;
  sex: 'Male' | 'Female';
  bloodGroup: string;
  genotype: string;
  passportUrl?: string;
  passportData?: string; // legacy base64 fallback; new saves use passportUrl
  securityString: string;
  qrData?: string;
  importYear: number;
  uploadRecordId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    surname: {
      type: String,
      required: [true, 'Surname is required'],
      trim: true,
      uppercase: true,
      maxlength: [100, 'Surname cannot exceed 100 characters'],
    },
    otherNames: {
      type: String,
      required: [true, 'Other names are required'],
      trim: true,
      uppercase: true,
      maxlength: [200, 'Other names cannot exceed 200 characters'],
    },
    matricNumber: {
      type: String,
      required: [true, 'Matric number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [30, 'Matric number cannot exceed 30 characters'],
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    college: {
      type: String,
      trim: true,
    },
    sex: {
      type: String,
      enum: ['Male', 'Female'],
      required: [true, 'Sex is required'],
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: 'N/A',
    },
    genotype: {
      type: String,
      trim: true,
      default: 'N/A',
    },
    passportUrl: {
      type: String,
      trim: true,
    },
    passportData: {
      type: String, // legacy base64 encoded image
    },
    securityString: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    qrData: {
      type: String,
    },
    importYear: {
      type: Number,
      required: true,
      index: true,
    },
    uploadRecordId: {
      type: Schema.Types.ObjectId,
      ref: 'UploadRecord',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
StudentSchema.index({ department: 1 });
StudentSchema.index({ importYear: 1 });
StudentSchema.index({ surname: 'text', otherNames: 'text', matricNumber: 'text' });
StudentSchema.index({ department: 1, importYear: 1 });

// Virtual for full name
StudentSchema.virtual('fullName').get(function() {
  return `${this.surname} ${this.otherNames}`;
});

const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);

export default Student;
