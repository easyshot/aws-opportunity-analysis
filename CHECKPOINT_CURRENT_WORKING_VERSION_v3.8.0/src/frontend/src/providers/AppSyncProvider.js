import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { fetchAuthSession } from 'aws-amplify/auth';
import { appSyncConfig } from '../config/amplify-config';

// GraphQL subscriptions and queries
import { ANALYSIS_UPDATES_SUBSCRIPTION, ANALYSIS_STATUS_QUERY } from '../graphql/analysisOperations';

const AppSyncContext = createContext();

export const useAppSync = () => {
  const context = useContext(AppSyncContext);
  if (!context) {
    throw new Error('useAppSync must be used within an AppSyncProvider');
  }
  return context;
};

export const AppSyncProvider = ({ children, user }) => {
  const [client, setClient] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    if (!user) return;

    const setupApolloClient = async () => {
      try {
        // Get auth token
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();

        if (!token) {
          console.error('No auth token available');
          return;
        }

        // HTTP Link for queries and mutations
        const httpLink = createHttpLink({
          uri: appSyncConfig.url
        });

        // Auth link to add authorization header
        const authLink = setContext(async (_, { headers }) => {
          const session = await fetchAuthSession();
          const token = session.tokens?.idToken?.toString();
          
          return {
            headers: {
              ...headers,
              authorization: token ? `Bearer ${token}` : '',
            }
          };
        });

        // WebSocket Link for subscriptions
        const wsLink = new WebSocketLink({
          uri: appSyncConfig.url.replace('https://', 'wss://').replace('/graphql', '/realtime'),
          options: {
            reconnect: true,
            connectionParams: async () => {
              const session = await fetchAuthSession();
              const token = session.tokens?.idToken?.toString();
              
              return {
                Authorization: token ? `Bearer ${token}` : '',
                host: new URL(appSyncConfig.url).hostname
              };
            },
            connectionCallback: (error) => {
              if (error) {
                console.error('WebSocket connection error:', error);
                setConnectionStatus('error');
              } else {
                console.log('WebSocket connected');
                setConnectionStatus('connected');
              }
            }
          }
        });

        // Split link to route queries/mutations to HTTP and subscriptions to WebSocket
        const splitLink = split(
          ({ query }) => {
            const definition = getMainDefinition(query);
            return (
              definition.kind === 'OperationDefinition' &&
              definition.operation === 'subscription'
            );
          },
          wsLink,
          authLink.concat(httpLink)
        );

        // Create Apollo Client
        const apolloClient = new ApolloClient({
          link: splitLink,
          cache: new InMemoryCache({
            typePolicies: {
              AnalysisResult: {
                fields: {
                  updatedAt: {
                    merge: (existing, incoming) => incoming
                  }
                }
              }
            }
          }),
          defaultOptions: {
            watchQuery: {
              errorPolicy: 'all',
              fetchPolicy: 'cache-and-network'
            },
            query: {
              errorPolicy: 'all',
              fetchPolicy: 'cache-first'
            }
          }
        });

        setClient(apolloClient);
        setConnectionStatus('connected');

      } catch (error) {
        console.error('Failed to setup Apollo Client:', error);
        setConnectionStatus('error');
      }
    };

    setupApolloClient();
  }, [user]);

  // Subscribe to analysis updates
  const subscribeToAnalysisUpdates = (callback) => {
    if (!client || !user) return null;

    try {
      const subscription = client.subscribe({
        query: ANALYSIS_UPDATES_SUBSCRIPTION,
        variables: {
          userId: user.userId || user.username
        }
      }).subscribe({
        next: ({ data }) => {
          if (data?.analysisUpdates) {
            callback(data.analysisUpdates);
          }
        },
        error: (error) => {
          console.error('Subscription error:', error);
          setConnectionStatus('error');
        }
      });

      return subscription;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      return null;
    }
  };

  // Get analysis status
  const getAnalysisStatus = async (analysisId) => {
    if (!client) return null;

    try {
      const result = await client.query({
        query: ANALYSIS_STATUS_QUERY,
        variables: { analysisId },
        fetchPolicy: 'network-only'
      });

      return result.data?.getAnalysisStatus;
    } catch (error) {
      console.error('Failed to get analysis status:', error);
      return null;
    }
  };

  // Publish analysis event (for testing)
  const publishAnalysisEvent = async (event) => {
    if (!client) return;

    try {
      // This would typically be done by the backend
      console.log('Publishing analysis event:', event);
    } catch (error) {
      console.error('Failed to publish analysis event:', error);
    }
  };

  const contextValue = {
    client,
    connectionStatus,
    subscribeToAnalysisUpdates,
    getAnalysisStatus,
    publishAnalysisEvent,
    isConnected: connectionStatus === 'connected'
  };

  if (!client) {
    return (
      <AppSyncContext.Provider value={contextValue}>
        <div className="appsync-loading">
          <p>Connecting to real-time services...</p>
        </div>
      </AppSyncContext.Provider>
    );
  }

  return (
    <AppSyncContext.Provider value={contextValue}>
      <ApolloProvider client={client}>
        {children}
      </ApolloProvider>
    </AppSyncContext.Provider>
  );
};