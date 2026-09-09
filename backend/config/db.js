const mongoose = require('mongoose');
const dns = require('dns');

// Use Google DNS for MongoDB Atlas SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

let connectionState = 'disconnected';
let connectionError = null;

async function connectMongo() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    connectionState = 'not-configured';
    console.warn('MONGODB_URI is not set. MongoDB persistence is disabled.');
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    connectionState = 'connected';
    return true;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      autoIndex: true,
    });

    connectionState = 'connected';
    connectionError = null;
    console.log('MongoDB connected successfully.');
    return true;
  } catch (error) {
  connectionState = 'error';
  connectionError = error.message;

  console.error('MongoDB connection failed:', error.message);
  console.error('MongoDB error details:', error);

  if (error.reason) {
    console.error('Server selection reason:', error.reason);
  }

  return false;
}
}

mongoose.connection.on('disconnected', () => {
  connectionState = 'disconnected';
  console.warn('MongoDB disconnected.');
});

mongoose.connection.on('error', (error) => {
  connectionState = 'error';
  connectionError = error.message;
  console.error('MongoDB connection error:', error.message);
});

function getMongoStatus() {
  return {
    state: connectionState,
    readyState: mongoose.connection.readyState,
    error: connectionError,
  };
}

module.exports = {
  connectMongo,
  getMongoStatus,
};