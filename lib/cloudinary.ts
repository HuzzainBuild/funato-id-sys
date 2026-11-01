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
  version: number;
}

const PASSPORT_IMAGE_WIDTH = 480;
const PASSPORT_IMAGE_HEIGHT = 510;

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
          // Same matric number => same public_id. Without overwrite, Cloudinary
          // silently keeps the OLD image and returns it, so a corrected passport
          // is ignored. invalidate purges the CDN cache of the old image.
          unique_filename: false,
          overwrite: true,
          invalidate: true,
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

          resolve({
            secure_url: secureUrl,
            public_id: publicId,
            version: uploadResult.version,
          });
        },
      );

      stream.end(buffer);
    },
  );

  // The version in the URL changes on every upload, so browsers and the CDN
  // never serve a stale copy of a replaced passport.
  return cloudinary.url(result.public_id, {
    secure: true,
    version: result.version,
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

/** Extracts the Cloudinary public_id from a passport URL built by this module. */
export function getPassportPublicId(
  url?: string | null,
): string | null {
  if (!url || !url.includes("res.cloudinary.com")) return null;
  const marker = "funato/passports/";
  const start = url.indexOf(marker);
  if (start === -1) return null;
  let id = url.slice(start).split("?")[0];
  try {
    id = decodeURIComponent(id);
  } catch {
    /* keep raw */
  }
  return id.replace(/\.[a-z0-9]+$/i, "");
}

/**
 * Best-effort removal of passport images from Cloudinary when students are
 * deleted, so a re-import never meets a leftover image. Never throws.
 */
export async function deletePassports(
  urls: Array<string | null | undefined>,
): Promise<number> {
  const ids = Array.from(
    new Set(
      urls
        .map(getPassportPublicId)
        .filter((id): id is string => !!id),
    ),
  );
  if (!ids.length) return 0;

  try {
    assertCloudinaryConfig();
    configureCloudinary();
  } catch {
    return 0;
  }

  let removed = 0;
  // delete_resources accepts up to 100 ids per call
  for (let i = 0; i < ids.length; i += 100) {
    try {
      await cloudinary.api.delete_resources(ids.slice(i, i + 100), {
        resource_type: "image",
        invalidate: true,
      });
      removed += ids.slice(i, i + 100).length;
    } catch (error) {
      console.error(
        "Cloudinary cleanup failed:",
        (error as Error).message,
      );
    }
  }
  return removed;
}
