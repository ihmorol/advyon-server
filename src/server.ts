import { createServer, Server } from 'http';
import mongoose from 'mongoose';
import app from './app';
import seedSuperAdmin from './app/DB';
import config from './app/config';
import { socketService } from './app/modules/socket/socket.service';

let server: Server;

async function main() {
  try {
    const connectionOptions: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 30000,
    };

    // Add retry logic for production resilience
    const connectWithRetry = async () => {
      const maxRetries = 5;
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          await mongoose.connect(config.database_url as string, connectionOptions);
          console.log('✅ MongoDB Atlas connected successfully');
          return;
        } catch (err) {
          retries++;
          console.log(`MongoDB connection attempt ${retries}/${maxRetries} failed:`, err);
          if (retries >= maxRetries) {
            console.error('❌ Max retries reached. Shutting down...');
            process.exit(1);
          }
          // Exponential backoff: 2s, 4s, 8s, 16s, 32s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        }
      }
    };

    await connectWithRetry();

    // MongoDB connection event listeners for monitoring
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB Atlas');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    seedSuperAdmin().catch((err) => console.error('Super admin seeding failed:', err.message));
    
    // Create HTTP server for both Express and Socket.io
    server = createServer(app);
    
    // Initialize WebSocket service (Phase 8)
    socketService.initialize(server);
    
    server.listen(config.port, () => {
      console.log(`🚀 Server listening on port ${config.port}`);
      console.log(`📡 WebSocket server ready`);
    });
  } catch (err) {
    console.log(err);
  }
}

main();

process.on('unhandledRejection', (err) => {
  console.log(`😈 unahandledRejection is detected , shutting down ...`, err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

process.on('uncaughtException', () => {
  console.log(`😈 uncaughtException is detected , shutting down ...`);
  process.exit(1);
});
