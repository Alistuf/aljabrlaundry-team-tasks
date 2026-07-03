import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '@/config';

const AuthContext = createContext(null);

const API = API_URL;

export const ROLE_MANAGER = 'manager';
export const ROLE_SUPERVISOR = 'supervisor';

export const CATEGORY_GOOGLE_MAPS = 'google_maps';
export const CATEGORY_MARKETING = 'marketing';
export const CATEGORY_GENERAL = 'general';

// Use sessionStorage instead of localStorage for better security
const TOKEN_KEY = 'auth_token';

const getStoredToken = () => sessionStorage.getItem(TOKEN_KEY);
const setStoredToken = (token) => sessionStorage.setItem(TOKEN_KEY, token);
const removeStoredToken = () => sessionStorage.removeItem(TOKEN_KEY);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(true);

  // Verify token on mount and token change
  useEffect(() => {
    const verifyToken = async () => {
      const currentToken = token;
      if (currentToken) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${currentToken}` }
          });
          setUser(response.data);
        } catch {
          removeStoredToken();
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  const login = useCallback(async (username, password) => {
    const response = await axios.post(`${API}/auth/login`, { username, password });
    const { access_token, user: userData } = response.data;
    setStoredToken(access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (username, password, email, role = ROLE_SUPERVISOR, category = CATEGORY_GOOGLE_MAPS, name = '', phone = '') => {
    const response = await axios.post(`${API}/auth/register`, { 
      username, 
      password, 
      email,
      name,
      phone,
      role,
      category
    });
    const { access_token, user: userData } = response.data;
    setStoredToken(access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  }, []);

  const updateProfile = useCallback(async (data) => {
    const response = await axios.patch(`${API}/profile`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setUser(response.data);
    return response.data;
  }, [token]);

  const resendVerification = useCallback(async () => {
    const response = await axios.post(`${API}/auth/resend-verification`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (token) {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      return response.data;
    }
  }, [token]);

  const logout = useCallback(() => {
    removeStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isManager: user?.role === ROLE_MANAGER,
    isSupervisor: user?.role === ROLE_SUPERVISOR,
    login,
    register,
    logout,
    updateProfile,
    resendVerification,
    refreshUser
  }), [user, token, loading, login, register, logout, updateProfile, resendVerification, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
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
