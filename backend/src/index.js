const express = require('express');
const router = express.Router();

// Service status endpoint
router.get('/services', (req, res) => {
  res.json({
    services: [
      {
        id: 'backend',
        name: 'Backend',
        status: 'running',
        port: 3000,
        health: 'healthy',
        lastBuild: new Date(Date.now() - 2 * 60 * 1000).toISOString()
      },
      {
        id: 'frontend',
        name: 'Frontend',
        status: 'running',
        port: 3001,
        bundleSize: '2.1MB',
        lastBuild: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      },
      {
        id: 'admin-frontend',
        name: 'Admin Frontend',
        status: 'stopped',
        port: 3002,
        lastBuild: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      },
      {
        id: 'godot-client',
        name: 'Godot Client',
        status: 'development',
        version: '4.1.2',
        platform: 'Multi-platform'
      }
    ]
  });
});

// Project stats endpoint
router.get('/stats', (req, res) => {
  res.json({
    buildStatus: 'passing',
    tests: { passed: 42, total: 42 },
    coverage: 85
  });
});

module.exports = router;
