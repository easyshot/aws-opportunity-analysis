import React, { createContext, useContext, useEffect, useState } from 'react';
import localforage from 'localforage';

const CacheContext = createContext();

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

// Cache configuration
const CACHE_CONFIG = {
  name: 'aws-opportunity-analysis',
  version: 1.0,
  storeName: 'analysis_cache',
  description: 'Offline cache for AWS Opportunity Analysis'
};

// Cache key prefixes
const CACHE_KEYS = {
  ANALYSIS_RESULTS: 'analysis_results_',
  USER_PREFERENCES: 'user_preferences_',
  FORM_DATA: 'form_data_',
  API_RESPONSES: 'api_responses_'
};

export const CacheProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStats, setCacheStats] = useState({
    itemCount: 0,
    size: 0,
    hitRate: 0,
    hits: 0,
    misses: 0
  });

  // Initialize localforage
  useEffect(() => {
    localforage.config(CACHE_CONFIG);
    updateCacheStats();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Application is online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Application is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update cache statistics
  const updateCacheStats = async () => {
    try {
      const keys = await localforage.keys();
      let totalSize = 0;
      
      for (const key of keys) {
        const item = await localforage.getItem(key);
        if (item) {
          totalSize += JSON.stringify(item).length;
        }
      }

      setCacheStats(prev => ({
        ...prev,
        itemCount: keys.length,
        size: totalSize,
        hitRate: prev.hits + prev.misses > 0 ? prev.hits / (prev.hits + prev.misses) : 0
      }));
    } catch (error) {
      console.error('Failed to update cache stats:', error);
    }
  };

  // Cache data with expiration
  const setCachedData = async (key, data, ttl = 24 * 60 * 60 * 1000) => {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl,
        expired: false
      };

      await localforage.setItem(key, cacheItem);
      await updateCacheStats();
      
      console.log(`Cached data for key: ${key}`);
      return true;
    } catch (error) {
      console.error('Failed to cache data:', error);
      return false;
    }
  };

  // Get cached data
  const getCachedData = async (key) => {
    try {
      const cacheItem = await localforage.getItem(key);
      
      if (!cacheItem) {
        setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
        return null;
      }

      // Check if expired
      const isExpired = Date.now() - cacheItem.timestamp > cacheItem.ttl;
      
      if (isExpired) {
        await localforage.removeItem(key);
        await updateCacheStats();
        setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
        return null;
      }

      setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
      return {
        ...cacheItem,
        expired: isExpired
      };
    } catch (error) {
      console.error('Failed to get cached data:', error);
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }
  };

  // Remove cached data
  const removeCachedData = async (key) => {
    try {
      await localforage.removeItem(key);
      await updateCacheStats();
      console.log(`Removed cached data for key: ${key}`);
      return true;
    } catch (error) {
      console.error('Failed to remove cached data:', error);
      return false;
    }
  };

  // Clear all cache
  const clearCache = async () => {
    try {
      await localforage.clear();
      await updateCacheStats();
      setCacheStats({
        itemCount: 0,
        size: 0,
        hitRate: 0,
        hits: 0,
        misses: 0
      });
      console.log('Cache cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  };

  // Cache analysis results
  const cacheAnalysisResults = async (formData, results, analysisType = 'standard') => {
    const key = `${CACHE_KEYS.ANALYSIS_RESULTS}${JSON.stringify(formData)}_${analysisType}`;
    return await setCachedData(key, results, 30 * 60 * 1000); // 30 minutes
  };

  // Get cached analysis results
  const getCachedAnalysisResults = async (formData, analysisType = 'standard') => {
    const key = `${CACHE_KEYS.ANALYSIS_RESULTS}${JSON.stringify(formData)}_${analysisType}`;
    return await getCachedData(key);
  };

  // Cache user preferences
  const cacheUserPreferences = async (userId, preferences) => {
    const key = `${CACHE_KEYS.USER_PREFERENCES}${userId}`;
    return await setCachedData(key, preferences, 7 * 24 * 60 * 60 * 1000); // 7 days
  };

  // Get cached user preferences
  const getCachedUserPreferences = async (userId) => {
    const key = `${CACHE_KEYS.USER_PREFERENCES}${userId}`;
    return await getCachedData(key);
  };

  // Cache form data (for offline editing)
  const cacheFormData = async (formId, formData) => {
    const key = `${CACHE_KEYS.FORM_DATA}${formId}`;
    return await setCachedData(key, formData, 24 * 60 * 60 * 1000); // 24 hours
  };

  // Get cached form data
  const getCachedFormData = async (formId) => {
    const key = `${CACHE_KEYS.FORM_DATA}${formId}`;
    return await getCachedData(key);
  };

  // Cache API responses
  const cacheApiResponse = async (endpoint, params, response, ttl = 5 * 60 * 1000) => {
    const key = `${CACHE_KEYS.API_RESPONSES}${endpoint}_${JSON.stringify(params)}`;
    return await setCachedData(key, response, ttl);
  };

  // Get cached API response
  const getCachedApiResponse = async (endpoint, params) => {
    const key = `${CACHE_KEYS.API_RESPONSES}${endpoint}_${JSON.stringify(params)}`;
    return await getCachedData(key);
  };

  // Sync cached data when online
  const syncCachedData = async () => {
    if (!isOnline) return;

    try {
      const keys = await localforage.keys();
      const pendingSync = keys.filter(key => key.includes('_pending_sync'));
      
      console.log(`Syncing ${pendingSync.length} cached items...`);
      
      for (const key of pendingSync) {
        const item = await localforage.getItem(key);
        if (item && item.syncData) {
          // TODO: Implement actual sync logic with backend
          console.log('Syncing item:', key, item.syncData);
          await localforage.removeItem(key);
        }
      }
      
      await updateCacheStats();
    } catch (error) {
      console.error('Failed to sync cached data:', error);
    }
  };

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncCachedData();
    }
  }, [isOnline]);

  const contextValue = {
    isOnline,
    cacheStats,
    setCachedData,
    getCachedData,
    removeCachedData,
    clearCache,
    cacheAnalysisResults,
    getCachedAnalysisResults,
    cacheUserPreferences,
    getCachedUserPreferences,
    cacheFormData,
    getCachedFormData,
    cacheApiResponse,
    getCachedApiResponse,
    syncCachedData,
    updateCacheStats
  };

  return (
    <CacheContext.Provider value={contextValue}>
      {children}
    </CacheContext.Provider>
  );
};