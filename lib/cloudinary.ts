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

interface CloudinaryV2 {
  config(config: {
    cloud_name?: string;
    api_key?: string;
    api_secret?: string;
  }): void;
  uploader: {
    upload_stream(
      options: Record<string, unknown>,
      callback: (
        error: Error | undefined,
        result: Record<string, unknown> | undefined,
      ) => void,
    ): {
      end(buffer: Buffer): void;
    };
  };
}

let cloudinaryClient: CloudinaryV2 | null = null;

function assertCloudinaryConfig() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error('Cloudinary environment variables are not configured');
  }
}

async function getCloudinaryClient(): Promise<CloudinaryV2> {
  if (cloudinaryClient) return cloudinaryClient;

  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<{ v2: CloudinaryV2 }>;
  const cloudinary = (await dynamicImport('cloudinary')).v2;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  cloudinaryClient = cloudinary;
  return cloudinaryClient;
}

export async function uploadPassportToCloudinary({
  buffer,
  mimeType,
  fileName,
  studentId,
}: UploadPassportOptions): Promise<string> {
  assertCloudinaryConfig();
  const cloudinary = await getCloudinaryClient();

  const originalName = fileName?.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const publicId = [studentId, originalName].filter(Boolean).join('_') || undefined;

  const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'funato/passports',
        resource_type: 'image',
        public_id: publicId,
        unique_filename: true,
        overwrite: false,
        format: mimeType === 'image/png' ? 'png' : undefined,
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }

        const secureUrl = uploadResult.secure_url;
        const publicId = uploadResult.public_id;
        if (typeof secureUrl !== 'string' || typeof publicId !== 'string') {
          reject(new Error('Cloudinary upload response is missing image URL'));
          return;
        }

        resolve({ secure_url: secureUrl, public_id: publicId });
      },
    );

    stream.end(buffer);
  });

  return result.secure_url;
}
