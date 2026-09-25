#!/bin/sh

# Xcode Cloud runs this right after cloning, before the Xcode build. It rebuilds
# the web app and copies it into the native project — the web assets
# (ios/App/App/public) are gitignored, so WITHOUT this the archived app would be
# empty and show a white screen. Same recipe as ~/workspace/cubes.

set -e

echo "▸ ci_post_clone: preparing Capacitor web assets"

# Node is preinstalled on Xcode Cloud images; make sure the repo's pinned pnpm is
# available (via corepack, falling back to a global install).
if ! command -v node >/dev/null 2>&1; then
  echo "node not found — installing via Homebrew"
  brew install node
fi
if command -v corepack >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@11.0.9 --activate
else
  npm install -g pnpm@11.0.9
fi

# Install the workspace and build the client bundle. The pnpm workspace lives at
# the repository root; qbr has three packages (shared, client, sim) but only
# the client's build output feeds the native app.
cd "$CI_PRIMARY_REPOSITORY_PATH"
pnpm install --frozen-lockfile
pnpm --filter @qbr/client build

# Copy the fresh web build into the native iOS project. `cap copy` moves web
# assets only; native deps come from the committed Package.swift, so a full
# `cap sync` isn't needed (and would risk regenerating committed files).
cd packages/client
pnpm exec cap copy ios

echo "▸ ci_post_clone: done"
