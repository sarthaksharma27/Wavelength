require('dotenv').config({ path: '../.env' });
const videoProcessingQueue = require('../config/queue');
const { startMerging } = require('../merge');
const prisma = require("../prisma/client");
const IORedis = require('ioredis');

// Setup pub connection
const redisPub = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
});

videoProcessingQueue.process(async (job) => {
  console.log(`[Worker] Starting video processing for room: ${job.data.roomId}`);

  try {
    const result = await startMerging(job.data.roomId);

    job.progress(100);
    console.log(`[Worker] Successfully processed video for room: ${job.data.roomId}`);
    console.log("This is the result", result);

    await prisma.recording.upsert({
      where: { roomId: job.data.roomId },
      update: {
        videoUrl: result,
        userId: job.data.userId,
      },
      create: {
        roomId: job.data.roomId,
        userId: job.data.userId,
        videoUrl: result,
      },
    });

    console.log("videourl added");

    // Publish event to Redis pub/sub
    await redisPub.publish('job-events', JSON.stringify({
      jobId: job.id,
      roomId: job.data.roomId,
    }));

  } catch (error) {
    console.error(`[Worker] Error processing video for room: ${job.data.roomId}:`, error);
    throw error;
  }
});

videoProcessingQueue.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed for room: ${job.data.roomId}`);
});

videoProcessingQueue.on('failed', (job, error) => {
  console.error(`[Worker] Job ${job.id} failed for room: ${job.data.roomId}:`, error);
});

console.log('[Worker] Video processing worker is running');
