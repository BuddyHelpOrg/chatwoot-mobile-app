#!/bin/bash

# This script promotes updates from staging to production
# Usage: ./scripts/promote-update.sh

# Check if eas-cli is installed
if ! command -v eas &> /dev/null
then
    echo "eas-cli could not be found. Please install it with: npm install -g eas-cli"
    exit 1
fi

# Make sure we're logged in
if ! eas whoami &> /dev/null
then
    echo "You're not logged in to EAS. Please run 'eas login' first."
    exit 1
fi

echo "This will promote the latest update from staging to production."
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

# Get the latest update from staging
LATEST_UPDATE=$(eas update:list --branch staging --limit 1 --json | jq -r '.[0].id')

if [ -z "$LATEST_UPDATE" ] || [ "$LATEST_UPDATE" == "null" ]
then
    echo "No updates found in staging branch."
    exit 1
fi

echo "Found latest update: $LATEST_UPDATE"
echo "Promoting to production..."

# Republish the update to production branch
eas update:republish --branch production --id $LATEST_UPDATE

echo "Update promoted to production successfully!" 