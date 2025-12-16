import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Add connection options for better error handling and timeout
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error:`, error);
    console.error(`❌ Error details:`, {
      name: error.name,
      message: error.message,
      code: error.code,
      hostname: error.hostname
    });
    
    // Don't exit immediately - let the app handle the error
    // This prevents nodemon from crashing on network issues
    throw error;
  }
};

export default connectDB;





