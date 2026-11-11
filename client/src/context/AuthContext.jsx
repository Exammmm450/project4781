import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('titan_access_token'));
  const [loading, setLoading] = useState(true);

  // Listen to session expiry event from API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setAccount(null);
      setAccessToken(null);
    };

    window.addEventListener('titan_session_expired', handleSessionExpired);
    return () => window.removeEventListener('titan_session_expired', handleSessionExpired);
  }, []);

  // Hydrate user profile on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('titan_access_token');
      if (storedToken) {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data.data.user);
          setAccount(data.data.account);
        } catch (err) {
          console.warn('Initial session check failed:', err.message);
          localStorage.removeItem('titan_access_token');
          setUser(null);
          setAccount(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, secretKey = '') => {
    const payload = { email, password };
    if (secretKey && secretKey.trim()) {
      payload.secretKey = secretKey.trim();
    }

    const { data } = await api.post('/auth/login', payload);
    const { user: loggedUser, account: userAccount, accessToken: token } = data.data;

    localStorage.setItem('titan_access_token', token);
    setAccessToken(token);
    setUser(loggedUser);
    setAccount(userAccount);

    return { user: loggedUser, isAdmin: loggedUser.role === 'admin' };
  };

  const register = async (fullName, email, password, secretKey = '') => {
    const payload = { fullName, email, password };
    if (secretKey && secretKey.trim()) {
      payload.secretKey = secretKey.trim();
    }

    const { data } = await api.post('/auth/register', payload);
    const { user: registeredUser, account: userAccount, accessToken: token } = data.data;

    localStorage.setItem('titan_access_token', token);
    setAccessToken(token);
    setUser(registeredUser);
    setAccount(userAccount);

    return { user: registeredUser, isAdmin: registeredUser.role === 'admin' };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // ignore
    } finally {
      localStorage.removeItem('titan_access_token');
      setAccessToken(null);
      setUser(null);
      setAccount(null);
    }
  };

  const refreshUserData = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data.user);
      setAccount(data.data.account);
      return data.data;
    } catch (err) {
      console.error('Failed to refresh user data', err);
    }
  };

  const value = {
    user,
    account,
    accessToken,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    loading,
    login,
    register,
    logout,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

