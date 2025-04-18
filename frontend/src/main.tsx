import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrowserRouter, Route, Routes } from 'react-router';
import UserProfileRoute from './components/UserProfileRoute.tsx';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo-client';
import { Layout } from './Layout.tsx';
import AuthCallback from './components/AuthCallback.tsx';
import { AuthProvider } from './AuthContext.tsx';
import { AwsRumProvider } from './AwsRumProvider.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <AwsRumProvider>
      <ErrorBoundary>
        <ApolloProvider client={client}>
          <BrowserRouter>
            <Routes>
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<App />} />
                <Route path="/uid/:id" element={<UserProfileRoute />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ApolloProvider>
      </ErrorBoundary>
    </AwsRumProvider>
  </AuthProvider>
);
