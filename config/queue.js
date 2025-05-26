const Queue = require('bull');

// Create our job queue
const videoProcessingQueue = new Queue('video-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 1000, // Initial delay of 1 second
    },
    removeOnComplete: true, // Remove jobs from queue once completed
    timeout: 3600000, // Job timeout after 1 hour
  },
});

module.exports = videoProcessingQueue;
