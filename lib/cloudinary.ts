import { v2 as cloudinary } from "cloudinary";

interface UploadPassportOptions {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
  studentId?: string;
}

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

const PASSPORT_IMAGE_WIDTH = 480;
const PASSPORT_IMAGE_HEIGHT = 500;

function assertCloudinaryConfig() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary environment variables are not configured",
    );
  }
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function uploadPassportToCloudinary({
  buffer,
  mimeType,
  fileName,
  studentId,
}: UploadPassportOptions): Promise<string> {
  assertCloudinaryConfig();
  configureCloudinary();

  const originalName = fileName
    ?.replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const publicId =
    [studentId, originalName].filter(Boolean).join("_") || undefined;

  const result = await new Promise<CloudinaryUploadResult>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "funato/passports",
          resource_type: "image",
          public_id: publicId,
          unique_filename: true,
          overwrite: false,
          format: mimeType === "image/png" ? "png" : undefined,
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }

          const secureUrl = uploadResult.secure_url;
          const publicId = uploadResult.public_id;
          if (
            typeof secureUrl !== "string" ||
            typeof publicId !== "string"
          ) {
            reject(
              new Error(
                "Cloudinary upload response is missing image URL",
              ),
            );
            return;
          }

          resolve({ secure_url: secureUrl, public_id: publicId });
        },
      );

      stream.end(buffer);
    },
  );

  return cloudinary.url(result.public_id, {
    secure: true,
    transformation: [
      {
        width: PASSPORT_IMAGE_WIDTH,
        height: PASSPORT_IMAGE_HEIGHT,
        crop: "fill",
        gravity: "face",
        quality: "auto",
        fetch_format: "auto",
      },
    ],
  });
}
