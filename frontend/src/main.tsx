import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrowserRouter, Route, Routes } from 'react-router';
import UserProfileRoute from './routes/UserProfileRoute.tsx';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo-client';
import { Layout } from './Layout.tsx';
import AuthCallback from './components/AuthCallback.tsx';
import { AuthProvider } from './AuthContext.tsx';
import { AwsRumProvider } from './AwsRumProvider.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import { MyProfileRoute } from './routes/MyProfileRoute.tsx';
import { SponsorDashboardRoute } from './routes/SponsorDashboardRoute.tsx';

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
                <Route path="/profile/:id" element={<UserProfileRoute />} />
                <Route path="/profile" element={<MyProfileRoute />} />
                <Route path="sponsor-dashboard" element={<SponsorDashboardRoute />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ApolloProvider>
      </ErrorBoundary>
    </AwsRumProvider>
  </AuthProvider>
);
