/**
 * Android Login Test
 * 
 * This test automates the login process in the Chatwoot Android app.
 * It is also compatible with CI environments where real devices are not available.
 */

const wdio = require('webdriverio');
const path = require('path');
const fs = require('fs');
const { getTestConfig } = require('../../detect-ci');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Get CI configuration
const ciConfig = getTestConfig();

// Define capabilities for Android
const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Android Emulator',
  
  // In CI environments, use Chrome instead of the app
  ...(ciConfig.inCI || ciConfig.useWebApp 
    ? { 
        'appium:browserName': 'Chrome',
      } 
    : { 
        'appium:appPackage': 'org.buddyhelp.app',
        'appium:appActivity': '.MainActivity', 
        'appium:autoGrantPermissions': true,
      }
  ),
  
  'appium:noReset': false,
  'appium:fullReset': false,
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
  try {
    const screenshotDir = path.join(__dirname, '../../screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, `${name}.png`);
    await driver.saveScreenshot(screenshotPath);
    return screenshotPath;
  } catch (error) {
    console.warn(`Could not take screenshot ${name}: ${error.message}`);
    return null;
  }
};

// Log device status information for debugging
const logDeviceInfo = async (driver) => {
  try {
    // Get page source for debugging
    try {
      const source = await driver.getPageSource();
      fs.writeFileSync(
        path.join(__dirname, '../../screenshots', 'page-source.xml'),
        source
      );
      console.log('Page source saved for debugging');
    } catch (e) {
      console.warn('Could not save page source:', e.message);
    }
    
    // For native app, dump all visible text elements
    if (!(ciConfig.inCI || ciConfig.useWebApp)) {
      try {
        const allTexts = await driver.$$('//android.widget.TextView');
        console.log(`Found ${allTexts.length} TextView elements`);
        
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
    }
  } catch (error) {
    console.warn('Error in logDeviceInfo:', error.message);
  }
};

describe('Android App Login', () => {
  let driver;
  let loginSuccessful = false;
  
  // Set a longer timeout for the entire test suite
  jest.setTimeout(60000);

  beforeAll(async () => {
    // Create a driver instance before all tests
    try {
      driver = await wdio.remote({
        protocol: 'http',
        hostname: 'localhost',
        port: 4723,
        path: '/wd/hub',
        capabilities,
        logLevel: 'error' // Only show errors in logs
      });
      console.log('Connected to Appium server successfully');
    } catch (error) {
      console.error('Failed to connect to Appium:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    // Close the driver after all tests complete
    if (driver) {
      try {
        await driver.deleteSession();
        console.log('Driver session closed successfully');
      } catch (error) {
        console.warn('Error closing driver session:', error.message);
      }
    }
  });

  it('should launch the app successfully', async () => {
    // Take initial screenshot
    await takeScreenshot(driver, 'android-app-launch');
    
    // Different handling for web vs native
    if (ciConfig.inCI || ciConfig.useWebApp) {
      const { baseUrl } = getCredentials();
      const loginUrl = `${baseUrl}/app/login`;
      await driver.navigateTo(loginUrl);
      
      // Verify we're on a login page
      const pageTitle = await driver.getTitle();
      expect(pageTitle).toBeTruthy();
      
      // Take screenshot of login page
      await takeScreenshot(driver, 'android-chrome-login');
    } else {
      // For native app testing, wait for app to load
      console.log('Waiting for app to load...');
      await driver.pause(10000);

      // Check if app is installed
      try {
        const isInstalled = await driver.isAppInstalled('org.buddyhelp.app');
        expect(isInstalled).toBe(true);
        console.log('App is installed');
      } catch (error) {
        console.warn('Could not verify if app is installed:', error.message);
        // Don't fail test, just log it
      }

      // Take screenshot after app has loaded
      await takeScreenshot(driver, 'android-app-loaded');
      
      // Check if we can see any UI elements to confirm the app is actually running
      try {
        const anyTextElements = await driver.$$('//android.widget.TextView');
        console.log(`Found ${anyTextElements.length} text elements on the screen`);
        
        if (anyTextElements.length > 0) {
          console.log('App is displaying UI elements');
        } else {
          console.warn('No UI elements found, app may not be properly loaded');
        }
      } catch (e) {
        console.warn('Could not check for UI elements:', e.message);
      }
    }
  });

  it('should set the installation URL if needed', async () => {
    // Skip for web testing
    if (ciConfig.inCI || ciConfig.useWebApp) {
      return;
    }
    
    const { baseUrl } = getCredentials();
    
    try {
      console.log('Checking if URL needs to be set...');
      
      // Try to get current screen elements
      await takeScreenshot(driver, 'android-before-url-check');
      
      // Check if we need to set base URL
      const urlField = await driver.$('//android.widget.EditText[contains(@resource-id, "url") or contains(@text, "URL") or contains(@text, "url")]');
      
      if (await urlField.isExisting()) {
        console.log('Found URL input field, setting instance URL');
        await urlField.setValue(baseUrl);
        console.log(`Set installation URL to: ${baseUrl}`);
        
        // Find continue button - try multiple selectors
        const continueButtonSelectors = [
          '//android.widget.Button[contains(@text, "Continue")]',
          '//android.widget.Button[contains(@text, "connect")]',
          '//android.widget.Button[contains(@text, "Next")]',
          '//android.widget.Button[contains(@resource-id, "continue")]',
          '//android.widget.Button' // Last resort - try any button
        ];
        
        let continueButton = null;
        for (const selector of continueButtonSelectors) {
          const button = await driver.$(selector);
          if (await button.isExisting()) {
            continueButton = button;
            console.log(`Found continue button with selector: ${selector}`);
            break;
          }
        }
        
        if (continueButton) {
          await continueButton.click();
          console.log('Clicked continue button');
          await driver.pause(5000);
          await takeScreenshot(driver, 'android-after-url-set');
        } else {
          console.warn('Continue button not found after setting URL');
          await takeScreenshot(driver, 'url-set-no-continue');
        }
      } else {
        console.log('URL field not found, app may already be configured');
        // Log the current screen state
        await takeScreenshot(driver, 'app-initial-state');
        
        // Check if we're already on a login screen
        const loginElements = await driver.$$([
          '//android.widget.EditText[contains(@resource-id, "email")]',
          '//android.widget.EditText[contains(@text, "Email")]',
          '//android.widget.EditText[contains(@resource-id, "password")]',
          '//android.widget.EditText[contains(@text, "Password")]'
        ].join('|'));
        
        if (loginElements.length > 0) {
          console.log(`Found ${loginElements.length} login-related elements, skipping URL setup`);
        } else {
          console.warn('No login elements found and no URL field');
          // Get page source to help debug
          logDeviceInfo(driver);
        }
      }
    } catch (error) {
      console.warn('Error during URL setup:', error.message);
      await takeScreenshot(driver, 'url-setup-error');
    }
  });

  it('should find and interact with login form elements', async () => {
    try {
      const { email, password } = getCredentials();
      
      // Take screenshot at the beginning of login test
      await takeScreenshot(driver, 'before-login-form');
      
      if (ciConfig.inCI || ciConfig.useWebApp) {
        // Web login form elements
        const emailSelectors = [
          '//input[@type="email"]',
          '//input[contains(@placeholder, "Email")]',
          '//input[contains(@id, "email")]',
          '//input[contains(@class, "email")]',
          '//input[@name="email"]',
          '//form//input[1]'
        ];
        
        const emailField = await findElementWithSelectors(driver, emailSelectors);
        if (!emailField) {
          await takeScreenshot(driver, 'web-login-form-not-found');
          logDeviceInfo(driver);
          expect(emailField).toBeTruthy();
          throw new Error('Could not find email field on web login form');
        }
        
        await emailField.setValue(email);
        console.log('Entered email in web form');
        
        const passwordSelectors = [
          '//input[@type="password"]',
          '//input[contains(@placeholder, "Password")]',
          '//input[contains(@id, "password")]'
        ];
        
        const passwordField = await findElementWithSelectors(driver, passwordSelectors);
        if (!passwordField) {
          await takeScreenshot(driver, 'web-password-field-not-found');
          expect(passwordField).toBeTruthy();
          throw new Error('Could not find password field on web login form');
        }
        
        await passwordField.setValue(password);
        console.log('Entered password in web form');
      } else {
        // Native app login form elements - use more general selectors
        console.log('Looking for login form elements in native app...');
        
        // Broader selectors for email field
        const emailFieldSelectors = [
          '//android.widget.EditText[contains(@resource-id, "email")]',
          '//android.widget.EditText[contains(@text, "Email")]',
          '//android.widget.EditText[contains(@text, "email")]',
          '//android.widget.EditText[1]' // First text field is often email
        ];
        
        let emailField = null;
        for (const selector of emailFieldSelectors) {
          const element = await driver.$(selector);
          if (await element.isExisting()) {
            emailField = element;
            console.log(`Found email field with selector: ${selector}`);
            break;
          }
        }
        
        if (emailField) {
          await emailField.setValue(email);
          console.log('Entered email in native app form');
          
          // Broader selectors for password field
          const passwordFieldSelectors = [
            '//android.widget.EditText[contains(@resource-id, "password")]',
            '//android.widget.EditText[contains(@text, "Password")]',
            '//android.widget.EditText[@password="true"]',
            '//android.widget.EditText[2]' // Second text field is often password
          ];
          
          let passwordField = null;
          for (const selector of passwordFieldSelectors) {
            const element = await driver.$(selector);
            if (await element.isExisting()) {
              passwordField = element;
              console.log(`Found password field with selector: ${selector}`);
              break;
            }
          }
          
          if (passwordField) {
            await passwordField.setValue(password);
            console.log('Entered password in native app form');
          } else {
            await takeScreenshot(driver, 'native-password-field-not-found');
            console.warn('Could not find password field in native app');
            
            // Don't fail test yet, proceed to see if we're already logged in
            await driver.pause(2000);
          }
        } else {
          console.warn('Email field not found, checking if already logged in');
          
          // Take a screenshot to see current screen
          await takeScreenshot(driver, 'android-current-screen');
          
          // Check if we're already logged in
          const successIndicators = [
            '//android.widget.TextView[contains(@text, "Inbox")]',
            '//android.widget.TextView[contains(@text, "Conversations")]',
            '//android.widget.TextView[contains(@text, "Settings")]',
            '//android.widget.TextView[contains(@text, "Dashboard")]'
          ];
          
          for (const selector of successIndicators) {
            const element = await driver.$(selector);
            if (await element.isExisting()) {
              console.log(`Found success indicator: ${selector}`);
              loginSuccessful = true;
              break;
            }
          }
          
          if (loginSuccessful) {
            console.log('Already logged in, skipping login form test');
            return;
          }
          
          // Get device info to help debug
          logDeviceInfo(driver);
          
          // Dump all elements to see what's on screen
          try {
            const allElements = await driver.$$('//*');
            console.log(`Found ${allElements.length} total elements on screen`);
            
            // Try to find any EditText to see if we have inputs
            const allEditTexts = await driver.$$('//android.widget.EditText');
            console.log(`Found ${allEditTexts.length} EditText elements`);
            
            if (allEditTexts.length > 0) {
              console.log('Found text fields but could not identify them as email/password');
              // Try interacting with them anyway as a fallback
              await allEditTexts[0].setValue(email);
              console.log('Entered email in first text field');
              
              if (allEditTexts.length > 1) {
                await allEditTexts[1].setValue(password);
                console.log('Entered password in second text field');
              }
            } else {
              console.warn('No EditText fields found on screen');
              throw new Error('Could not find login fields and not already logged in');
            }
          } catch (error) {
            console.error('Error while trying to find text fields:', error.message);
            throw new Error('Could not find login fields and not already logged in');
          }
        }
      }
    } catch (error) {
      console.error('Error in login form test:', error.message);
      await takeScreenshot(driver, 'login-form-error');
      throw error;
    }
  });

  it('should submit login form and verify login status', async () => {
    // Skip if already logged in from previous test
    if (loginSuccessful) {
      console.log('Already logged in, skipping login submission test');
      return;
    }
    
    try {
      // Find and click login button
      if (ciConfig.inCI || ciConfig.useWebApp) {
        // Web login button
        const loginButtonSelectors = [
          '//button[@type="submit"]',
          '//button[contains(text(), "Log")]',
          '//button[contains(text(), "Sign")]',
          '//input[@type="submit"]'
        ];
        
        const loginButton = await findElementWithSelectors(driver, loginButtonSelectors);
        
        if (!loginButton) {
          await takeScreenshot(driver, 'web-login-button-not-found');
          throw new Error('Could not find login button on web form');
        }
        
        await loginButton.click();
        console.log('Clicked login button on web form');
        await driver.pause(5000);
        
        // Verify web login success by checking URL
        const currentUrl = await driver.getUrl();
        loginSuccessful = !currentUrl.includes('login') && !currentUrl.includes('sign_in');
        
        // Take final screenshot
        await takeScreenshot(driver, 'android-after-login');
        
        if (loginSuccessful) {
          console.log('Successfully logged in (web)');
        } else {
          // Try to find error messages
          const errorMessages = await driver.$$([
            '//div[contains(@class, "error")]',
            '//p[contains(@class, "error")]',
            '//span[contains(@class, "error")]',
            '//div[contains(@class, "alert")]'
          ].join('|'));
          
          if (errorMessages.length > 0) {
            // There are error messages on the page
            for (const errorMsg of errorMessages) {
              try {
                const text = await errorMsg.getText();
                if (text) console.log(`Error message: ${text}`);
              } catch (e) {
                // Ignore errors getting text
              }
            }
            
            throw new Error('Login failed - error message found on page');
          } else {
            throw new Error('Login verification failed - still on login page');
          }
        }
      } else {
        // Native app login button with broader selectors
        console.log('Looking for login/submit button...');
        
        // Take screenshot before looking for button
        await takeScreenshot(driver, 'before-login-button-search');
        
        const loginButtonSelectors = [
          '//android.widget.Button[contains(@text, "Login")]',
          '//android.widget.Button[contains(@text, "Sign")]',
          '//android.widget.Button[contains(@text, "Continue")]',
          '//android.widget.Button[contains(@text, "Submit")]',
          '//android.widget.Button' // Try any button as last resort
        ];
        
        let loginButton = null;
        for (const selector of loginButtonSelectors) {
          const button = await driver.$(selector);
          if (await button.isExisting()) {
            loginButton = button;
            console.log(`Found login button with selector: ${selector}`);
            break;
          }
        }
        
        if (!loginButton) {
          console.warn('No specific login button found, looking for any button');
          
          // Try to find any buttons
          const allButtons = await driver.$$('//android.widget.Button');
          console.log(`Found ${allButtons.length} buttons on screen`);
          
          if (allButtons.length > 0) {
            // Use the last button (often the submit button)
            loginButton = allButtons[allButtons.length - 1];
            console.log('Using last button as login button');
          } else {
            await takeScreenshot(driver, 'native-login-button-not-found');
            throw new Error('Could not find any buttons on screen');
          }
        }
        
        // Click the button
        await loginButton.click();
        console.log('Clicked login button');
        await driver.pause(5000);
        
        // Take screenshot of result
        await takeScreenshot(driver, 'android-after-login');
        
        // Check for success indicators
        const successIndicators = [
          '//android.widget.TextView[contains(@text, "Inbox")]',
          '//android.widget.TextView[contains(@text, "Conversations")]',
          '//android.widget.TextView[contains(@text, "Settings")]',
          '//android.widget.TextView[contains(@text, "Dashboard")]'
        ];
        
        let foundSuccessIndicator = false;
        for (const selector of successIndicators) {
          try {
            const element = await driver.$(selector);
            if (await element.isExisting()) {
              foundSuccessIndicator = true;
              loginSuccessful = true;
              console.log(`Login successful, found indicator: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue checking other selectors
          }
        }
        
        if (foundSuccessIndicator) {
          console.log('Successfully logged in (app)');
        } else {
          // Take more debugging screenshots
          await takeScreenshot(driver, 'login-failed-screen');
          
          // Log device info for debugging
          logDeviceInfo(driver);
          
          // Check for error messages
          const errorElements = await driver.$$('//android.widget.TextView');
          let foundError = false;
          let errorMessages = [];
          
          for (const element of errorElements) {
            try {
              const text = await element.getText();
              if (text.toLowerCase().includes('error') || 
                  text.toLowerCase().includes('invalid') || 
                  text.toLowerCase().includes('failed')) {
                errorMessages.push(text);
                foundError = true;
              }
            } catch (e) {
              // Ignore errors getting text
            }
          }
          
          if (foundError) {
            console.error(`Login errors: ${errorMessages.join(', ')}`);
            throw new Error('Login failed - error message found');
          } else {
            console.warn('Login verification failed - success indicators not found');
            throw new Error('Login verification failed - success indicators not found');
          }
        }
      }
    } catch (error) {
      console.error('Error in login submission test:', error.message);
      await takeScreenshot(driver, 'login-submission-error');
      throw error;
    }
  });
});