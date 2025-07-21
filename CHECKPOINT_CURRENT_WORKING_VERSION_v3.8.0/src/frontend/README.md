# AWS Opportunity Analysis - React Frontend

This is the modern React frontend for the AWS Opportunity Analysis application, built with AWS Amplify integration.

## Features

- **Modern React Architecture**: Built with React 18 and functional components
- **AWS Amplify Integration**: Full integration with AWS Amplify for authentication, API, and real-time features
- **Cognito Authentication**: Secure user authentication with AWS Cognito
- **AppSync GraphQL Subscriptions**: Real-time updates using AWS AppSync
- **Client-side Caching**: Offline support with LocalForage and React Query
- **Responsive Design**: Mobile-first responsive design
- **Accessibility**: WCAG 2.1 compliant with screen reader support
- **Dark Mode**: Automatic dark mode support based on system preferences
- **Progressive Web App**: PWA capabilities for offline usage

## Technology Stack

- **React 18**: Modern React with hooks and concurrent features
- **AWS Amplify**: Authentication, API, and real-time subscriptions
- **Apollo Client**: GraphQL client for AppSync integration
- **React Query**: Server state management and caching
- **React Router**: Client-side routing
- **LocalForage**: Offline storage and caching
- **CSS3**: Modern CSS with CSS Grid and Flexbox

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- AWS account with Amplify, Cognito, and AppSync configured
- Backend API running (see main README)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Update `.env` with your AWS configuration:
```env
REACT_APP_USER_POOL_ID=your-user-pool-id
REACT_APP_USER_POOL_CLIENT_ID=your-client-id
REACT_APP_GRAPHQL_ENDPOINT=your-appsync-endpoint
# ... other configuration
```

### Development

Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000` and proxy API requests to the backend at `http://localhost:8123`.

### Building for Production

Build the application:
```bash
npm run build
```

The build artifacts will be in the `build/` directory.

## Architecture

### Component Structure

```
src/
├── components/
│   ├── Layout/              # Main application layout
│   ├── OpportunityAnalysis/ # Main analysis components
│   ├── Dashboard/           # Dashboard components
│   ├── Settings/            # Settings components
│   ├── UI/                  # Reusable UI components
│   └── ErrorBoundary/       # Error handling
├── providers/
│   ├── AppSyncProvider.js   # GraphQL and real-time subscriptions
│   ├── CacheProvider.js     # Client-side caching
│   └── NotificationProvider.js # Notification system
├── services/
│   └── opportunityAnalysisService.js # API service layer
├── graphql/
│   └── analysisOperations.js # GraphQL queries and mutations
└── config/
    └── amplify-config.js    # AWS Amplify configuration
```

### Key Features

#### Authentication
- AWS Cognito integration with Amplify UI
- Social login support (Google, Amazon)
- Secure token management
- Automatic session refresh

#### Real-time Updates
- AppSync GraphQL subscriptions for analysis progress
- Real-time notifications
- Connection status monitoring
- Automatic reconnection

#### Offline Support
- LocalForage for persistent storage
- React Query for intelligent caching
- Offline form data preservation
- Cache management interface

#### Responsive Design
- Mobile-first approach
- CSS Grid and Flexbox layouts
- Touch-friendly interfaces
- Adaptive navigation

## Configuration

### AWS Services Required

1. **Amazon Cognito**: User authentication
   - User Pool with email/username login
   - Identity Pool for AWS resource access
   - OAuth providers (optional)

2. **AWS AppSync**: GraphQL API and real-time subscriptions
   - GraphQL schema for analysis operations
   - Real-time subscriptions for progress updates
   - Cognito authorization

3. **Amazon API Gateway**: REST API integration
   - Proxy integration with backend
   - CORS configuration
   - Authentication integration

### Environment Variables

See `.env.example` for all required environment variables.

## Development Guidelines

### Code Style
- Use functional components with hooks
- Follow React best practices
- Implement proper error boundaries
- Use TypeScript-style prop validation

### Performance
- Lazy load components where appropriate
- Implement proper memoization
- Use React Query for server state
- Optimize bundle size

### Accessibility
- Use semantic HTML elements
- Implement proper ARIA labels
- Support keyboard navigation
- Test with screen readers

### Testing
- Unit tests with React Testing Library
- Integration tests for user flows
- E2E tests with Cypress (planned)
- Performance testing with Lighthouse

## Deployment

### AWS Amplify Hosting
1. Connect your Git repository to Amplify
2. Configure build settings
3. Set environment variables
4. Deploy automatically on push

### Manual Deployment
1. Build the application: `npm run build`
2. Upload to S3 bucket
3. Configure CloudFront distribution
4. Update DNS records

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify Cognito configuration
   - Check redirect URLs
   - Ensure proper IAM permissions

2. **API Connection Issues**
   - Verify backend is running
   - Check CORS configuration
   - Validate API endpoints

3. **Real-time Subscription Issues**
   - Check AppSync configuration
   - Verify WebSocket connectivity
   - Review authentication tokens

### Debug Mode

Enable debug mode by setting:
```env
REACT_APP_DEBUG=true
```

This will enable:
- Detailed console logging
- React Query DevTools
- Apollo Client DevTools
- Performance monitoring

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Test accessibility compliance
5. Verify mobile responsiveness

## License

This project is licensed under the MIT License.