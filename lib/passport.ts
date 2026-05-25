const MAX_PASSPORT_BYTES = 5 * 1024 * 1024;

type PassportFetchResult =
  | { success: true; dataUrl: string; buffer: Buffer; mimeType: string; sourceUrl: string }
  | { success: false; error: string; sourceUrl: string };

function extractGoogleDriveFileId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get('id');
    if (id) return id;

    const match = parsed.pathname.match(/\/d\/([^/]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function getPassportDownloadUrls(sourceUrl: string): string[] {
  const driveId = extractGoogleDriveFileId(sourceUrl);
  if (!driveId) return [sourceUrl];

  return [
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1000`,
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=download`,
    sourceUrl,
  ];
}

function sniffImageMime(buffer: Buffer, contentType: string | null): string | null {
  const normalizedType = contentType?.split(';')[0].trim().toLowerCase() || '';
  if (normalizedType.startsWith('image/')) return normalizedType;

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  return null;
}

export async function fetchPassportDataUrl(sourceUrl: string): Promise<PassportFetchResult> {
  const trimmedUrl = sourceUrl.trim();

  if (!trimmedUrl) {
    return { success: false, sourceUrl: trimmedUrl, error: 'Passport URL is empty' };
  }

  if (trimmedUrl.startsWith('data:image/')) {
    const match = trimmedUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
    if (!match) {
      return { success: false, sourceUrl: trimmedUrl, error: 'Invalid passport data URL' };
    }

    return {
      success: true,
      sourceUrl: trimmedUrl,
      dataUrl: trimmedUrl,
      mimeType: match[1],
      buffer: Buffer.from(match[2], 'base64'),
    };
  }

  for (const url of getPassportDownloadUrls(trimmedUrl)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'user-agent': 'FUNATO-ID-Importer/1.0',
        },
      });

      if (!response.ok) continue;

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length === 0 || buffer.length > MAX_PASSPORT_BYTES) continue;

      const mime = sniffImageMime(buffer, response.headers.get('content-type'));
      if (!mime) continue;

      return {
        success: true,
        sourceUrl: trimmedUrl,
        buffer,
        mimeType: mime,
        dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
      };
    } catch {
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    success: false,
    sourceUrl: trimmedUrl,
    error: 'Could not download passport image. Confirm the Google Drive file is shared publicly.',
  };
}
