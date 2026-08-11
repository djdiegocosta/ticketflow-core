import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

type UserRole = 'admin' | 'colaborador' | 'operador_checkin' | 'cliente' | null;

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
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('ticketflow_auth');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setIsAuthenticated(data.isAuthenticated);
        setUserRole(data.userRole);
        setUserName(data.userName);
      } catch (e) {
        console.error("Failed to parse auth data", e);
      }
    }
  }, []);

  const login = (email: string, pass: string) => {
    let authData = null;

    if (email === 'admin@ticketflow.com' && pass === 'admin123') {
      authData = {
        isAuthenticated: true,
        userRole: 'admin' as UserRole,
        userName: 'Administrador',
      };
    } else if (email === 'colaborador@ticketflow.com' && pass === 'colab123') {
      authData = {
        isAuthenticated: true,
        userRole: 'colaborador' as UserRole,
        userName: 'Colaborador',
      };
    } else if (email === 'checkin@ticketflow.com' && pass === 'checkin123') {
      authData = {
        isAuthenticated: true,
        userRole: 'operador_checkin' as UserRole,
        userName: 'Operador de Check-in',
      };
    } else if (email === 'cliente@ticketflow.com' && pass === 'cliente123') {
      authData = {
        isAuthenticated: true,
        userRole: 'cliente' as UserRole,
        userName: 'Marina Duarte',
      };
    }

    if (authData) {
      setIsAuthenticated(true);
      setUserRole(authData.userRole);
      setUserName(authData.userName);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('ticketflow_auth', JSON.stringify(authData));
      }
      if (authData.userRole === 'operador_checkin') {
        navigate({ to: '/checkin', replace: true });
      } else if (authData.userRole === 'admin') {
        navigate({ to: '/admin', replace: true });
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserName('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('ticketflow_auth');
    }
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
