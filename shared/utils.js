// Shared utility functions for the monorepo

/**
 * Format timestamp to human readable string
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Get service status color
 */
function getStatusColor(status) {
  switch (status) {
    case 'running':
    case 'healthy':
      return '#4CAF50'; // Green
    case 'stopped':
    case 'unhealthy':
      return '#F44336'; // Red
    case 'development':
      return '#9E9E9E'; // Gray
    case 'error':
      return '#FF5722'; // Red-Orange
    default:
      return '#607D8B'; // Blue-Gray
  }
}

/**
 * Validate environment variables
 */
function validateEnvVars(requiredVars) {
  const missing = [];
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Create API response object
 */
function createApiResponse(success, data = null, error = null) {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString()
  };
}

/**
 * Debounce function for performance
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Deep clone object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    Object.keys(obj).forEach(key => {
      clonedObj[key] = deepClone(obj[key]);
    });
    return clonedObj;
  }
}

// Export functions based on environment
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    formatTimestamp,
    getStatusColor,
    validateEnvVars,
    createApiResponse,
    debounce,
    deepClone
  };
} else if (typeof window !== 'undefined') {
  // Browser environment
  window.SharedUtils = {
    formatTimestamp,
    getStatusColor,
    validateEnvVars,
    createApiResponse,
    debounce,
    deepClone
  };
}
