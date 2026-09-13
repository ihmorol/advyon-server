/**
 * Database Health Check Script
 * Run this to verify database connectivity and status
 * 
 * Usage: npm run db:health
 */

import mongoose from 'mongoose';
import config from '../src/app/config';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connection: {
    state: string;
    host: string;
    database: string;
  };
  indexes: {
    total: number;
    collections: Record<string, number>;
  };
  collections: {
    name: string;
    documentCount: number;
    avgDocumentSize: number;
    storageSize: number;
  }[];
  issues: string[];
}

async function healthCheck(): Promise<void> {
  const result: HealthCheckResult = {
    status: 'healthy',
    connection: {
      state: 'disconnected',
      host: '',
      database: '',
    },
    indexes: {
      total: 0,
      collections: {},
    },
    collections: [],
    issues: [],
  };

  try {
    console.log('🔄 Running database health check...\n');

    // Connect to MongoDB
    await mongoose.connect(config.database_url as string);
    
    const conn = mongoose.connection;
    const db = conn.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    // Connection info
    result.connection = {
      state: conn.readyState === 1 ? 'connected' : conn.readyState === 2 ? 'connecting' : 'disconnected',
      host: conn.host || 'unknown',
      database: conn.name || 'unknown',
    };

    // Check connection state
    if (conn.readyState !== 1) {
      result.status = 'unhealthy';
      result.issues.push(`Connection state is: ${conn.readyState}`);
    }

    // Get collections and their stats
    const collections = await db.listCollections().toArray();
    
    console.log(`📊 Found ${collections.length} collections\n`);

    for (const collection of collections) {
      const stats = await db.collection(collection.name).stats();
      
      result.collections.push({
        name: collection.name,
        documentCount: stats.count,
        avgDocumentSize: stats.avgObjSize,
        storageSize: stats.storageSize,
      });

      // Get index info
      const indexes = await db.collection(collection.name).indexes();
      result.indexes.total += indexes.length;
      result.indexes.collections[collection.name] = indexes.length;

      // Check for potential issues
      if (stats.count > 0 && indexes.length === 0) {
        result.issues.push(`Collection '${collection.name}' has no indexes`);
      }
    }

    // Determine overall status
    if (result.issues.length > 0) {
      result.status = result.issues.some(i => i.includes('no indexes')) ? 'degraded' : 'healthy';
    }

    // Print results
    console.log('='.repeat(50));
    console.log(`Database Health: ${result.status.toUpperCase()}`);
    console.log('='.repeat(50));
    
    console.log('\n📡 Connection:');
    console.log(`  State: ${result.connection.state}`);
    console.log(`  Host: ${result.connection.host}`);
    console.log(`  Database: ${result.connection.database}`);

    console.log('\n📊 Indexes:');
    console.log(`  Total indexes: ${result.indexes.total}`);
    for (const [collection, count] of Object.entries(result.indexes.collections)) {
      console.log(`  ${collection}: ${count} indexes`);
    }

    console.log('\n📦 Collections:');
    for (const col of result.collections) {
      console.log(`  ${col.name}:`);
      console.log(`    Documents: ${col.documentCount.toLocaleString()}`);
      console.log(`    Avg size: ${(col.avgDocumentSize / 1024).toFixed(2)} KB`);
      console.log(`    Storage: ${(col.storageSize / (1024 * 1024)).toFixed(2)} MB`);
    }

    if (result.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      result.issues.forEach(issue => console.log(`  - ${issue}`));
    }

    console.log('\n' + '='.repeat(50));

    await mongoose.disconnect();
    
    // Exit with appropriate code
    process.exit(result.status === 'unhealthy' ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Health check failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

healthCheck();
