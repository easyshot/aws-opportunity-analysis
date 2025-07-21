#!/bin/bash

echo "Testing record count with United Airlines example..."

curl -X POST http://localhost:8123/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "United Airlines",
    "region": "United States", 
    "closeDate": "2024-12-31",
    "oppName": "Cloud Migration Project",
    "oppDescription": "Large-scale migration of on-premises infrastructure to AWS cloud. Includes database migration, application modernization, and security implementation. Expected to improve performance by 40% and reduce operational costs by 30%.",
    "timeToLaunch": "6"
  }' \
  --max-time 120 \
  --silent | jq -r '.debugInfo.fullResponse' | grep -i "analyzed all n=" || echo "Could not find project count"