/**
 * Global setup for E2E tests
 * Starts Appium server before running tests
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
let waitPort;

// Try to require wait-port, but handle case where it's not installed
try {
  waitPort = require('wait-port');
} catch (e) {
  // Provide a fallback implementation if wait-port is not available
  waitPort = async ({ host, port, timeout }) => {
    console.log(`wait-port package not found, using fallback to check if port ${port} is available`);
    
    // Simple implementation to check if port is open using node's net module
    const net = require('net');
    
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const start = Date.now();
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        socket.destroy();
        resolve({ open: false });
      }, timeout);
      
      // Try to connect
      socket.connect(port, host, () => {
        clearTimeout(timeoutId);
        socket.destroy();
        resolve({ open: true });
      });
      
      // Handle errors
      socket.on('error', () => {
        clearTimeout(timeoutId);
        socket.destroy();
        resolve({ open: false });
      });
    });
  };
}

// Create directories for test artifacts
const createDirs = () => {
  const dirs = [
    path.join(__dirname, 'screenshots'),
    path.join(__dirname, 'reports'),
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Start the Appium server
module.exports = async () => {
  console.log('🚀 Setting up E2E test environment...');
  
  // Create necessary directories
  createDirs();
  
  // No need to start Appium if it's already running
  try {
    const portStatus = await waitPort({
      host: 'localhost',
      port: 4723,
      timeout: 1000
    });
    
    if (portStatus.open) {
      console.log('✅ Appium server already running on port 4723');
      return;
    }
  } catch (error) {
    console.log('Could not check if Appium is running:', error.message);
    // Continue to start Appium anyway
  }
  
  console.log('🔄 Starting Appium server...');
  
  try {
    // Define Appium args
    const args = [
      '--address', '127.0.0.1',
      '--port', '4723',
      '--log-level', 'info',
      '--base-path', '/wd/hub'
    ];
    
    // Check if npx is available
    const command = 'npx';
    const appiumArgs = ['appium', ...args];
    
    // Start Appium as a child process
    const appiumProcess = spawn(command, appiumArgs, {
      detached: true,
      stdio: 'ignore'
    });
    
    // Check if process was created
    if (!appiumProcess.pid) {
      console.error('❌ Failed to start Appium server: No process ID returned');
      return;
    }
    
    // Store the PID in a file for teardown
    fs.writeFileSync(path.join(__dirname, '.appium-pid'), appiumProcess.pid.toString());
    
    // Detach the process so it continues running after this script exits
    appiumProcess.unref();
    
    // Wait for Appium to start
    console.log('⏳ Waiting for Appium server to be ready...');
    const portStatus = await waitPort({
      host: 'localhost',
      port: 4723,
      timeout: 10000
    });
    
    if (portStatus.open) {
      console.log('✅ Appium server started successfully');
    } else {
      console.warn('⚠️ Appium server may not have started correctly, but continuing anyway');
    }
  } catch (error) {
    console.error('❌ Error starting Appium:', error.message);
    console.warn('⚠️ Continuing tests anyway, but they may fail if Appium is not running');
  }
};