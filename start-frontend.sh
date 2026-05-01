#!/bin/bash
echo "🎨 Starting LocalLens Frontend..."
cd "$(dirname "$0")/frontend"
npm install --silent 2>/dev/null
npm run dev
