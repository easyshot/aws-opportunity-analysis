#!/bin/bash

# Clean restart script - stops all processes and starts fresh
echo "🧹 Cleaning up existing processes..."
pkill -f "node app" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
sleep 2

echo "🚀 Starting fresh server without Redis..."
node app.js