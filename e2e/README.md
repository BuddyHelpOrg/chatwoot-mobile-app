# E2E Testing with Appium and Jest

This directory contains end-to-end tests for the BuddyHelp mobile app using Appium and Jest.

## Prerequisites

- Node.js and pnpm installed
- Appium server installed: `pnpm add -g appium`
- Appium drivers installed:
  - iOS: `appium driver install xcuitest`
  - Android: `appium driver install uiautomator2`
- iOS: Xcode with simulators
- Android: Android Studio with emulators

## Directory Structure

- `android/specs/` - Android test cases
- `ios/specs/` - iOS test cases
- `utils/` - Helper utilities
- `config/` - Test configuration files
- `screenshots/` - Generated test screenshots
- `reports/` - Generated test reports

## Running Tests

### Start Appium Server

You need to have an Appium server running before tests. The tests will attempt to start one automatically, but you can also start it manually:

```bash
appium --address 127.0.0.1 --port 4723 --log-level info --base-path /wd/hub
```

### Run iOS Tests

```bash
pnpm test:e2e:ios
```

For verbose output:

```bash
pnpm test:e2e:ios:verbose
```

### Run Android Tests

```bash
pnpm test:e2e:android
```

For verbose output:

```bash
pnpm test:e2e:android:verbose
```

### Run All Tests

```bash
pnpm test:e2e:all
```

### Run with Credentials

To run tests with real credentials:

```bash
TEST_USER_EMAIL=your@email.com TEST_USER_PASSWORD=yourpassword EXPO_PUBLIC_CHATWOOT_BASE_URL=https://app.chatwoot.com pnpm test:e2e:all
```

Or use the predefined script (update with your credentials first):

```bash
pnpm test:e2e:with-creds
```

## Test Reports

Test results are displayed in the console with Jest's output format. Screenshots are saved to the `screenshots/` directory.

To view a summary of recent test runs:

```bash
pnpm test:e2e:report
```

## Troubleshooting

### Common Issues

1. **App not installed**: Ensure you have built the app for the target platform:
   ```bash
   pnpm build:ios:local
   pnpm build:android:local
   ```

2. **Appium server not starting**: Check if there's already an Appium instance running on port 4723.

3. **Device not found**: Ensure you have a simulator/emulator available.

4. **Test fails to find elements**: Check the screenshots in the `screenshots/` directory to see what the app state was during the test.

### Debugging Tips

- Use verbose mode to see more details
- Check the screenshots generated during test runs
- XML page sources are saved when errors occur for debugging purposes

## Creating New Tests

Follow the existing pattern using Jest's describe/it format. Each test should:

1. Use descriptive names for tests
2. Have proper assertions and error handling
3. Take screenshots at key steps
4. Implement proper error reporting

Example:

```javascript
describe('Feature Test', () => {
  // Setup code
  
  it('should perform specific action', async () => {
    // Test code
    expect(result).toBe(expectedValue);
  });
});
```