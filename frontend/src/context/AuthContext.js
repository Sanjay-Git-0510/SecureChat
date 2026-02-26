import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    disconnectSocket();
    setSocket(null);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await authAPI.getMe();
        setUser(data);
        const sock = initSocket(token);
        setSocket(sock);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token, logout]);

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    const sock = initSocket(data.token);
    setSocket(sock);
    return data;
  };

  const register = async (userData) => {
    const { data } = await authAPI.register(userData);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    const sock = initSocket(data.token);
    setSocket(sock);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, token, socket, loading, login, logout, register, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);