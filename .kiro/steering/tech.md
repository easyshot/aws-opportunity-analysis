# Partner Opportunity Intelligence - Technical Stack

## Technology Stack
- **Backend**: Node.js with Express (currently using app-debug.js for stability)
- **Frontend**: Modern HTML5, CSS3, JavaScript (ES6+) with class-based architecture
- **UI Framework**: Vanilla JavaScript with modern web standards (no external frameworks)
- **AWS Services**:
  - AWS Bedrock (for AI/ML capabilities, Titan and Nova Premier models)
  - AWS Lambda (for serverless execution)
  - Amazon Athena (for SQL queries against data)
  - AWS Bedrock Agent (for prompt management)

## Dependencies (Minimal Configuration)
- **AWS SDK v3** (Core):
  - @aws-sdk/client-athena
  - @aws-sdk/client-bedrock-agent
  - @aws-sdk/client-bedrock-agent-runtime
  - @aws-sdk/client-bedrock-runtime
  - @aws-sdk/client-lambda
- **Backend** (Essential):
  - express: Web server framework
  - dotenv: Environment variable management
  - body-parser: Request body parsing
  - http-proxy-middleware: API proxying for frontend

## Development Dependencies
- nodemon: Auto-restart during development
- concurrently: Run multiple npm scripts simultaneously

## Modern Frontend Architecture

### UI Options Available
- **Option A**: Clean Professional Layout (minimal, closest to legacy)
- **Option B**: Enhanced Interactive Layout (modern with tabs and animations)
- **Option C**: Modern Dashboard Layout (active - full-featured with real-time updates)

### Frontend Features (Option C - Active)
- **Real-time Form Validation**: Instant feedback with visual indicators
- **Auto-save Functionality**: localStorage integration for data persistence
- **Progress Tracking**: Live completion percentage with animated progress bar
- **Character Counter**: Smart description validation with color coding
- **Interactive Animations**: Smooth transitions and hover effects
- **Responsive Design**: Mobile-first approach with flexible layouts
- **Modern CSS**: CSS Grid, Flexbox, custom properties, and animations
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

### JavaScript Architecture
- **Class-based Structure**: ES6+ classes for organized code architecture
- **Event-driven Design**: Modern event handling with proper delegation
- **Async/Await Pattern**: Modern promise handling for API calls
- **State Management**: localStorage for client-side state persistence
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Visual feedback during processing with animated indicators

## Build & Run Commands
```bash
# Install minimal dependencies (recommended)
npm install

# Start backend server only (debug mode - currently active)
npm start

# Start backend server with auto-restart
npm run dev

# Start backend server in debug mode (explicit)
npm run debug

# Start frontend server only
npm run frontend

# Start frontend server with auto-restart
npm run dev-frontend

# Start both backend and frontend servers (recommended for development)
npm run dev-all
```

## Environment Configuration
Required environment variables in `.env` file:
```
# AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Bedrock Prompt IDs
CATAPULT_QUERY_PROMPT_ID=Y6T66EI3GZ
CATAPULT_ANALYSIS_PROMPT_ID=FDUHITJIME
CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID=P03B9TO1Q1

# Lambda Function
CATAPULT_GET_DATASET_LAMBDA=catapult_get_dataset

# Athena Configuration
ATHENA_DATABASE=default
ATHENA_OUTPUT_LOCATION=s3://aws-athena-query-results/
```

- Ensure all prompt IDs are correct and match those configured in AWS Bedrock.
- Lambda function must have permissions for Athena and S3 as described in the README.

## Server Configuration
- **Backend server**: Runs on port 8123 by default (using app-debug.js for stability)
- **Frontend server**: Runs on port 3123 by default with proxy configuration
- **API Proxy**: Frontend automatically proxies `/api/*` requests to backend
- **Static Assets**: Frontend server serves static files from `/public` directory

## Application URLs
- **Main Application**: `http://localhost:3123/index-compact.html` (Option C - Modern Dashboard)
- **Alternative Options**:
  - Option A: `http://localhost:3123/index-compact-option-a.html`
  - Option B: `http://localhost:3123/index-compact-option-b.html`
  - Option C: `http://localhost:3123/index-compact-option-c.html`
- **Legacy Interface**: `http://localhost:3123/` (original interface)

## Data Processing Specifications

### Input Field Specifications
- **Customer Region**: Geographic regions (United States, Canada, Germany, Japan, etc.) - NOT AWS regions
- **Time to Launch**: Measured in months to achieve 80% of projected AWS Annual Recurring Revenue
- **Description Validation**: Minimum 50 characters with real-time character counting
- **Form Completion**: Real-time progress tracking with percentage completion

### Analysis Output Specifications
- **Six Core Analysis Areas**: Methodology, Findings, Risk Factors, Similar Projects, Rationale, Full Analysis
- **Dedicated Sections**: Separate Funding Options and Follow-On Opportunities sections
- **Top AWS Services**: Interactive service cards with icons, costs, and descriptions
- **Confidence Assessment**: Animated gauge with color-coded confidence levels (0-100%)

## Performance Optimizations
- **Minimal Dependencies**: Streamlined package.json for faster installation and startup
- **Efficient DOM Manipulation**: Modern JavaScript with minimal DOM queries
- **CSS Animations**: Hardware-accelerated CSS transitions and transforms
- **Lazy Loading**: Progressive content loading for better perceived performance
- **Caching Strategy**: localStorage for form data and intelligent API caching

## Browser Compatibility
- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile Support**: iOS Safari 13+, Chrome Mobile 80+
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Responsive Design**: Mobile-first approach with flexible breakpoints

## Development Workflow
- **Primary Interface**: Option C (Modern Dashboard) for all new development
- **Testing**: All three UI options maintained for comparison and testing
- **Debugging**: app-debug.js provides stable backend with comprehensive mock data
- **Hot Reload**: nodemon for automatic server restart during development