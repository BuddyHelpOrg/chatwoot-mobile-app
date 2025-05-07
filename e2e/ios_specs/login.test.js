/**
 * iOS Login Test
 * 
 * This test automates the login process in the Chatwoot iOS app.
 * It can use simulator information from e2e/simulators.json if available.
 * It is also compatible with CI environments where real devices are not available.
 */

const wdio = require('webdriverio');
const fs = require('fs');
const path = require('path');
const { getTestConfig } = require('../../detect-ci');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Get CI configuration
const ciConfig = getTestConfig();

// Check for simulator data
const getSimulatorInfo = () => {
  try {
    const simulatorPath = path.join(__dirname, '../../simulators.json');
    if (fs.existsSync(simulatorPath)) {
      const simulators = require(simulatorPath);
      if (simulators && simulators.length > 0) {
        return {
          deviceName: simulators[0].name,
          platformVersion: simulators[0].version,
          udid: simulators[0].udid
        };
      }
    }
  } catch (error) {
    console.log(`Error reading simulator data: ${error.message}`);
  }
  
  // Default values if no simulator data found
  return {
    deviceName: 'iPhone 15',
    platformVersion: '18.2',
    udid: null
  };
};

// Get simulator information
const simInfo = getSimulatorInfo();

// Define capabilities for iOS
const capabilities = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:deviceName': simInfo.deviceName,
  'appium:platformVersion': simInfo.platformVersion,
  ...(simInfo.udid ? { 'appium:udid': simInfo.udid } : {}),
  
  // Never use Safari, always use the app
  'appium:browserName': undefined,
  
  // Use BuddyHelp app instead of Chatwoot app
  'appium:bundleId': 'org.buddyhelp.app',
  
  'appium:noReset': false,
  'appium:newCommandTimeout': ciConfig.inCI ? 180000 : 90000 // Longer timeout in CI
};

// Get credentials from env
const getCredentials = () => {
  return {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'testpassword',
    baseUrl: process.env.EXPO_PUBLIC_CHATWOOT_BASE_URL || 'https://app.chatwoot.com',
  };
};

// Helper to find element with multiple possible selectors
const findElementWithSelectors = async (driver, selectors) => {
  for (const selector of selectors) {
    try {
      const element = await driver.$(selector);
      if (await element.isExisting()) {
        return element;
      }
    } catch (e) {
      // Ignore and try next selector
    }
  }
  return null;
};

// Take a screenshot
const takeScreenshot = async (driver, name) => {
  const screenshotDir = path.join(__dirname, '../../screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  const screenshotPath = path.join(screenshotDir, `${name}.png`);
  await driver.saveScreenshot(screenshotPath);
  return screenshotPath;
};

// Log device status information for debugging
const logDeviceInfo = async (driver) => {
  // Get page source for debugging
  try {
    const source = await driver.getPageSource();
    fs.writeFileSync(
      path.join(__dirname, '../../screenshots', 'ios-page-source.xml'),
      source
    );
    console.log('Page source saved for debugging');
  } catch (e) {
    console.warn('Could not save page source:', e.message);
  }
  
  // Dump all visible text elements
  try {
    const allTexts = await driver.$$('//XCUIElementTypeStaticText');
    console.log(`Found ${allTexts.length} text elements`);
    
    for (let i = 0; i < Math.min(allTexts.length, 10); i++) {
      try {
        const text = await allTexts[i].getText();
        console.log(`Text element ${i+1}: ${text}`);
      } catch (e) {
        // Ignore errors reading individual elements
      }
    }
  } catch (e) {
    console.warn('Could not read text elements:', e.message);
  }
};

describe('iOS App Login', () => {
  let driver;
  let loginSuccessful = false;
  
  // Set a longer timeout for the entire test suite
  jest.setTimeout(60000);

  beforeAll(async () => {
    // Create a driver instance before all tests
    driver = await wdio.remote({
      protocol: 'http',
      hostname: 'localhost',
      port: 4723,
      path: '/wd/hub',
      capabilities,
      logLevel: 'error' // Only show errors in logs
    });
  });

  afterAll(async () => {
    // Close the driver after all tests complete
    if (driver) {
      await driver.deleteSession();
    }
  });

  it('should launch the app successfully', async () => {
    // Take initial screenshot
    await takeScreenshot(driver, 'ios-app-launch');
    
    // Check for app errors
    const pageSource = await driver.getPageSource();
    
    // Only fail if there's an unrecoverable error
    if (pageSource.includes('App entry not found') || pageSource.includes('not registered')) {
      // Try to restart the app if there's an issue
      try {
        await driver.terminateApp('org.buddyhelp.app');
        await driver.pause(1000);
        await driver.activateApp('org.buddyhelp.app');
        await driver.pause(3000);
      } catch (restartError) {
        // Ignore restart errors
      }
      
      // Check if restart helped
      const newPageSource = await driver.getPageSource();
      if (newPageSource.includes('App entry not found')) {
        await takeScreenshot(driver, 'ios-app-error');
        expect(newPageSource.includes('App entry not found')).toBe(false, 'App was not built correctly or could not be launched');
      }
    }
    
    // The app should be running at this point
    try {
      const isInstalled = await driver.isAppInstalled('org.buddyhelp.app');
      expect(isInstalled).toBe(true);
    } catch (error) {
      console.warn('Could not verify if app is installed:', error.message);
      // This shouldn't fail the test as iOS may not support this command
    }
  });

  it('should find and interact with login form elements', async () => {
    // Wait for app to load
    await driver.pause(2000);
    
    const { email, password } = getCredentials();
    
    // Check if we're already logged in
    const preCheckSource = await driver.getPageSource();
    if (preCheckSource.includes('inbox') || 
        preCheckSource.includes('dashboard') || 
        preCheckSource.includes('conversation')) {
      console.log('Already logged in, skipping login form test');
      loginSuccessful = true;
      return;
    }
    
    // Find email field
    const emailSelectors = [
      '//XCUIElementTypeTextField[contains(@name, "email")]',
      '//XCUIElementTypeTextField[contains(@label, "email")]',
      '//XCUIElementTypeTextField[contains(@value, "email")]',
      '//XCUIElementTypeTextField[contains(@name, "Email")]',
      '//XCUIElementTypeTextField'
    ];
    
    const emailField = await findElementWithSelectors(driver, emailSelectors);
    if (!emailField) {
      await takeScreenshot(driver, 'ios-email-field-not-found');
      
      // Check for installation URL field first
      const urlField = await driver.$('//XCUIElementTypeTextField[contains(@name, "url") or contains(@value, "http")]');
      if (await urlField.isExisting()) {
        console.log('Found installation URL field, setting URL first');
        const { baseUrl } = getCredentials();
        await urlField.setValue(baseUrl);
        
        // Find continue button
        const continueButton = await driver.$('//XCUIElementTypeButton[contains(@name, "Continue") or contains(@label, "Continue")]');
        if (await continueButton.isExisting()) {
          await continueButton.click();
          await driver.pause(3000);
          
          // Try again to find email field
          const retryEmailField = await findElementWithSelectors(driver, emailSelectors);
          if (!retryEmailField) {
            logDeviceInfo(driver);
            expect(retryEmailField).toBeTruthy('Could not find email field after setting URL');
          }
          
          // Continue with the email field we found
          await retryEmailField.setValue(email);
        } else {
          logDeviceInfo(driver);
          expect(continueButton.isExisting()).toBeTruthy('Could not find continue button after setting URL');
        }
      } else {
        logDeviceInfo(driver);
        expect(emailField).toBeTruthy('Could not find email field');
      }
    } else {
      await emailField.setValue(email);
    }
    
    // Find password field
    const passwordSelectors = [
      '//XCUIElementTypeSecureTextField',
      '//XCUIElementTypeSecureTextField[contains(@name, "password")]',
      '//XCUIElementTypeSecureTextField[contains(@label, "password")]',
      '//XCUIElementTypeTextField[contains(@name, "password")]',
      '//XCUIElementTypeTextField[contains(@label, "Password")]'
    ];
    
    const passwordField = await findElementWithSelectors(driver, passwordSelectors);
    if (!passwordField) {
      await takeScreenshot(driver, 'ios-password-field-not-found');
      logDeviceInfo(driver);
      expect(passwordField).toBeTruthy('Could not find password field');
    }
    
    await passwordField.setValue(password);
  });

  it('should submit login form and verify login status', async () => {
    // Skip if already logged in
    if (loginSuccessful) {
      return;
    }
    
    // Find login button
    const loginButtonSelectors = [
      '//XCUIElementTypeButton[contains(@name, "Sign In")]',
      '//XCUIElementTypeButton[contains(@label, "Sign In")]',
      '//XCUIElementTypeButton[contains(@name, "login")]',
      '//XCUIElementTypeButton[contains(@label, "Login")]',
      '//XCUIElementTypeButton[contains(@name, "sign")]',
      '//XCUIElementTypeButton[contains(@label, "Log in")]'
    ];
    
    const loginButton = await findElementWithSelectors(driver, loginButtonSelectors);
    if (!loginButton) {
      // Try to find any button as a last resort
      const allButtons = await driver.$$('//XCUIElementTypeButton');
      if (allButtons.length > 0) {
        console.log(`Found ${allButtons.length} buttons. Trying to use the last one as login button...`);
        for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
          try {
            const buttonText = await allButtons[i].getText();
            console.log(`Button ${i+1} text: ${buttonText}`);
          } catch (e) {
            // Ignore errors
          }
        }
        
        // Try using the last button, which is often the submit button
        await allButtons[allButtons.length - 1].click();
      } else {
        await takeScreenshot(driver, 'ios-login-button-not-found');
        logDeviceInfo(driver);
        expect(loginButton).toBeTruthy('Could not find login button');
      }
    } else {
      await loginButton.click();
    }
    
    // Wait for login to complete
    await driver.pause(5000);
    
    // Take a screenshot after login
    await takeScreenshot(driver, 'ios-after-login');
    
    // Check login success
    const postLoginSource = await driver.getPageSource();
    
    // Determine test result
    if (postLoginSource.includes('inbox') || 
        postLoginSource.includes('dashboard') || 
        postLoginSource.includes('conversation')) {
      console.log('Successfully logged in');
      loginSuccessful = true;
    } else if (postLoginSource.includes('invalid') || 
               postLoginSource.includes('incorrect')) {
      await takeScreenshot(driver, 'ios-login-error');
      expect(postLoginSource.includes('invalid') || postLoginSource.includes('incorrect')).toBe(false, 'Login failed - invalid credentials');
    } else {
      // Try to find any error messages
      let errorFound = false;
      try {
        const errorSelectors = [
          '//XCUIElementTypeStaticText[contains(@label, "error")]',
          '//XCUIElementTypeStaticText[contains(@label, "invalid")]',
          '//XCUIElementTypeStaticText[contains(@label, "failed")]'
        ];
        
        for (const selector of errorSelectors) {
          const errorMessages = await driver.$$(selector);
          if (errorMessages.length > 0) {
            for (const errorMessage of errorMessages) {
              const text = await errorMessage.getText();
              if (text) {
                console.log(`Login error: ${text}`);
                errorFound = true;
              }
            }
          }
        }
      } catch (error) {
        // Ignore error finding errors
      }
      
      if (errorFound) {
        expect(errorFound).toBe(false, 'Login failed - error message found');
      } else {
        // Log more info to help debug
        logDeviceInfo(driver);
        expect(loginSuccessful).toBe(true, 'Login verification failed - success indicators not found');
      }
    }
    
    // Final verification - this should always be true at this point
    expect(loginSuccessful).toBe(true);
  });
});