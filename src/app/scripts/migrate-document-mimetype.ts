import mongoose from 'mongoose';
import { DocumentModel } from '../modules/document/document.model';
import config from '../config';

/**
 * Migration script to add mimeType field to existing documents
 * and fix resource type for PDFs
 */
const migrateDocuments = async () => {
  try {
    await mongoose.connect(config.database_url as string);
    console.log('Connected to database');

    // Find all documents without mimeType
    const documents = await DocumentModel.find({
      $or: [
        { mimeType: { $exists: false } },
        { mimeType: null },
        { mimeType: '' }
      ]
    });

    console.log(`Found ${documents.length} documents to migrate`);

    const mimeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'rtf': 'application/rtf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'm4a': 'audio/mp4',
    };

    let updated = 0;
    let failed = 0;

    for (const doc of documents) {
      try {
        // Infer MIME type from fileType (extension)
        const ext = doc.fileType?.toLowerCase();
        const mimeType = (ext && mimeMap[ext]) ? mimeMap[ext] : 'application/octet-stream';

        await DocumentModel.updateOne(
          { _id: doc._id },
          { $set: { mimeType } }
        );

        updated++;
        if (updated % 100 === 0) {
          console.log(`Progress: ${updated}/${documents.length}`);
        }
      } catch (err) {
        console.error(`Failed to migrate document ${doc.id}:`, err);
        failed++;
      }
    }

    console.log(`\nMigration complete:`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Failed: ${failed}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrateDocuments();
