/**
 * Global teardown for E2E tests
 * Stops the Appium server after tests complete
 */

const fs = require('fs');
const path = require('path');

// Safely read file contents
const safeReadFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
};

// Safely kill a process by PID
const safeKillProcess = (pid) => {
  try {
    process.kill(parseInt(pid, 10));
    return true;
  } catch (error) {
    // Process may already be gone or could not be killed
    return false;
  }
};

module.exports = async () => {
  console.log('🧹 Cleaning up E2E test environment...');

  // Check if we have a PID file for the Appium server
  const pidFile = path.join(__dirname, '.appium-pid');
  
  if (fs.existsSync(pidFile)) {
    // Read the PID
    const pid = safeReadFile(pidFile);
    
    if (pid) {
      console.log(`🛑 Stopping Appium server (PID: ${pid})...`);
      
      // Try to kill the process
      const killed = safeKillProcess(pid);
      
      if (killed) {
        console.log('✅ Appium server stopped successfully');
      } else {
        console.log('ℹ️ Appium server may have already been stopped');
      }
    } else {
      console.log('⚠️ Could not read Appium PID from file');
    }
    
    // Always try to remove the PID file, even if we couldn't read it
    try {
      fs.unlinkSync(pidFile);
    } catch (error) {
      console.log('⚠️ Could not remove PID file:', error.message);
    }
  } else {
    console.log('ℹ️ No Appium server was started by the test runner');
  }
  
  console.log('✅ E2E test environment cleanup complete');
}; 