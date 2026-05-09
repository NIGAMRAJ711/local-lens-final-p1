#!/bin/bash
echo "🚀 Starting LocalLens Backend..."
cd "$(dirname "$0")/backend"
npm install --silent 2>/dev/null
node src/index.js
