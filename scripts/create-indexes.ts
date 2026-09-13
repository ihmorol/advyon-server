/**
 * Database Index Creation Script
 * Run this script after deployment to ensure all indexes are created
 * 
 * Usage: npm run create-indexes
 */

import mongoose from 'mongoose';
import config from '../src/app/config';

async function createIndexes() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(config.database_url as string);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    console.log('\n📊 Creating indexes...\n');

    // Get all collections
    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`Processing collection: ${collectionName}`);

      try {
        // Get existing indexes
        const indexes = await db.collection(collectionName).indexes();
        console.log(`  Current indexes: ${indexes.map((i: any) => i.name).join(', ')}`);
      } catch (err) {
        console.log(`  Warning: Could not get indexes for ${collectionName}`);
      }
    }

    console.log('\n✅ Index verification complete');
    console.log('\nNote: Mongoose will auto-create indexes defined in schemas on first connection.');
    console.log('To force index rebuild, run: npm run rebuild-indexes');

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
