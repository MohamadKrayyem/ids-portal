// Who is signed in, their JWT and what they are allowed to do.
/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from './types';
import { login as apiLogin, setAuthToken } from './api';

type AuthValue = {
  currentUser: User | null;
  canEdit: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue>({
  currentUser: null,
  canEdit: false,
  isAdmin: false,
  signIn: async () => {},
  logout: () => {},
});

const TOKEN_KEY = 'ids_portal_token';
const USER_KEY = 'ids_portal_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(TOKEN_KEY)
  );
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem(USER_KEY);
    return saved ? (JSON.parse(saved) as User) : null;
  });

  setAuthToken(token);

  async function signIn(email: string, password: string) {
    const result = await apiLogin(email, password);
    setToken(result.token);
    setCurrentUser(result.user);
    setAuthToken(result.token);
    sessionStorage.setItem(TOKEN_KEY, result.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(result.user));
  }

  function logout() {
    setToken(null);
    setCurrentUser(null);
    setAuthToken(null);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  const role = currentUser ? currentUser.role : null;

  const value: AuthValue = {
    currentUser,
    canEdit: role === 'Admin' || role === 'Editor',
    isAdmin: role === 'Admin',
    signIn,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
