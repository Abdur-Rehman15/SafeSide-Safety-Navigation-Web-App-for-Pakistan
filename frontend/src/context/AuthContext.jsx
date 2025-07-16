import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock user data - replace with actual auth logic
    setUser({
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      gender: 'male'
    });
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};