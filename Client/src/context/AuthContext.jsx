import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAdmin, getAuthMe, logoutAdmin } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('lifeline_admin_token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on initial load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('lifeline_admin_token');
      if (storedToken) {
        try {
          const res = await getAuthMe();
          if (res?.data) {
            setUser(res.data);
            setToken(storedToken);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('lifeline_admin_token');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (err) {
          console.warn('[AuthContext] Session restoration failed:', err.message);
          localStorage.removeItem('lifeline_admin_token');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await loginAdmin(email, password);
      if (res?.data?.token) {
        const authToken = res.data.token;
        const authUser = res.data.user;

        localStorage.setItem('lifeline_admin_token', authToken);
        setToken(authToken);
        setUser(authUser);
        setIsAuthenticated(true);
        return res;
      }
      throw new Error('Invalid login response from server');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutAdmin();
    } catch (err) {
      console.warn('[AuthContext] Logout call warning:', err.message);
    } finally {
      localStorage.removeItem('lifeline_admin_token');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout
      }}
    >
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

export default AuthContext;
