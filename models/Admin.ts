import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  role: "superadmin" | "admin";
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ["superadmin", "admin"],
      default: "admin",
    },
    lastLogin: { type: Date },
  },
  { timestamps: true },
);

const Admin: Model<IAdmin> =
  mongoose.models.Admin ||
  mongoose.model<IAdmin>("Admin", AdminSchema);
export default Admin;
