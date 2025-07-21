// Frontend server for AWS Opportunity Analysis app
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const port = process.env.FRONTEND_PORT || 3123;
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8123';

// Serve static files
app.use(express.static('public'));

// Proxy API requests to the backend with extended timeouts for long-running AI analysis
app.use('/api', createProxyMiddleware({
  target: backendUrl,
  changeOrigin: true,
  timeout: 300000, // 5 minutes - accommodate long AI processing times
  proxyTimeout: 300000, // 5 minutes - proxy-specific timeout
  pathRewrite: {
    '^/api': '/api'
  },
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      res.status(504).json({
        error: 'Gateway Timeout',
        message: 'The analysis request took too long to complete. Try enabling truncation or reducing the query limit.',
        code: err.code
      });
    } else {
      res.status(500).json({
        error: 'Proxy Error',
        message: err.message,
        code: err.code
      });
    }
  }
}));

// Serve index.html for root route only
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`AWS Opportunity Analysis frontend server running on port ${port}`);
  console.log(`Open http://localhost:${port} in your browser to use the application`);
  console.log(`Proxying API requests to backend at ${backendUrl}`);
});