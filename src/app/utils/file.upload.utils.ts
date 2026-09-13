import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import config from '../config';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary_cloud_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_api_secret,
});

// Upload result interface
export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  asset_id: string;
  bytes: number;
  resource_type: string;
}

/**
 * Upload a file buffer to Cloudinary
 * @param buffer - File buffer
 * @param options - Upload options (folder, public_id prefix, resource_type)
 * @returns Cloudinary upload result
 */
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  options: {
    folder?: string;
    publicIdPrefix?: string;
    resourceType?: 'auto' | 'image' | 'video' | 'raw';
    accessMode?: 'public' | 'authenticated';
  } = {},
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const {
      folder = 'documents',
      publicIdPrefix,
      resourceType = 'auto',
      accessMode = 'authenticated',
    } = options;

    const deliveryType = accessMode === 'authenticated' ? 'authenticated' : 'upload';

    // Generate unique public ID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const publicId = publicIdPrefix
      ? `${publicIdPrefix}_${timestamp}_${randomSuffix}`
      : `doc_${timestamp}_${randomSuffix}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        type: deliveryType,
        access_mode: accessMode,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          asset_id: result.asset_id,
          bytes: result.bytes,
          resource_type: result.resource_type,
        });
      },
    );

    // Convert buffer to stream and pipe to upload
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Upload a file from path to Cloudinary
 * @param filePath - Path to the file
 * @param options - Upload options
 * @returns Cloudinary upload result
 */
export const uploadFileToCloudinary = async (
  filePath: string,
  options: {
    folder?: string;
    publicIdPrefix?: string;
    resourceType?: 'auto' | 'image' | 'video' | 'raw';
    accessMode?: 'public' | 'authenticated';
  } = {},
): Promise<CloudinaryUploadResult> => {
  const {
    folder = 'documents',
    publicIdPrefix,
    resourceType = 'auto',
    accessMode = 'authenticated',
  } = options;

  const deliveryType = accessMode === 'authenticated' ? 'authenticated' : 'upload';

  // Generate unique public ID
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const publicId = publicIdPrefix
    ? `${publicIdPrefix}_${timestamp}_${randomSuffix}`
    : `doc_${timestamp}_${randomSuffix}`;

  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    public_id: publicId,
    resource_type: resourceType,
    type: deliveryType,
    access_mode: accessMode,
  });

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    format: result.format,
    asset_id: result.asset_id,
    bytes: result.bytes,
    resource_type: result.resource_type,
  };
};

/**
 * Delete a file from Cloudinary by public ID
 * @param publicId - Cloudinary public ID
 * @param resourceType - Resource type (image, video, raw)
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'raw',
): Promise<{ result: string }> => {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
};

/**
 * Get a signed URL for secure document access
 * @param publicId - Cloudinary public ID
 * @param expiresInSeconds - URL expiration time in seconds
 */
export type CloudinaryResourceType = 'image' | 'video' | 'raw';
export type CloudinaryDeliveryType = 'upload' | 'authenticated';

export const resolveResourceTypeFromMime = (
  mimeType?: string,
): CloudinaryResourceType => {
  if (!mimeType) return 'raw';
  const normalized = mimeType.toLowerCase();

  // Images (excluding PDFs - PDFs should be 'raw')
  if (normalized.startsWith('image/') && normalized !== 'application/pdf') return 'image';

  // Video and audio (Cloudinary stores audio under video resource type)
  if (normalized.startsWith('video/') || normalized.startsWith('audio/')) {
    return 'video';
  }

  // PDFs should be 'raw' for proper handling
  if (normalized === 'application/pdf') return 'raw';

  // Document types should be 'raw'
  const documentTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'text/plain',
    'application/rtf',
  ];

  if (documentTypes.some(type => normalized.includes(type))) return 'raw';

  // Extension-based fallback for when only extension is provided
  if (!normalized.includes('/')) {
    const extension = normalized.replace('.', '');
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'm4a'];
    const rawExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'];

    if (imageExts.includes(extension)) return 'image';
    if (videoExts.includes(extension)) return 'video';
    if (rawExts.includes(extension)) return 'raw';
  }

  return 'raw';
};

export const resolveResourceTypeFromUrl = (
  url?: string,
  fallback: CloudinaryResourceType = 'raw',
): CloudinaryResourceType => {
  if (!url) return fallback;
  if (url.includes('/image/')) return 'image';
  if (url.includes('/video/')) return 'video';
  if (url.includes('/raw/')) return 'raw';
  return fallback;
};

export const resolveDeliveryTypeFromUrl = (
  url?: string,
  fallback: CloudinaryDeliveryType = 'authenticated',
): CloudinaryDeliveryType => {
  if (!url) return fallback;
  if (url.includes('/authenticated/')) {
    return 'authenticated';
  }
  if (url.includes('/upload/')) {
    return 'upload';
  }
  return fallback;
};

export const getSignedUrl = (
  publicId: string,
  options: {
    expiresInSeconds?: number;
    resourceType?: CloudinaryResourceType;
    deliveryType?: CloudinaryDeliveryType;
    attachmentFilename?: string;
    inline?: boolean;
  } = {},
): string => {
  const {
    expiresInSeconds = 3600,
    resourceType = 'raw',
    deliveryType = 'authenticated',
    attachmentFilename,
    inline = false,
  } = options;

  const expirationTimestamp = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const urlOptions: Record<string, unknown> = {
    sign_url: true,
    type: deliveryType,
    resource_type: resourceType,
    expires_at: expirationTimestamp,
  };

  if (attachmentFilename) {
    urlOptions.attachment = attachmentFilename;
  } else if (inline) {
    // Force inline display instead of attachment for viewing
    urlOptions.flags = 'inline';
  }

  return cloudinary.url(publicId, urlOptions);
};
