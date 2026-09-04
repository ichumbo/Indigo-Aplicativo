import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { User, TrainerProfile, Subscription } from '../types';

interface AuthContextType {
  user: User | null;
  trainerProfile: TrainerProfile | null;
  subscription: Subscription | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dragoncorp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [trainerProfile, setTrainerProfile] = useState<TrainerProfile | null>(() => {
    const saved = localStorage.getItem('dragoncorp_trainer_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dragoncorp_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data.user);
      setTrainerProfile(response.data.trainerProfile);
      setSubscription(response.data.subscription);
      localStorage.setItem('dragoncorp_user', JSON.stringify(response.data.user));
      if (response.data.trainerProfile) {
        localStorage.setItem('dragoncorp_trainer_profile', JSON.stringify(response.data.trainerProfile));
      }
    } catch {
      // Token expirou ou inválido
      setUser(null);
      setToken(null);
      localStorage.removeItem('dragoncorp_token');
      localStorage.removeItem('dragoncorp_user');
      localStorage.removeItem('dragoncorp_trainer_profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token: newToken, user: newUser, trainerProfile: newProfile, subscription: newSub } = response.data;
      
      setToken(newToken);
      setUser(newUser);
      setTrainerProfile(newProfile);
      setSubscription(newSub);

      localStorage.setItem('dragoncorp_token', newToken);
      localStorage.setItem('dragoncorp_user', JSON.stringify(newUser));
      if (newProfile) {
        localStorage.setItem('dragoncorp_trainer_profile', JSON.stringify(newProfile));
      }

      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao autenticar. Verifique seus dados.';
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // continua limpeza local
    } finally {
      setToken(null);
      setUser(null);
      setTrainerProfile(null);
      setSubscription(null);
      localStorage.removeItem('dragoncorp_token');
      localStorage.removeItem('dragoncorp_user');
      localStorage.removeItem('dragoncorp_trainer_profile');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        trainerProfile,
        subscription,
        token,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
