// src/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { COGNITO_DOMAIN, CLIENT_ID, LOGOUT_URI } from './AuthConfig';

interface Auth {
  isAuthenticated: boolean;
  accessToken: string | null;
  signOut: () => void;
}

const AuthContext = createContext<Auth>({} as Auth);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    setAccessToken(localStorage.getItem('access_token'));
  }, []);

  const signOut = () => {
    localStorage.clear();
    window.location.assign(
      `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(LOGOUT_URI)}`
    );
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!accessToken,
        accessToken,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
