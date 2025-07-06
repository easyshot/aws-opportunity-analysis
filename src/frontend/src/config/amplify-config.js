// AWS Amplify Configuration
export const amplifyConfig = {
  // Authentication with Cognito
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-east-1_XXXXXXXXX',
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
      identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID || 'us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      loginWith: {
        oauth: {
          domain: process.env.REACT_APP_OAUTH_DOMAIN || 'your-domain.auth.us-east-1.amazoncognito.com',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: process.env.REACT_APP_REDIRECT_SIGN_IN || 'http://localhost:3000/',
          redirectSignOut: process.env.REACT_APP_REDIRECT_SIGN_OUT || 'http://localhost:3000/',
          responseType: 'code'
        },
        email: true,
        username: true
      }
    }
  },
  
  // API Gateway configuration
  API: {
    GraphQL: {
      endpoint: process.env.REACT_APP_GRAPHQL_ENDPOINT || 'https://xxxxxxxxxxxxxxxxxxxxxxxxxx.appsync-api.us-east-1.amazonaws.com/graphql',
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
      defaultAuthMode: 'userPool',
      apiKey: process.env.REACT_APP_API_KEY
    },
    REST: {
      'OpportunityAnalysisAPI': {
        endpoint: process.env.REACT_APP_API_ENDPOINT || 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod',
        region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
      }
    }
  },
  
  // Storage configuration
  Storage: {
    S3: {
      bucket: process.env.REACT_APP_S3_BUCKET || 'aws-opportunity-analysis-storage',
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
    }
  },
  
  // Analytics configuration
  Analytics: {
    Pinpoint: {
      appId: process.env.REACT_APP_PINPOINT_APP_ID || 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
    }
  },
  
  // Notifications configuration
  Notifications: {
    InAppMessaging: {
      Pinpoint: {
        appId: process.env.REACT_APP_PINPOINT_APP_ID || 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
      }
    }
  }
};

// AppSync Real-time Configuration
export const appSyncConfig = {
  url: process.env.REACT_APP_GRAPHQL_ENDPOINT || 'https://xxxxxxxxxxxxxxxxxxxxxxxxxx.appsync-api.us-east-1.amazonaws.com/graphql',
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  auth: {
    type: 'AMAZON_COGNITO_USER_POOLS'
  },
  disableOffline: false
};

// Development mode configuration
if (process.env.NODE_ENV === 'development') {
  // Use local backend for development
  amplifyConfig.API.REST.OpportunityAnalysisAPI.endpoint = 'http://localhost:8123';
}