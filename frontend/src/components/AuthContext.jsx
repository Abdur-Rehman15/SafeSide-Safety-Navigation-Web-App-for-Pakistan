import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const USER_URL = import.meta.env.VITE_USER_URL;

export const AuthProvider = ({ children }) => {
  // const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null); 
  
  const login = async (credentials) => {
    try {
      const response = await axios.post(
        `${USER_URL}/login`,
        credentials,
        {
          headers: { 'Accept': 'application/json' },
          withCredentials: true,
        }
      );
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('userId', response.data.userId)
      localStorage.setItem('emergencyNumber', response.data.emergencyNumber)
      setUser({
        username: response.data.username,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        email: response.data.email,
        gender: response.data.gender
      });
      return true;
    } catch (error) {
      console.log('Error is: ', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    try {
      const registeredUser = await axios.post(
        `${USER_URL}/register`,
        formData,
        {
          headers: { 'Accept': 'application/json' },
          withCredentials: true,
        }
      );
      return true;
    } catch (err) {
      console.log('Error during signup: ', err);
    } finally {
      setLoading(false);
    }

  }

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('emergencyNumber');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, activeModal, setActiveModal }}>
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