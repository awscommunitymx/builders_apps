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
import AuthCallbackRoute from './routes/AuthCallbackRoute.tsx';
import LoginRoute from './routes/Login.tsx';
import Checkin from './routes/Checkin.tsx';
import { AgendaRoute } from './routes/AgendaRoute.tsx';
import { AgendaDetailsRoute } from './routes/AgendaDetailsRoute.tsx';
import SessionCSATRoute from './routes/SessionCSATRoute.tsx';
import PhotoSessionRoute from './routes/PhotoSessionRoute.tsx';
import PhotoSessionRegistrationsRoute from './routes/PhotoSessionRegistrationsRoute.tsx';
import { MapRoute } from './routes/MapRoute.tsx';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <AwsRumProvider>
      <ErrorBoundary>
        <ApolloProvider client={client}>
          <BrowserRouter>
            <Routes>
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/" element={<Layout />}>
                <Route path="/magic-link" element={<AuthCallbackRoute />} />
                <Route path="/login" element={<LoginRoute />} />
                <Route index element={<App />} />
                <Route path="/profile/:id" element={<UserProfileRoute />} />
                <Route path="/profile" element={<MyProfileRoute />} />
                <Route path="/agenda" element={<AgendaRoute />} />
                <Route path="/agenda/:id" element={<AgendaDetailsRoute />} />
                <Route path="sponsor-dashboard" element={<SponsorDashboardRoute />} />
                <Route path="checkin" element={<Checkin />} />
                <Route path="photo-sessions" element={<PhotoSessionRoute />} />
                <Route path="map" element={<MapRoute />} />
                <Route path="/session/:sessionId/csat" element={<SessionCSATRoute />} />
                <Route
                  path="/admin/photo-registrations"
                  element={<PhotoSessionRegistrationsRoute />}
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </ApolloProvider>
      </ErrorBoundary>
    </AwsRumProvider>
  </AuthProvider>
);
