/**
 * Database Index Rebuild Script
 * WARNING: This drops and recreates all indexes - use with caution in production!
 * 
 * Usage: npm run db:rebuild-indexes
 * 
 * This should only be run:
 * 1. After initial deployment
 * 2. When schema indexes have changed
 * 3. During maintenance windows (causes brief lock on collections)
 */

import mongoose from 'mongoose';
import config from '../src/app/config';

async function rebuildIndexes() {
  if (config.NODE_ENV === 'production') {
    const response = process.env.INDEX_REBUILD_CONFIRMED;
    if (!response || response !== 'true') {
      console.log('⚠️  Index rebuild in production requires confirmation.');
      console.log('   Set INDEX_REBUILD_CONFIRMED=true to proceed.');
      console.log('   Example: INDEX_REBUILD_CONFIRMED=true npm run db:rebuild-indexes');
      process.exit(0);
    }
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(config.database_url as string);
    console.log('✅ Connected to MongoDB\n');

    console.log('📊 Rebuilding indexes...\n');

    // Import ensure schemas all models to are registered
    await import('../src/app/modules/user/user.model');
    await import('../src/app/modules/legal/legal.model');
    await import('../src/app/modules/ai/ai-chat.model');
    await import('../src/app/modules/activity/activity.model');
    // Add other models as needed

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Get all collections
    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`Rebuilding indexes for: ${collectionName}`);
      
      try {
        // Rebuild indexes (this drops all existing indexes and recreates them)
        const result = await db.collection(collectionName).reIndex();
        console.log(`  ✅ Indexes rebuilt successfully`);
        console.log(`  Details: ${JSON.stringify(result)}`);
      } catch (err: any) {
        console.log(`  ⚠️  Warning: ${err.message}`);
      }
      console.log('');
    }

    console.log('✅ Index rebuild complete!\n');
    
    // List final indexes
    console.log('📋 Final index configuration:\n');
    for (const collection of collections) {
      const indexes = await db.collection(collection.name).indexes();
      console.log(`${collection.name}:`);
      indexes.forEach((idx: any) => {
        console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
      });
      console.log('');
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error rebuilding indexes:', error);
    process.exit(1);
  }
}

rebuildIndexes();
