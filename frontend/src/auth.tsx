/* This file exports both a component (AuthProvider) and a hook (useAuth).
   The rule below wants them in separate files, but our structure keeps login
   state in this one file, so we switch the rule off here. */
/* eslint-disable react-refresh/only-export-components */
// ---------------------------------------------------------------------------
// auth.tsx
// Who is signed in, their JWT, and what they are allowed to do.
//
// A React "context" is a box that any page can open without the value being
// passed down by hand through every component in between. AuthProvider fills
// the box, useAuth() opens it.
// ---------------------------------------------------------------------------

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from './types';
import { login as apiLogin, setAuthToken } from './api';

// What every page gets when it calls useAuth().
type AuthValue = {
  currentUser: User | null;
  canEdit: boolean; // Admin or Editor. Viewers never see Create/Edit/Delete.
  isAdmin: boolean; // Admin only. Controls the Users page.
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

// Keys used in sessionStorage, so a page refresh does not sign you out.
// sessionStorage is cleared when the browser tab closes.
const TOKEN_KEY = 'ids_portal_token';
const USER_KEY = 'ids_portal_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  // The function inside useState runs only on the very first render. It reads
  // back whatever we saved before the last refresh.
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(TOKEN_KEY)
  );
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem(USER_KEY);
    return saved ? (JSON.parse(saved) as User) : null;
  });

  // Hand the token to api.ts on every render. It has to happen here and not in
  // an effect, because pages start loading data before effects up here run.
  setAuthToken(token);

  async function signIn(email: string, password: string) {
    // No try/catch here on purpose: the Login page catches the error and shows
    // the message next to the form.
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

// Every page calls this: const { currentUser, canEdit } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}
