import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

type UserRole = 'admin' | 'cliente' | null;

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  userName: string;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState<string>('');
  const navigate = useNavigate();

  // Persist state in localStorage for dev purposes
  useEffect(() => {
    const saved = localStorage.getItem('ticketflow_auth');
    if (saved) {
      const data = JSON.parse(saved);
      setIsAuthenticated(data.isAuthenticated);
      setUserRole(data.userRole);
      setUserName(data.userName);
    }
  }, []);

  const login = (email: string, pass: string) => {
    if (email === 'admin@ticketflow.com' && pass === 'admin123') {
      const authData = {
        isAuthenticated: true,
        userRole: 'admin' as UserRole,
        userName: 'Administrador',
      };
      setIsAuthenticated(true);
      setUserRole('admin');
      setUserName('Administrador');
      localStorage.setItem('ticketflow_auth', JSON.stringify(authData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserName('');
    localStorage.removeItem('ticketflow_auth');
    navigate({ to: '/login' });
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, userName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
