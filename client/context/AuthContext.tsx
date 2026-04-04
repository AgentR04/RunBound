import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

// User interface
export interface User {
  id: string;
  email: string;
  username: string;
  color: string;
  totalTerritories: number;
  totalArea: number;
  createdAt: string;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  TOKEN: '@runbound_token',
  REFRESH_TOKEN: '@runbound_refresh_token',
  USER: '@runbound_user',
} as const;

// API configuration - will be updated when backend is ready
const API_BASE_URL = 'http://localhost:3000/api';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;

  // Initialize authentication state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // Validate token with backend when available
        await validateTokenWithBackend(token);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const validateTokenWithBackend = async (token: string) => {
    try {
      // This will be implemented when backend auth is ready
      // For now, we assume the token is valid if it exists
      console.log('Token validation will be implemented when backend is ready');

      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/auth/me`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Token validation failed');
      // }
      //
      // const userData = await response.json();
      // setUser(userData);
    } catch (error) {
      console.error('Token validation failed:', error);
      await clearAuthData();
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // TODO: Replace with actual backend API call when ready
      console.log('Login attempt for:', email);

      // Mock response for development
      const mockResponse = {
        user: {
          id: 'user_' + Date.now(),
          email,
          username: email.split('@')[0],
          color: '#52FF30',
          totalTerritories: 0,
          totalArea: 0,
          createdAt: new Date().toISOString(),
        },
        token: 'mock_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
      };

      // This will be replaced with actual API call:
      // const response = await fetch(`${API_BASE_URL}/auth/login`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password }),
      // });
      //
      // if (!response.ok) {
      //   const error = await response.json();
      //   throw new Error(error.message || 'Login failed');
      // }
      //
      // const data = await response.json();

      const data = mockResponse;

      // Store authentication data
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

      setUser(data.user);
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (
    email: string,
    username: string,
    password: string,
  ) => {
    try {
      // TODO: Replace with actual backend API call when ready
      console.log('Registration attempt for:', email, username);

      // Mock response for development
      const mockResponse = {
        user: {
          id: 'user_' + Date.now(),
          email,
          username,
          color: '#52FF30',
          totalTerritories: 0,
          totalArea: 0,
          createdAt: new Date().toISOString(),
        },
        token: 'mock_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
      };

      // This will be replaced with actual API call:
      // const response = await fetch(`${API_BASE_URL}/auth/register`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, username, password }),
      // });
      //
      // if (!response.ok) {
      //   const error = await response.json();
      //   throw new Error(error.message || 'Registration failed');
      // }
      //
      // const data = await response.json();

      const data = mockResponse;

      // Store authentication data
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

      setUser(data.user);
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = await AsyncStorage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN,
      );

      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      // TODO: Replace with actual backend API call when ready
      // const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ refreshToken: refreshTokenValue }),
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Token refresh failed');
      // }
      //
      // const data = await response.json();

      // Mock response for development
      const mockData = {
        token: 'refreshed_token_' + Date.now(),
        refreshToken: 'refreshed_refresh_token_' + Date.now(),
      };

      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, mockData.token);
      await AsyncStorage.setItem(
        STORAGE_KEYS.REFRESH_TOKEN,
        mockData.refreshToken,
      );
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      await clearAuthData();
      throw new Error(error.message || 'Token refresh failed');
    }
  };

  const logout = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);

      // TODO: Call backend logout endpoint when ready
      // if (token) {
      //   await fetch(`${API_BASE_URL}/auth/logout`, {
      //     method: 'POST',
      //     headers: { Authorization: `Bearer ${token}` },
      //   });
      // }

      await clearAuthData();
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local data even if backend call fails
      await clearAuthData();
    }
  };

  const clearAuthData = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      setUser(null);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
