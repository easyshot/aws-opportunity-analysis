# AWS Opportunity Analysis - Troubleshooting Guide

## 🚨 Current Issues and Resolutions

### Issue 1: Port Conflict (EADDRINUSE)

**Problem**: Server fails to start with `Error: listen EADDRINUSE: address already in use :::8123`

**Root Cause**: Another process is using port 8123

**Solutions**:

#### Option A: Use the Enhanced Startup Script (Recommended)

```bash
# Make the script executable
chmod +x start-dev-no-redis.sh

# Run the enhanced startup script
./start-dev-no-redis.sh
```

This script will:

- ✅ Check for port conflicts
- ✅ Automatically kill conflicting processes
- ✅ Start both backend and frontend servers
- ✅ Provide clear status messages

#### Option B: Manual Port Resolution

```bash
# Check what's using port 8123
lsof -i :8123

# Kill the process using port 8123
lsof -ti:8123 | xargs kill -9

# Start the servers
npm run dev-all
```

#### Option C: Use Different Ports

```bash
# Set different ports via environment variables
export PORT=8124
export FRONTEND_PORT=3124
npm run dev-all
```

### Issue 2: Frontend Timeout Errors

**Problem**: Analysis times out after 120 seconds with `DOMException: The operation was aborted`

**Root Cause**: Complex analysis taking longer than expected

**Solutions**:

#### ✅ Enhanced Timeout Configuration (Implemented)

- **Base timeout**: 180 seconds (increased from 120)
- **Progressive timeout**: 240 seconds for complex operations
- **Retry timeout**: 144 seconds with optimized settings
- **Automatic retry**: Enabled with reduced settings

#### ✅ Optimized Default Settings (Implemented)

- **SQL Query Limit**: 200 (reduced from 300)
- **Truncation Limit**: 600,000 (reduced from 800,000)
- **Truncation**: Enabled by default
- **Timeout**: 180 seconds

#### Manual Settings Adjustment

If you still experience timeouts, you can manually adjust settings:

1. Open browser developer tools (F12)
2. Go to Console tab
3. Run this command to set more conservative settings:

```javascript
localStorage.setItem(
  "analysisSettings",
  JSON.stringify({
    sqlQueryLimit: 150,
    truncationLimit: 400000,
    enableTruncation: true,
    analysisTimeout: 240,
  })
);
```

### Issue 3: Backend Processing Delays

**Problem**: Backend completes analysis but frontend times out

**Root Cause**: Network latency or large response payloads

**Solutions**:

#### ✅ Enhanced Server Configuration (Implemented)

- **Server timeout**: 240 seconds
- **Keep-alive timeout**: 65 seconds
- **Headers timeout**: 66 seconds
- **Graceful shutdown**: Enabled

#### ✅ Progressive Timeout Strategy (Implemented)

- Frontend waits longer for complex operations
- Automatic retry with optimized settings
- Better error messages and user guidance

## 🔧 Quick Fix Commands

### For Port Conflicts:

```bash
# Kill all Node.js processes
pkill -f node

# Kill specific port processes
lsof -ti:8123 | xargs kill -9
lsof -ti:3123 | xargs kill -9

# Start with enhanced script
./start-dev-no-redis.sh
```

### For Timeout Issues:

```bash
# Clear browser cache and localStorage
# Then restart with enhanced settings
./start-dev-no-redis.sh
```

### For Complete Reset:

```bash
# Stop all processes
pkill -f node
pkill -f nodemon

# Clear ports
lsof -ti:8123 | xargs kill -9 2>/dev/null || true
lsof -ti:3123 | xargs kill -9 2>/dev/null || true

# Start fresh
./start-dev-no-redis.sh
```

## 📊 Performance Optimization Tips

### For Faster Analysis:

1. **Reduce SQL Query Limit**: Lower values = faster queries
2. **Enable Truncation**: Reduces data size
3. **Use Smaller Datasets**: Test with sample data first
4. **Check Network**: Ensure stable internet connection

### For Better Reliability:

1. **Use Enhanced Startup Script**: Handles conflicts automatically
2. **Monitor Server Logs**: Check for backend errors
3. **Clear Browser Cache**: Remove stale data
4. **Restart Servers**: Fresh start often helps

## 🚀 Recommended Workflow

### 1. Start Development Environment:

```bash
./start-dev-no-redis.sh
```

### 2. Verify Services:

- Backend: http://localhost:8123/health
- Frontend: http://localhost:3123

### 3. Test Analysis:

- Use sample data first
- Monitor progress indicators
- Check console for errors

### 4. If Issues Persist:

- Check server logs
- Clear browser cache
- Restart with enhanced script
- Contact support with error details

## 🔍 Debugging Commands

### Check Server Status:

```bash
# Check if servers are running
lsof -i :8123
lsof -i :3123

# Check server logs
tail -f server.log
```

### Check Browser Console:

```javascript
// Check current settings
console.log(JSON.parse(localStorage.getItem("analysisSettings")));

// Reset settings to defaults
localStorage.removeItem("analysisSettings");
location.reload();
```

### Monitor Network:

```bash
# Check network connectivity
curl http://localhost:8123/health
curl http://localhost:3123
```

## 📞 Support Information

If issues persist after trying these solutions:

1. **Collect Error Information**:

   - Server logs
   - Browser console errors
   - Network tab information

2. **Environment Details**:

   - Node.js version: `node --version`
   - NPM version: `npm --version`
   - OS: `uname -a`

3. **Contact Support** with:
   - Error messages
   - Steps to reproduce
   - Environment details
   - Screenshots if applicable

---

**Last Updated**: January 2025
**Version**: Enhanced Timeout Fix v1.0
