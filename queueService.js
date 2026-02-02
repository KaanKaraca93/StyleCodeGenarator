/**
 * Queue Service
 * Manages sequential processing of requests to prevent duplicate StyleCode assignments
 * Optimized for Heroku Basic Dyno (single instance)
 */

class QueueService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      inProgress: 0
    };
  }

  /**
   * Add a task to the queue
   * @param {Function} task - Async function to execute
   * @param {string} identifier - Task identifier for logging
   * @returns {Promise} Promise that resolves when task completes
   */
  async addTask(task, identifier) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        identifier,
        task,
        resolve,
        reject,
        addedAt: new Date(),
        status: 'pending'
      };

      this.queue.push(queueItem);
      this.stats.total++;

      console.log(`📥 Task added to queue: ${identifier} (Queue size: ${this.queue.length})`);

      // Start processing if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queue sequentially
   */
  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    if (this.queue.length === 0) {
      console.log('✅ Queue is empty, waiting for new tasks...');
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const queueItem = this.queue.shift();
      this.stats.inProgress++;

      console.log(`\n${'═'.repeat(70)}`);
      console.log(`🔄 Processing: ${queueItem.identifier}`);
      console.log(`   Queue ID: ${queueItem.id}`);
      console.log(`   Added at: ${queueItem.addedAt.toISOString()}`);
      console.log(`   Remaining in queue: ${this.queue.length}`);
      console.log(`${'═'.repeat(70)}`);

      try {
        queueItem.status = 'processing';
        const result = await queueItem.task();
        
        queueItem.status = 'completed';
        this.stats.completed++;
        this.stats.inProgress--;
        
        console.log(`✅ Task completed: ${queueItem.identifier}`);
        queueItem.resolve(result);
        
      } catch (error) {
        queueItem.status = 'failed';
        this.stats.failed++;
        this.stats.inProgress--;
        
        console.error(`❌ Task failed: ${queueItem.identifier}`);
        console.error(`   Error: ${error.message}`);
        queueItem.reject(error);
      }
    }

    this.isProcessing = false;
    console.log('\n✅ Queue processing completed\n');
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.queue.length,
      isProcessing: this.isProcessing,
      pendingTasks: this.queue.map(item => ({
        id: item.id,
        identifier: item.identifier,
        addedAt: item.addedAt,
        status: item.status
      }))
    };
  }

  /**
   * Clear queue (for testing purposes)
   */
  clear() {
    this.queue = [];
    this.isProcessing = false;
    console.log('🗑️  Queue cleared');
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      inProgress: 0
    };
    console.log('📊 Statistics reset');
  }
}

// Create singleton instance
const queueService = new QueueService();

module.exports = queueService;
