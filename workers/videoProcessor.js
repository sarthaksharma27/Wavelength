require('dotenv').config();
const videoProcessingQueue = require('../config/queue');
const { startMerging } = require('../merge');

// Process jobs from the video processing queue
videoProcessingQueue.process(async (job) => {
  console.log(`[Worker] Starting video processing for room: ${job.data.roomId}`);
  
  try {
    // Process the video
    const result = await startMerging(job.data.roomId);
    
    // Update job progress
    job.progress(100);
    
    console.log(`[Worker] Successfully processed video for room: ${job.data.roomId}`);
    return result;
  } catch (error) {
    console.error(`[Worker] Error processing video for room: ${job.data.roomId}:`, error);
    throw error; // This will trigger the job retry mechanism
  }
});

// Handle completed jobs
videoProcessingQueue.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed for room: ${job.data.roomId}`);
});

// Handle failed jobs
videoProcessingQueue.on('failed', (job, error) => {
  console.error(`[Worker] Job ${job.id} failed for room: ${job.data.roomId}:`, error);
});

console.log('[Worker] Video processing worker is running');
