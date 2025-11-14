/**
 * One-Click Test Runner Dashboard
 *
 * Visual dashboard to run all tests and view results
 * Usage: npm run test:dashboard
 * Then open: http://localhost:3001
 */

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Test results storage
let testResults = {
  unit: null,
  e2e: null,
  load: null,
  lastRun: null,
  running: {
    unit: false,
    e2e: false,
    load: false,
  },
};

// === API ENDPOINTS ===

// Get test results
app.get('/api/results', (req, res) => {
  res.json(testResults);
});

// Run unit tests
app.post('/api/run/unit', (req, res) => {
  if (testResults.running.unit) {
    return res.status(400).json({ error: 'Unit tests already running' });
  }

  testResults.running.unit = true;
  res.json({ message: 'Unit tests started' });

  exec('npm run test:unit', (error, stdout, stderr) => {
    testResults.running.unit = false;
    testResults.unit = {
      success: !error,
      output: stdout + stderr,
      timestamp: new Date().toISOString(),
    };
    testResults.lastRun = new Date().toISOString();
  });
});

// Run E2E tests
app.post('/api/run/e2e', (req, res) => {
  if (testResults.running.e2e) {
    return res.status(400).json({ error: 'E2E tests already running' });
  }

  testResults.running.e2e = true;
  res.json({ message: 'E2E tests started' });

  exec('npm run test:e2e', (error, stdout, stderr) => {
    testResults.running.e2e = false;

    // Try to read JSON report
    let jsonReport = null;
    try {
      const reportPath = path.join(__dirname, '../../test-results/results.json');
      if (fs.existsSync(reportPath)) {
        jsonReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      }
    } catch (err) {
      console.error('Failed to read E2E report:', err);
    }

    testResults.e2e = {
      success: !error,
      output: stdout + stderr,
      jsonReport,
      timestamp: new Date().toISOString(),
    };
    testResults.lastRun = new Date().toISOString();
  });
});

// Run load tests (smoke test)
app.post('/api/run/load', (req, res) => {
  if (testResults.running.load) {
    return res.status(400).json({ error: 'Load tests already running' });
  }

  testResults.running.load = true;
  res.json({ message: 'Load tests started' });

  exec('npm run test:load:smoke', (error, stdout, stderr) => {
    testResults.running.load = false;
    testResults.load = {
      success: !error,
      output: stdout + stderr,
      timestamp: new Date().toISOString(),
    };
    testResults.lastRun = new Date().toISOString();
  });
});

// Run all tests
app.post('/api/run/all', (req, res) => {
  if (testResults.running.unit || testResults.running.e2e || testResults.running.load) {
    return res.status(400).json({ error: 'Tests already running' });
  }

  res.json({ message: 'All tests started' });

  // Run sequentially
  testResults.running.unit = true;
  exec('npm run test:unit', (error1, stdout1, stderr1) => {
    testResults.running.unit = false;
    testResults.unit = {
      success: !error1,
      output: stdout1 + stderr1,
      timestamp: new Date().toISOString(),
    };

    // Run E2E
    testResults.running.e2e = true;
    exec('npm run test:e2e', (error2, stdout2, stderr2) => {
      testResults.running.e2e = false;
      testResults.e2e = {
        success: !error2,
        output: stdout2 + stderr2,
        timestamp: new Date().toISOString(),
      };

      // Run Load
      testResults.running.load = true;
      exec('npm run test:load:smoke', (error3, stdout3, stderr3) => {
        testResults.running.load = false;
        testResults.load = {
          success: !error3,
          output: stdout3 + stderr3,
          timestamp: new Date().toISOString(),
        };
        testResults.lastRun = new Date().toISOString();
      });
    });
  });
});

// Serve dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Artifio.ai Test Dashboard                                ║
╠════════════════════════════════════════════════════════════╣
║  Dashboard: http://localhost:${PORT}                        ║
║                                                            ║
║  Features:                                                 ║
║    ✓ Run unit tests                                       ║
║    ✓ Run E2E tests                                        ║
║    ✓ Run load tests                                       ║
║    ✓ Run all tests (one-click)                           ║
║    ✓ View real-time results                              ║
║    ✓ Export test reports                                 ║
╚════════════════════════════════════════════════════════════╝
  `);
});
