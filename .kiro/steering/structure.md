# Partner Opportunity Intelligence - Project Structure

## Directory Organization

### Root Level
- `app.js`: Main application entry point for the backend server (currently corrupted, using app-debug.js)
- `app-debug.js`: Debug version of the main application (currently active backend)
- `frontend-server.js`: Separate server for serving the frontend on port 3123
- `package.json`: Project dependencies and scripts (minimal version for core functionality)
- `package-minimal.json`: Streamlined dependencies for essential functionality
- `.env`: Environment variables (not committed to version control)

### `/automations`
Contains backend automation scripts that orchestrate the analysis workflow:
- `invokeBedrockQueryPrompt-v3.js`: Generates SQL queries using Bedrock (AWS SDK v3)
- `InvLamFilterAut-v3.js`: Executes SQL queries via Lambda (AWS SDK v3)
- `finalBedAnalysisPrompt-v3.js`: Analyzes data using standard Bedrock model (AWS SDK v3)
- `finalBedAnalysisPromptNovaPremier-v3.js`: Analyzes data using Nova Premier model (AWS SDK v3)
- (Legacy scripts without `-v3` suffix are retained for reference)

### `/config`
Configuration files for AWS services:
- `aws-config-v3.js`: AWS SDK v3 configuration (current standard)
- `aws-config.js`: Legacy AWS SDK configuration

### `/lambda`
AWS Lambda functions:
- `catapult_get_dataset-v3.js`: Executes SQL against Athena (AWS SDK v3)
- `catapult_get_dataset.js`: Legacy version

### `/public` - Modern Frontend Architecture
Multiple UI implementations with progressive enhancement:

#### Core Application Files
- `index-compact.html`: **Main application** (Option C - Modern Dashboard)
- `styles-compact.css`: **Main stylesheet** (Option C styles)
- `app-compact.js`: **Main JavaScript** (Option C functionality)

#### Alternative UI Options
- **Option A - Clean Professional**:
  - `index-compact-option-a.html`: Clean, minimal design closest to legacy layout
  - `styles-compact-option-a.css`: Professional styling with simple grid layout
  - `app-compact-option-a.js`: Straightforward functionality with basic UX
  
- **Option B - Enhanced Interactive**:
  - `index-compact-option-b.html`: Modern with interactive elements and tabbed sections
  - `styles-compact-option-b.css`: Enhanced styling with animations and visual feedback
  - `app-compact-option-b.js`: Advanced interactivity with progress tracking
  
- **Option C - Modern Dashboard** (Active):
  - `index-compact-option-c.html`: Contemporary dashboard with rich visual elements
  - `styles-compact-option-c.css`: Modern styling with gradients and animations
  - `app-compact-option-c.js`: Full-featured with real-time updates and advanced UX

#### Legacy Files (Maintained for Reference)
- `index.html`: Original application interface
- `styles.css`: Original styling
- `app.js`: Original JavaScript functionality
- `index-modern.html`: Early modern design iteration
- `styles-modern.css`: Early modern styling
- `app-modern.js`: Early modern functionality

## Modern Frontend Features

### Option C (Active) - Modern Dashboard Layout
- **Real-time Completion Tracking**: Live progress bar with percentage completion
- **Interactive Form Elements**: Smart validation with visual feedback
- **Character Counter**: Dynamic description field validation with color coding
- **Auto-save Functionality**: Automatic form data persistence using localStorage
- **Animated Metrics**: Smooth transitions and scaling effects for result display
- **Confidence Gauge**: Animated circular gauge with color-coded confidence levels
- **Modern Service Cards**: Interactive service recommendations with icons and hover effects
- **Grid/List View Toggle**: Flexible analysis result viewing options
- **Live Timestamps**: Real-time timestamp updates in header
- **Sample Data Loading**: Quick-load functionality for testing and demonstrations

### Enhanced Analysis Sections
- **Six Core Analysis Areas**: Methodology, Findings, Risk Factors, Similar Projects, Rationale, Full Analysis
- **Dedicated Funding Section**: Comprehensive funding options and investment strategies
- **Dedicated Follow-On Section**: Future growth opportunities and expansion potential
- **Interactive Content**: Rich formatting with visual elements, cards, and structured layouts

## Code Patterns

### Modern Frontend Architecture
Each UI option follows a consistent class-based pattern:
1. **Initialization**: Constructor sets up event listeners and loads saved data
2. **Form Management**: Real-time validation, auto-save, and completion tracking
3. **API Integration**: Async/await pattern for backend communication
4. **Result Display**: Dynamic content generation with rich formatting
5. **State Management**: localStorage integration for data persistence

### Backend Integration Pattern
- **Debug Mode**: Currently using `app-debug.js` for stable backend operation
- **Mock Data**: Rich sample data generation for comprehensive testing
- **Error Handling**: Graceful degradation with user-friendly error messages
- **Loading States**: Visual feedback during analysis processing

### AWS Integration Pattern
- AWS services are accessed through the AWS SDK v3
- Credentials and configuration are centralized in `config/aws-config-v3.js`
- Environment variables are used for sensitive information
- Bedrock prompt management is handled via prompt IDs in environment variables

### API Structure
- RESTful API endpoints in backend server
- Main endpoint: `/api/analyze` for opportunity analysis (supports both standard and Nova Premier flows)
- Mock endpoint: `/api/analyze/mock` for development/testing
- Frontend proxy: Port 3123 proxies API requests to backend on port 8123

## Version Naming Convention
- **UI Options**: `option-a`, `option-b`, `option-c` for different design approaches
- **AWS SDK**: Files with `-v3` suffix use AWS SDK v3 and are the current standard
- **Legacy Support**: Files without version suffix are retained for reference

## Data Flow

### Modern Frontend Flow
1. **User Input**: Interactive form with real-time validation and completion tracking
2. **Auto-save**: Automatic data persistence to localStorage
3. **Validation**: Client-side validation with visual feedback before submission
4. **API Call**: Async request to backend with loading state management
5. **Result Display**: Dynamic content generation with rich formatting and animations
6. **Export Options**: Professional export and print capabilities

### Backend Processing Flow
1. Frontend collects user input with enhanced validation
2. Backend processes the request through a series of automations:
   - `invokeBedrockQueryPrompt-v3` → `InvLamFilterAut-v3` → `finalBedAnalysisPrompt-v3` or `finalBedAnalysisPromptNovaPremier-v3`
3. Results are returned to the frontend for enhanced display with rich formatting

## Development Guidelines

### UI Development
- **Option C** is the primary interface for new development
- Maintain backward compatibility with Options A and B
- Follow modern web standards with responsive design
- Implement progressive enhancement for accessibility

### Code Standards
- Use ES6+ features with class-based architecture
- Implement proper error handling and user feedback
- Follow consistent naming conventions across all options
- Maintain separation of concerns between HTML, CSS, and JavaScript

### Performance Considerations
- Optimize for fast loading with minimal dependencies
- Implement efficient DOM manipulation and event handling
- Use CSS animations for smooth user experience
- Minimize API calls with intelligent caching