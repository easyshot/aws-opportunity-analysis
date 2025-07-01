// Frontend server for AWS Opportunity Analysis app
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const port = process.env.FRONTEND_PORT || 3123;
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8123';

// Serve static files
app.use(express.static('public'));

// Proxy API requests to the backend
app.use('/api', createProxyMiddleware({
  target: backendUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  },
  logLevel: 'debug'
}));

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`AWS Opportunity Analysis frontend server running on port ${port}`);
  console.log(`Open http://localhost:${port} in your browser to use the application`);
  console.log(`Proxying API requests to backend at ${backendUrl}`);
});