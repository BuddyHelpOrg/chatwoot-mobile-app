/**
 * Test Reporter Utility
 * Provides standardized test reporting for Appium tests
 */

const fs = require('fs');
const path = require('path');

// Status constants with emoji for better visibility
const TestStatus = {
  PASSED: '✅ PASS',
  FAILED: '❌ FAIL',
  WARNING: '⚠️ WARNING',
  INFO: 'ℹ️ INFO',
  STEP: '🔄 STEP'
};

// Create screenshots directory if it doesn't exist
const ensureScreenshotDir = () => {
  const screenshotDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  return screenshotDir;
};

// Helper to log with status
const logStatus = (status, message) => {
  console.log(`${status}: ${message}`);
};

// Log a step (used for verbose logging)
const logStep = (message) => {
  // This is only shown in verbose mode
  console.log(`${TestStatus.STEP} ${message}`);
};

// Take a screenshot and save it
const takeScreenshot = async (driver, name) => {
  try {
    const screenshotDir = ensureScreenshotDir();
    const screenshotPath = path.join(screenshotDir, `${name}.png`);
    await driver.saveScreenshot(screenshotPath);
    return screenshotPath;
  } catch (error) {
    // Don't fail test if screenshot fails
    console.log(`Could not save screenshot: ${error.message}`);
    return null;
  }
};

// Create a summary report object
const createTestReport = (testName, status, details = {}) => {
  return {
    testName,
    status,
    timestamp: new Date().toISOString(),
    details,
  };
};

// Save report to JSON file
const saveReport = (report) => {
  try {
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, `${report.testName.replace(/\s+/g, '-')}-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  } catch (error) {
    console.log(`Could not save report: ${error.message}`);
    return null;
  }
};

// Find element using multiple selectors with better error handling
const findElementWithSelectors = async (driver, selectors, elementType) => {
  for (const selector of selectors) {
    try {
      const element = await driver.$(selector);
      if (await element.isExisting()) {
        return { element, selector };
      }
    } catch (e) {
      // Ignore and try next selector
    }
  }
  return { element: null, selector: null };
};

module.exports = {
  TestStatus,
  logStatus,
  logStep,
  takeScreenshot,
  createTestReport,
  saveReport,
  findElementWithSelectors
}; 