import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

// Components
import Layout from './components/Layout/Layout';
import OpportunityAnalysis from './components/OpportunityAnalysis/OpportunityAnalysis';
import Dashboard from './components/Dashboard/Dashboard';
import Settings from './components/Settings/Settings';
import LoadingSpinner from './components/UI/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

// Providers
import { AppSyncProvider } from './providers/AppSyncProvider';
import { CacheProvider } from './providers/CacheProvider';
import { NotificationProvider } from './providers/NotificationProvider';

// Styles
import '@aws-amplify/ui-react/styles.css';
import './App.css';

// Create React Query client with offline support
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst'
    },
    mutations: {
      retry: 2,
      networkMode: 'offlineFirst'
    }
  }
});

// Custom Authenticator components
const components = {
  Header() {
    return (
      <div className="auth-header">
        <h1>AWS Opportunity Analysis</h1>
        <p>Analyze business opportunities using AWS Bedrock and historical project data</p>
      </div>
    );
  },
  Footer() {
    return (
      <div className="auth-footer">
        <p>&copy; 2025 AWS Opportunity Analysis. All rights reserved.</p>
      </div>
    );
  }
};

const formFields = {
  signIn: {
    username: {
      placeholder: 'Enter your email address',
      isRequired: true,
      label: 'Email Address'
    },
    password: {
      placeholder: 'Enter your password',
      isRequired: true,
      label: 'Password'
    }
  },
  signUp: {
    email: {
      placeholder: 'Enter your email address',
      isRequired: true,
      label: 'Email Address',
      order: 1
    },
    given_name: {
      placeholder: 'Enter your first name',
      isRequired: true,
      label: 'First Name',
      order: 2
    },
    family_name: {
      placeholder: 'Enter your last name',
      isRequired: true,
      label: 'Last Name',
      order: 3
    },
    password: {
      placeholder: 'Enter your password',
      isRequired: true,
      label: 'Password',
      order: 4
    },
    confirm_password: {
      placeholder: 'Confirm your password',
      isRequired: true,
      label: 'Confirm Password',
      order: 5
    }
  }
};

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CacheProvider>
          <NotificationProvider>
            <Authenticator
              components={components}
              formFields={formFields}
              hideSignUp={false}
              socialProviders={['google', 'amazon']}
              variation="modal"
            >
              {({ signOut, user }) => (
                <AppSyncProvider user={user}>
                  <Router>
                    <div className="App">
                      <Layout user={user} signOut={signOut}>
                        <Routes>
                          <Route path="/" element={<OpportunityAnalysis />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/settings" element={<Settings />} />
                        </Routes>
                      </Layout>
                    </div>
                  </Router>
                </AppSyncProvider>
              )}
            </Authenticator>
          </NotificationProvider>
        </CacheProvider>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;