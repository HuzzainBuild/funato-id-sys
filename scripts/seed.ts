import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { IAdmin } from "@/models/Admin";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI! as string;

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

async function seed() {
  console.log("🌱 Seeding FUNATO ID System database...\n");

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const Admin = mongoose.model("Admin", AdminSchema);

    const existing = await Admin.findOne({
      email: process.env.ADMIN_EMAIL,
    });
    if (existing) {
      console.log("⚠️  Admin already exists. Skipping seed.");
      process.exit(0);
    }

    const adminPassword = process.env.ADMIN_PASSWORD!;

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await Admin.create({
      name: "System Administrator",
      email: "admin@funato.edu.ng",
      password: hashedPassword,
      role: "superadmin",
    });

    console.log("\n✅ Default admin created:");
    console.log(`   Email: ${process.env.ADMIN_EMAIL}`);
    console.log(`   Password: ${adminPassword}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error("❌ Seed failed:", message);
    process.exit(1);
  }
}

seed();
