/**
 * Jest configuration for E2E tests
 */

const path = require('path');

// Determine if jest-junit is available
let reporters = ['default'];
try {
  require('jest-junit');
  reporters.push(['jest-junit', {
    outputDirectory: './e2e/reports',
    outputName: 'junit.xml',
  }]);
} catch (e) {
  // jest-junit not available, just use default reporter
  console.log('Note: jest-junit not found, only using default reporter');
}

module.exports = {
  // Use a custom test environment suited for E2E tests
  testEnvironment: 'node',
  
  // Specify test match pattern
  testMatch: [
    '**/e2e/**/*.test.js'
  ],
  
  // Set timeout higher for E2E tests
  testTimeout: 90000,
  
  // Report configuration
  reporters,
  
  // Verbose output
  verbose: process.env.VERBOSE === 'true',
  
  // Setup file to run before tests - use absolute path
  globalSetup: path.resolve(__dirname, 'setup.js'),
  
  // Allow for cleanup after tests - use absolute path
  globalTeardown: path.resolve(__dirname, 'teardown.js'),
  
  // Make sure we can use modern JS features
  transform: {},
  
  // Don't transform node_modules
  transformIgnorePatterns: [
    '/node_modules/'
  ]
};