import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext();

const isTokenExpired = (token) => {
  if (!token) return true;
  
  const base64Decode = (str) => {
    try {
      return atob(str);
    } catch (e) {
      console.error('Failed to decode base64 string:', e);
      return null;
    }
  };

  try {
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = JSON.parse(base64Decode(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
    const exp = decodedPayload && decodedPayload.exp;
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime > exp;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const handleExpiredToken = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    if (token) {
      if (isTokenExpired(token)) {
        handleExpiredToken();
      } else {
        setIsAuthenticated(true);
      }
    } else {
      setIsAuthenticated(false);
    }
  }, [token, handleExpiredToken]);

  const login = useCallback((newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  const authContextValue = {
    isAuthenticated,
    token,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};