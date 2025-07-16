import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      // Mock verification - replace with actual API call
      setUser({
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User'
      });
      setLoading(false);
    } catch (error) {
      localStorage.removeItem('authToken');
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      // Mock login - replace with actual API call
      localStorage.setItem('authToken', 'fake-token');
      setUser({
        username: credentials.email,
        firstName: 'Test',
        lastName: 'User'
      });
      return true;
    } catch (error) {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    // Navigation removed from here
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}