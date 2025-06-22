const Queue = require('bull');

const videoProcessingQueue = new Queue('video-processing', {
  redis: {
    host: process.env.REDIS_HOST ||'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  defaultJobOptions: {
    attempts: 1, 
    backoff: {
      type: 'exponential',
      delay: 1000, 
    },
    removeOnComplete: true, // Remove jobs from queue once completed
    timeout: 3600000, // Job timeout after 1 hour
  },
});

module.exports = videoProcessingQueue;
