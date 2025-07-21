#!/bin/bash

# AWS Opportunity Analysis - Development Startup Script (No Redis)
# This script starts the development environment without Redis dependencies

echo "🚀 Starting AWS Opportunity Analysis Development Environment"
echo "=========================================================="

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $port is already in use"
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Function to kill processes on port
kill_port() {
    local port=$1
    echo "🔄 Attempting to free port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Check and handle port conflicts
echo "🔍 Checking port availability..."

# Check backend port (8123)
if ! check_port 8123; then
    echo "🔄 Attempting to free port 8123..."
    kill_port 8123
    if ! check_port 8123; then
        echo "❌ Could not free port 8123. Please manually stop the process using this port."
        echo "   You can use: lsof -ti:8123 | xargs kill -9"
        exit 1
    fi
fi

# Check frontend port (3123)
if ! check_port 3123; then
    echo "🔄 Attempting to free port 3123..."
    kill_port 3123
    if ! check_port 3123; then
        echo "❌ Could not free port 3123. Please manually stop the process using this port."
        echo "   You can use: lsof -ti:3123 | xargs kill -9"
        exit 1
    fi
fi

echo "✅ All ports are available"

# Set environment variables
export NODE_ENV=development
export PORT=8123
export FRONTEND_PORT=3123

# Start the backend server
echo "🚀 Starting backend server on port $PORT..."
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! check_port 8123; then
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Backend server started successfully"

# Start the frontend server
echo "🚀 Starting frontend server on port $FRONTEND_PORT..."
npm run dev-frontend &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

# Check if frontend started successfully
if ! check_port 3123; then
    echo "❌ Frontend failed to start"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Frontend server started successfully"

echo ""
echo "🎉 Development environment is ready!"
echo "=================================="
echo "📡 Backend: http://localhost:$PORT"
echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
echo "📊 Health Check: http://localhost:$PORT/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo "✅ Servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait 