#!/bin/sh
set -e

# Xcode Cloud runs this right after cloning. Get to the repo root.
cd "$CI_PRIMARY_REPOSITORY_PATH"

# Capacitor pods are local paths into node_modules, so Node deps come first.
brew install node
brew install cocoapods

# Build the web app (CRA -> build/) and copy it into the iOS project + install pods.
npm ci
npm run build
npx cap sync ios
