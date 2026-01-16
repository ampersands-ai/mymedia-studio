#!/usr/bin/env node

/**
 * CI Helper Script: Parse test results and send report email via edge function
 * 
 * Usage: node scripts/send-test-report.js
 * 
 * Environment variables required:
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_ANON_KEY: Supabase anon key
 * - GITHUB_RUN_ID: GitHub Actions run ID
 * - GITHUB_REF_NAME: Branch name
 * - GITHUB_SHA: Commit SHA
 * - GITHUB_ACTOR: Author
 * - GITHUB_SERVER_URL: GitHub server URL
 * - GITHUB_REPOSITORY: Repository name
 */

import fs from 'fs';
import path from 'path';

const RESULTS_DIR = 'test-results';
const UNIT_RESULTS_FILE = path.join(RESULTS_DIR, 'unit-results.json');
const E2E_RESULTS_FILE = path.join(RESULTS_DIR, 'e2e-results.json');
const COVERAGE_FILE = path.join(RESULTS_DIR, 'coverage-summary.json');

async function main() {
  console.log('📊 Preparing test report...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const payload = {
    runId: process.env.GITHUB_RUN_ID || `local-${Date.now()}`,
    runType: 'all',
    trigger: process.env.GITHUB_RUN_ID ? 'ci' : 'manual',
    branch: process.env.GITHUB_REF_NAME || 'local',
    commitSha: process.env.GITHUB_SHA,
    author: process.env.GITHUB_ACTOR,
    logsUrl: process.env.GITHUB_RUN_ID 
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : undefined,
  };

  // Parse unit test results
  if (fs.existsSync(UNIT_RESULTS_FILE)) {
    console.log('📝 Parsing unit test results...');
    try {
      const unitResults = JSON.parse(fs.readFileSync(UNIT_RESULTS_FILE, 'utf-8'));
      payload.unit = parseVitestResults(unitResults);
      console.log(`   ✅ ${payload.unit.passed} passed, ❌ ${payload.unit.failed} failed`);
    } catch (err) {
      console.warn('⚠️ Could not parse unit test results:', err.message);
    }
  } else {
    console.log('ℹ️ No unit test results found at', UNIT_RESULTS_FILE);
  }

  // Parse coverage
  if (fs.existsSync(COVERAGE_FILE) && payload.unit) {
    console.log('📈 Parsing coverage data...');
    try {
      const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf-8'));
      payload.unit.coverage = {
        lines: coverage.total?.lines?.pct || 0,
        functions: coverage.total?.functions?.pct || 0,
        branches: coverage.total?.branches?.pct || 0,
        statements: coverage.total?.statements?.pct || 0,
      };
      console.log(`   📊 Lines: ${payload.unit.coverage.lines}%`);
    } catch (err) {
      console.warn('⚠️ Could not parse coverage:', err.message);
    }
  }

  // Parse E2E test results
  if (fs.existsSync(E2E_RESULTS_FILE)) {
    console.log('🌐 Parsing E2E test results...');
    try {
      const e2eResults = JSON.parse(fs.readFileSync(E2E_RESULTS_FILE, 'utf-8'));
      payload.e2e = parsePlaywrightResults(e2eResults);
      console.log(`   ✅ ${payload.e2e.passed} passed, ❌ ${payload.e2e.failed} failed`);
    } catch (err) {
      console.warn('⚠️ Could not parse E2E test results:', err.message);
    }
  } else {
    console.log('ℹ️ No E2E test results found at', E2E_RESULTS_FILE);
  }

  // Check if we have any results
  if (!payload.unit && !payload.e2e) {
    console.log('ℹ️ No test results found, skipping report');
    process.exit(0);
  }

  // Send to edge function
  console.log('📧 Sending test report...');
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-test-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Test report sent successfully!');
      console.log(`   Status: ${result.status}`);
      console.log(`   Tests: ${result.totalPassed}/${result.totalTests} passed`);
    } else {
      console.error('❌ Failed to send test report:', result.error || response.statusText);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error sending test report:', err.message);
    process.exit(1);
  }
}

/**
 * Parse Vitest JSON reporter output
 */
function parseVitestResults(results) {
  const testResults = results.testResults || [];
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const failedTests = [];
  let duration = 0;

  for (const file of testResults) {
    duration += file.endTime - file.startTime || 0;

    for (const test of file.assertionResults || []) {
      if (test.status === 'passed') {
        passed++;
      } else if (test.status === 'failed') {
        failed++;
        failedTests.push({
          name: test.fullName || test.title,
          file: file.name,
          error: test.failureMessages?.join('\n') || 'Unknown error',
        });
      } else if (test.status === 'skipped' || test.status === 'pending') {
        skipped++;
      }
    }
  }

  return {
    total: passed + failed + skipped,
    passed,
    failed,
    skipped,
    duration,
    failedTests,
  };
}

/**
 * Parse Playwright JSON reporter output
 */
function parsePlaywrightResults(results) {
  const suites = results.suites || [];
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const failedTests = [];
  const duration = results.stats?.duration || 0;

  function processSuite(suite) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result = test.results?.[0];
        
        if (test.status === 'expected' || result?.status === 'passed') {
          passed++;
        } else if (test.status === 'unexpected' || result?.status === 'failed') {
          failed++;
          failedTests.push({
            name: `${suite.title} > ${spec.title}`,
            file: spec.file || suite.file || 'unknown',
            error: result?.error?.message || 'Test failed',
          });
        } else if (test.status === 'skipped') {
          skipped++;
        }
      }
    }

    for (const childSuite of suite.suites || []) {
      processSuite(childSuite);
    }
  }

  for (const suite of suites) {
    processSuite(suite);
  }

  return {
    total: passed + failed + skipped,
    passed,
    failed,
    skipped,
    duration,
    failedTests,
  };
}

main();
