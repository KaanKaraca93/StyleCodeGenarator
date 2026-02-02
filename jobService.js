/**
 * Job Service
 * Manages async job status tracking for Heroku timeout prevention
 * Allows immediate response to client while processing continues
 */

class JobService {
  constructor() {
    this.jobs = new Map();
    this.maxJobHistory = 1000; // Keep last 1000 jobs in memory
  }

  /**
   * Create a new job
   * @param {string} type - Job type (e.g., 'stylecode_assignment')
   * @param {Object} payload - Job payload
   * @returns {string} Job ID
   */
  createJob(type, payload) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      type,
      payload,
      status: 'pending',
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null
    };

    this.jobs.set(jobId, job);
    
    // Cleanup old jobs if needed
    if (this.jobs.size > this.maxJobHistory) {
      this.cleanupOldJobs();
    }

    console.log(`📝 Job created: ${jobId} (${type})`);
    return jobId;
  }

  /**
   * Update job status
   * @param {string} jobId - Job ID
   * @param {string} status - New status
   * @param {Object} data - Additional data
   */
  updateJobStatus(jobId, status, data = {}) {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.warn(`⚠️  Job not found: ${jobId}`);
      return;
    }

    job.status = status;

    if (status === 'processing' && !job.startedAt) {
      job.startedAt = new Date();
    }

    if (status === 'completed' || status === 'failed') {
      job.completedAt = new Date();
      
      if (status === 'completed') {
        job.result = data.result || null;
      } else {
        job.error = data.error || 'Unknown error';
      }
    }

    this.jobs.set(jobId, job);
    console.log(`📝 Job updated: ${jobId} -> ${status}`);
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object} Job details
   */
  getJob(jobId) {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return null;
    }

    // Calculate duration
    let duration = null;
    if (job.startedAt) {
      const endTime = job.completedAt || new Date();
      duration = endTime - job.startedAt;
    }

    return {
      ...job,
      duration: duration ? `${duration}ms` : null
    };
  }

  /**
   * Get all jobs with optional filter
   * @param {string} status - Filter by status
   * @returns {Array} List of jobs
   */
  getAllJobs(status = null) {
    const jobs = Array.from(this.jobs.values());
    
    if (status) {
      return jobs.filter(job => job.status === status);
    }
    
    return jobs;
  }

  /**
   * Cleanup old completed jobs
   */
  cleanupOldJobs() {
    const jobs = Array.from(this.jobs.entries());
    
    // Sort by creation time
    jobs.sort((a, b) => a[1].createdAt - b[1].createdAt);
    
    // Keep only maxJobHistory jobs
    const toRemove = jobs.length - this.maxJobHistory;
    if (toRemove > 0) {
      for (let i = 0; i < toRemove; i++) {
        const [jobId, job] = jobs[i];
        if (job.status === 'completed' || job.status === 'failed') {
          this.jobs.delete(jobId);
          console.log(`🗑️  Cleaned up old job: ${jobId}`);
        }
      }
    }
  }

  /**
   * Get statistics
   * @returns {Object} Job statistics
   */
  getStats() {
    const jobs = Array.from(this.jobs.values());
    
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length
    };
  }

  /**
   * Clear all jobs (for testing)
   */
  clear() {
    this.jobs.clear();
    console.log('🗑️  All jobs cleared');
  }
}

// Create singleton instance
const jobService = new JobService();

module.exports = jobService;
