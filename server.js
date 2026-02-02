/**
 * StyleCode Numerator API Server
 * Sequential processing with queue management
 * Optimized for Heroku Basic Dyno
 */

const express = require('express');
const queueService = require('./queueService');
const plmService = require('./plmService');
const tokenService = require('./tokenService');
const jobService = require('./jobService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint
 */
app.get('/', (req, res) => {
  res.json({
    service: 'StyleCode Numerator API',
    version: '1.0.0',
    status: 'running',
    environment: tokenService.getConfigInfo().environment,
    tenant: tokenService.getConfigInfo().tenantId,
    endpoints: {
      health: 'GET /',
      assignStyleCode: 'POST /api/stylecode/assign',
      assignStyleCodeAsync: 'POST /api/stylecode/assign/async',
      jobStatus: 'GET /api/job/:jobId',
      queueStats: 'GET /api/queue/stats',
      tokenInfo: 'GET /api/token/info'
    }
  });
});

/**
 * Assign StyleCode to a style (Synchronous)
 * POST /api/stylecode/assign
 * Body: { "styleId": 10468 }
 * 
 * ⚠️  WARNING: May timeout on Heroku if queue is long (30s limit)
 * Use /api/stylecode/assign/async for production
 */
app.post('/api/stylecode/assign', async (req, res) => {
  try {
    const { styleId } = req.body;

    if (!styleId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: styleId'
      });
    }

    console.log(`\n📨 New StyleCode assignment request received (SYNC)`);
    console.log(`   StyleId: ${styleId}`);
    console.log(`   Request IP: ${req.ip}`);

    // Add to queue and wait for result
    const result = await queueService.addTask(
      () => plmService.processStyleCodeAssignment(styleId),
      `StyleId: ${styleId}`
    );

    res.json({
      success: true,
      message: 'StyleCode assigned successfully',
      data: result
    });

  } catch (error) {
    console.error(`❌ Error in /api/stylecode/assign:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});

/**
 * Assign StyleCode to a style (Asynchronous - Recommended for Heroku)
 * POST /api/stylecode/assign/async
 * Body: { "styleId": 10468 }
 * 
 * Returns immediately with jobId, client polls /api/job/:jobId for status
 * ✅ Prevents Heroku 30s timeout
 */
app.post('/api/stylecode/assign/async', async (req, res) => {
  try {
    const { styleId } = req.body;

    if (!styleId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: styleId'
      });
    }

    console.log(`\n📨 New StyleCode assignment request received (ASYNC)`);
    console.log(`   StyleId: ${styleId}`);
    console.log(`   Request IP: ${req.ip}`);

    // Create job
    const jobId = jobService.createJob('stylecode_assignment', { styleId });

    // Add to queue (non-blocking)
    queueService.addTask(
      async () => {
        try {
          jobService.updateJobStatus(jobId, 'processing');
          const result = await plmService.processStyleCodeAssignment(styleId);
          jobService.updateJobStatus(jobId, 'completed', { result });
          return result;
        } catch (error) {
          jobService.updateJobStatus(jobId, 'failed', { error: error.message });
          throw error;
        }
      },
      `StyleId: ${styleId}`
    ).catch(err => {
      // Error already logged in job service
      console.error(`Job ${jobId} failed:`, err.message);
    });

    // Return immediately
    res.json({
      success: true,
      message: 'StyleCode assignment job created',
      jobId: jobId,
      statusUrl: `/api/job/${jobId}`,
      polling: {
        recommended_interval: '2s',
        max_wait_time: '60s'
      }
    });

  } catch (error) {
    console.error(`❌ Error in /api/stylecode/assign/async:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get job status
 * GET /api/job/:jobId
 */
app.get('/api/job/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  const job = jobService.getJob(jobId);
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
      jobId: jobId
    });
  }

  res.json({
    success: true,
    data: job
  });
});

/**
 * Get all jobs
 * GET /api/jobs?status=completed
 */
app.get('/api/jobs', (req, res) => {
  const { status } = req.query;
  const jobs = jobService.getAllJobs(status);
  
  res.json({
    success: true,
    count: jobs.length,
    data: jobs
  });
});

/**
 * Get job statistics
 * GET /api/jobs/stats
 */
app.get('/api/jobs/stats', (req, res) => {
  const stats = jobService.getStats();
  res.json({
    success: true,
    data: stats
  });
});

/**
 * Get queue statistics
 * GET /api/queue/stats
 */
app.get('/api/queue/stats', (req, res) => {
  const stats = queueService.getStats();
  res.json({
    success: true,
    data: stats
  });
});

/**
 * Get token information
 * GET /api/token/info
 */
app.get('/api/token/info', (req, res) => {
  const tokenInfo = tokenService.getTokenInfo();
  const configInfo = tokenService.getConfigInfo();
  
  res.json({
    success: true,
    data: {
      token: tokenInfo,
      config: configInfo
    }
  });
});

/**
 * Refresh token manually
 * POST /api/token/refresh
 */
app.post('/api/token/refresh', async (req, res) => {
  try {
    await tokenService.refreshToken();
    const tokenInfo = tokenService.getTokenInfo();
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokenInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Batch StyleCode assignment
 * POST /api/stylecode/assign/batch
 * Body: { "styleIds": [10468, 10469, 10470] }
 */
app.post('/api/stylecode/assign/batch', async (req, res) => {
  try {
    const { styleIds } = req.body;

    if (!styleIds || !Array.isArray(styleIds) || styleIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid field: styleIds (must be non-empty array)'
      });
    }

    console.log(`\n📨 Batch StyleCode assignment request received`);
    console.log(`   Number of styles: ${styleIds.length}`);
    console.log(`   StyleIds: ${styleIds.join(', ')}`);

    // Add all to queue
    const promises = styleIds.map(styleId =>
      queueService.addTask(
        () => plmService.processStyleCodeAssignment(styleId),
        `StyleId: ${styleId}`
      ).catch(error => ({
        styleId,
        success: false,
        error: error.message
      }))
    );

    const results = await Promise.all(promises);

    const successCount = results.filter(r => r.success !== false).length;
    const failCount = results.length - successCount;

    res.json({
      success: true,
      message: `Batch processing completed: ${successCount} succeeded, ${failCount} failed`,
      summary: {
        total: styleIds.length,
        succeeded: successCount,
        failed: failCount
      },
      results: results
    });

  } catch (error) {
    console.error(`❌ Error in /api/stylecode/assign/batch:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Clear queue (for testing)
 * POST /api/queue/clear
 */
app.post('/api/queue/clear', (req, res) => {
  queueService.clear();
  res.json({
    success: true,
    message: 'Queue cleared'
  });
});

/**
 * Reset queue statistics (for testing)
 * POST /api/queue/reset-stats
 */
app.post('/api/queue/reset-stats', (req, res) => {
  queueService.resetStats();
  res.json({
    success: true,
    message: 'Statistics reset'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 StyleCode Numerator API Server Started');
  console.log('═'.repeat(70));
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${tokenService.getConfigInfo().environment}`);
  console.log(`🏢 Tenant: ${tokenService.getConfigInfo().tenantId}`);
  console.log(`⚙️  Optimized for: Heroku Basic Dyno (single instance)`);
  console.log('═'.repeat(70));
  console.log('\n📋 Available Endpoints:');
  console.log('   GET  /                              - Health check & info');
  console.log('   POST /api/stylecode/assign          - Assign StyleCode (sync - may timeout)');
  console.log('   POST /api/stylecode/assign/async    - Assign StyleCode (async - recommended)');
  console.log('   POST /api/stylecode/assign/batch    - Assign StyleCode (batch)');
  console.log('   GET  /api/job/:jobId                - Get job status');
  console.log('   GET  /api/jobs                      - Get all jobs');
  console.log('   GET  /api/jobs/stats                - Get job statistics');
  console.log('   GET  /api/queue/stats               - Get queue statistics');
  console.log('   POST /api/queue/clear               - Clear queue (testing)');
  console.log('   POST /api/queue/reset-stats         - Reset stats (testing)');
  console.log('   GET  /api/token/info                - Get token info');
  console.log('   POST /api/token/refresh             - Refresh token');
  console.log('═'.repeat(70));
  console.log('\n⚡ Heroku Optimization:');
  console.log('   Use /api/stylecode/assign/async to prevent 30s timeout');
  console.log('   Poll /api/job/:jobId every 2s to check status');
  console.log('═'.repeat(70) + '\n');
});

module.exports = app;
