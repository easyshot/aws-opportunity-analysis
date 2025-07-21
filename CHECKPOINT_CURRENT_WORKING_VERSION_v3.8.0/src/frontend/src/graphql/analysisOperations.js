import { gql } from '@apollo/client';

// Subscription for real-time analysis updates
export const ANALYSIS_UPDATES_SUBSCRIPTION = gql`
  subscription AnalysisUpdates($userId: String!) {
    analysisUpdates(userId: $userId) {
      id
      userId
      status
      step
      progress
      message
      results {
        metrics {
          predictedArr
          predictedMrr
          launchDate
          timeToLaunch
          confidence
          topServices
        }
        sections {
          analysisMethodology
          similarProjects
          detailedFindings
          predictionRationale
          riskFactors
        }
        query {
          generatedSql
          executionResults
        }
      }
      error
      timestamp
    }
  }
`;

// Query to get analysis status
export const ANALYSIS_STATUS_QUERY = gql`
  query GetAnalysisStatus($analysisId: ID!) {
    getAnalysisStatus(analysisId: $analysisId) {
      id
      status
      step
      progress
      message
      startTime
      endTime
      error
    }
  }
`;

// Query to get analysis history
export const ANALYSIS_HISTORY_QUERY = gql`
  query GetAnalysisHistory($userId: String!, $limit: Int, $nextToken: String) {
    getAnalysisHistory(userId: $userId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        userId
        opportunityName
        customerName
        region
        status
        results {
          metrics {
            predictedArr
            predictedMrr
            confidence
          }
        }
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

// Mutation to start analysis
export const START_ANALYSIS_MUTATION = gql`
  mutation StartAnalysis($input: StartAnalysisInput!) {
    startAnalysis(input: $input) {
      id
      status
      message
    }
  }
`;

// Mutation to cancel analysis
export const CANCEL_ANALYSIS_MUTATION = gql`
  mutation CancelAnalysis($analysisId: ID!) {
    cancelAnalysis(analysisId: $analysisId) {
      id
      status
      message
    }
  }
`;

// Query to get user preferences
export const USER_PREFERENCES_QUERY = gql`
  query GetUserPreferences($userId: String!) {
    getUserPreferences(userId: $userId) {
      userId
      preferences {
        defaultAnalysisType
        notifications {
          email
          push
          inApp
        }
        dashboard {
          defaultView
          refreshInterval
        }
        analysis {
          autoSave
          cacheResults
          showAdvancedOptions
        }
      }
      updatedAt
    }
  }
`;

// Mutation to update user preferences
export const UPDATE_USER_PREFERENCES_MUTATION = gql`
  mutation UpdateUserPreferences($input: UpdateUserPreferencesInput!) {
    updateUserPreferences(input: $input) {
      userId
      preferences {
        defaultAnalysisType
        notifications {
          email
          push
          inApp
        }
        dashboard {
          defaultView
          refreshInterval
        }
        analysis {
          autoSave
          cacheResults
          showAdvancedOptions
        }
      }
      updatedAt
    }
  }
`;

// Subscription for system notifications
export const SYSTEM_NOTIFICATIONS_SUBSCRIPTION = gql`
  subscription SystemNotifications($userId: String!) {
    systemNotifications(userId: $userId) {
      id
      type
      title
      message
      priority
      actions {
        label
        action
        primary
      }
      timestamp
      expiresAt
    }
  }
`;

// Query to get dashboard metrics
export const DASHBOARD_METRICS_QUERY = gql`
  query GetDashboardMetrics($userId: String!, $timeRange: String!) {
    getDashboardMetrics(userId: $userId, timeRange: $timeRange) {
      totalAnalyses
      successfulAnalyses
      averageConfidence
      topRegions {
        region
        count
        averageArr
      }
      topServices {
        service
        count
        frequency
      }
      analysisTimeline {
        date
        count
        averageArr
      }
      recentAnalyses {
        id
        opportunityName
        customerName
        confidence
        predictedArr
        createdAt
      }
    }
  }
`;

// Input types for TypeScript (if using TypeScript)
export const INPUT_TYPES = {
  StartAnalysisInput: `
    input StartAnalysisInput {
      userId: String!
      opportunityDetails: OpportunityDetailsInput!
      analysisType: AnalysisType!
      options: AnalysisOptionsInput
    }
  `,
  
  OpportunityDetailsInput: `
    input OpportunityDetailsInput {
      customerName: String!
      region: String!
      closeDate: String!
      opportunityName: String!
      description: String!
    }
  `,
  
  AnalysisOptionsInput: `
    input AnalysisOptionsInput {
      useNovaPremier: Boolean
      includeValidation: Boolean
      cacheResults: Boolean
      notifyOnCompletion: Boolean
    }
  `,
  
  UpdateUserPreferencesInput: `
    input UpdateUserPreferencesInput {
      userId: String!
      preferences: UserPreferencesInput!
    }
  `,
  
  UserPreferencesInput: `
    input UserPreferencesInput {
      defaultAnalysisType: AnalysisType
      notifications: NotificationPreferencesInput
      dashboard: DashboardPreferencesInput
      analysis: AnalysisPreferencesInput
    }
  `
};

// Enums
export const ENUMS = {
  AnalysisType: `
    enum AnalysisType {
      STANDARD
      NOVA_PREMIER
    }
  `,
  
  AnalysisStatus: `
    enum AnalysisStatus {
      PENDING
      STARTED
      QUERY_GENERATION
      DATA_RETRIEVAL
      ANALYSIS
      COMPLETED
      FAILED
      CANCELLED
    }
  `,
  
  NotificationType: `
    enum NotificationType {
      INFO
      SUCCESS
      WARNING
      ERROR
      SYSTEM
    }
  `
};