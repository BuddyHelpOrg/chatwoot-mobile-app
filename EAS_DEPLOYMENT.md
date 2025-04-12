# EAS Deployment Guide: Persistent Staging Flow

This guide explains our EAS setup using a Persistent Staging Flow for testing and deploying updates.

## Overview

We use two persistent branches for deploying updates:
- `staging`: For internal testing before production
- `production`: For live user updates

## Initial Setup

### 1. Create build profiles:

```bash
# Create a development build (for local testing)
eas build --profile development --platform all

# Create a staging build (for internal testers)
eas build --profile staging --platform all

# Create a production build (for app stores)
eas build --profile production --platform all
```

### 2. Install Staging Builds on Test Devices

Staging builds are distributed internally and can be installed on test devices without going through app stores.

### 3. Submit Production Builds to App Stores

```bash
# Submit production build to app stores
eas submit --profile production --platform all
```

## Deployment Workflow

### For Testing (Staging)

1. Develop features on feature branches
2. Merge completed features to `staging` branch
3. GitHub Actions automatically publishes an update to the `staging` channel
4. Test the update on internal staging builds

### For Production

1. After thorough testing, merge `staging` into `main` or `master`
2. GitHub Actions automatically publishes an update to the `production` channel
3. All production builds receive the update over-the-air

## Manual Update Commands

If needed, you can manually publish updates:

```bash
# Update staging
eas update --branch staging

# Update production
eas update --branch production
```

## Tracking Runtime Versions

We use auto runtime versioning to ensure updates are only delivered to compatible builds.

## Setting Up New Devices

For new team members or devices:
1. Provide them with the link to download the latest staging build
2. Have them install the build using `eas-cli` or by scanning the QR code

## Troubleshooting

- **Updates not appearing**: Make sure your build's runtime version is compatible with the update
- **Build failures**: Check EAS build logs and ensure all environment variables are properly set
- **Failed updates**: Check that the update is published to the correct branch and channel

## GitHub Actions

Continuous deployment is handled through GitHub Actions:
- Push to `staging` branch → auto-update to staging channel
- Push to `main` branch → auto-update to production channel

## Environment Variables

Make sure to add your `EXPO_TOKEN` to GitHub repository secrets. 