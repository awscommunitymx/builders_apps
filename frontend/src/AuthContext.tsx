import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { COGNITO_DOMAIN, CLIENT_ID, LOGOUT_URI } from './AuthConfig';

interface Tokens {
  access_token: string;
  id_token: string;
  refresh_token: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  setTokens: (tokens: Tokens) => void;
  refreshTokens: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    setAccessToken(localStorage.getItem('access_token'));
    setIdToken(localStorage.getItem('id_token'));
    setRefreshToken(localStorage.getItem('refresh_token'));
  }, []);

  const setTokens = (tokens: Tokens) => {
    const { access_token, id_token, refresh_token } = tokens;
    console.log('Setting tokens:', tokens);
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('id_token', id_token);
    localStorage.setItem('refresh_token', refresh_token);
    setAccessToken(access_token);
    setIdToken(id_token);
    setRefreshToken(refresh_token);
  };

  const refreshTokens = async () => {
    if (!refreshToken) return;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    });
    const resp = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!resp.ok) throw new Error('Failed to refresh token');
    const newTokens: Tokens = await resp.json();
    setTokens(newTokens);
  };

  const signOut = () => {
    setAccessToken(null);
    setIdToken(null);
    setRefreshToken(null);
    localStorage.clear();
    const logoutUrl = new URL(`https://${COGNITO_DOMAIN}/logout`);
    logoutUrl.searchParams.set('client_id', CLIENT_ID);
    logoutUrl.searchParams.set('logout_uri', LOGOUT_URI);
    window.location.assign(logoutUrl.toString());
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!accessToken,
        accessToken,
        idToken,
        refreshToken,
        setTokens,
        refreshTokens,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
