import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Amplify, Auth } from 'aws-amplify';
import { CognitoUser } from 'amazon-cognito-identity-js';
import {
  Container,
  Header,
  Box,
  SpaceBetween,
  Alert,
  Button,
  Spinner,
  StatusIndicator,
  Icon,
  ContentLayout,
} from '@cloudscape-design/components';

// Configure Amplify if not already configured
// This should ideally be done in your main App.tsx or index.tsx file
const configureAmplify = () => {
  if (!Amplify.configure) {
    return;
  }

  try {
    // Check if already configured
    const config = Amplify.configure() as any;
    if (config && config.Auth) {
      return;
    }
  } catch (e) {
    // Not configured yet, proceed with configuration
  }

  Amplify.configure({
    Auth: {
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      userPoolId: import.meta.env.VITE_USER_POOL_ID,
      userPoolWebClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,

      // Optional: Add if using custom auth flow
      authenticationFlowType: 'CUSTOM_AUTH',
    },
  });
};

interface AuthCallbackState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

const AuthCallbackRoute: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<AuthCallbackState>({
    isLoading: true,
    error: null,
    success: false,
  });

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Ensure Amplify is configured
        configureAmplify();

        const email = searchParams.get('email');
        const token = searchParams.get('token');

        if (!email || !token) {
          setState({
            isLoading: false,
            error: 'Missing email or token parameters',
            success: false,
          });
          return;
        }

        // Decode the parameters
        const decodedEmail = decodeURIComponent(email);
        const decodedToken = decodeURIComponent(token);

        console.log('Processing auth callback for:', decodedEmail);

        // Sign in to get the Cognito user
        const cognitoUser = (await Auth.signIn(decodedEmail)) as CognitoUser;

        // Send the custom challenge answer
        const challengeResult = await Auth.sendCustomChallengeAnswer(cognitoUser, decodedToken);

        // Check if authentication was successful
        if (challengeResult && challengeResult.signInUserSession) {
          setState({
            isLoading: false,
            error: null,
            success: true,
          });

          const userSession = challengeResult.signInUserSession;
          const id_token = userSession.id_token?.jwtToken || '';
          const refresh_token = userSession.refreshToken?.token || '';
          const access_token = userSession.accessToken?.jwtToken || '';

          localStorage.setItem('access_token', access_token);
          localStorage.setItem('id_token', id_token);
          localStorage.setItem('refresh_token', refresh_token);

          // Redirect to dashboard or home page after successful auth
          setTimeout(() => {
            navigate('/'); // Adjust the route as needed
          }, 1500);
        } else {
          throw new Error('Authentication challenge failed');
        }
      } catch (err) {
        console.error('Auth callback error:', err);

        let errorMessage = 'The token is invalid or has expired.';

        if (err instanceof Error) {
          // Handle specific error cases
          if (err.message.includes('UserNotFoundException')) {
            errorMessage = 'User not found. Please check your email address.';
          } else if (err.message.includes('NotAuthorizedException')) {
            errorMessage = 'Authentication failed. The token may be invalid or expired.';
          } else if (err.message.includes('NetworkError')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          }
        }

        setState({
          isLoading: false,
          error: errorMessage,
          success: false,
        });
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  // Render loading state
  if (state.isLoading) {
    return (
      <Box padding={{ horizontal: 'l', vertical: 'l' }}>
        <ContentLayout
          header={
            <Header variant="h1" description="Verificando tu autenticación...">
              Enlace Mágico
            </Header>
          }
        >
          <Container>
            <Box textAlign="center" padding={{ vertical: 'xl' }}>
              <SpaceBetween size="l" direction="vertical">
                <Box>
                  <Icon name="external" size="big" variant="link" />
                </Box>
                <Header variant="h2">Verificando tu autenticación...</Header>
                <Box variant="p" color="text-body-secondary">
                  Por favor espera mientras procesamos tu enlace mágico. Esto solo tomará unos
                  segundos.
                </Box>
                <Spinner size="large" />
              </SpaceBetween>
            </Box>
          </Container>
        </ContentLayout>
      </Box>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <Box padding={{ horizontal: 'l', vertical: 'l' }}>
        <ContentLayout
          header={
            <Header variant="h1" description="Ha ocurrido un error durante la autenticación">
              Error de Autenticación
            </Header>
          }
        >
          <Container>
            <SpaceBetween size="l" direction="vertical">
              <Alert type="error" header="Autenticación Fallida" dismissible={false}>
                {state.error}
              </Alert>

              <Box textAlign="center" padding={{ vertical: 'l' }}>
                <SpaceBetween size="m" direction="vertical">
                  <Box>
                    <Icon name="status-negative" size="big" variant="error" />
                  </Box>
                  <Box variant="p" color="text-body-secondary">
                    No te preocupes, puedes intentar nuevamente solicitando un nuevo enlace mágico.
                  </Box>
                  <Button variant="primary" onClick={() => navigate('/login')} iconName="refresh">
                    Volver al Login
                  </Button>
                </SpaceBetween>
              </Box>
            </SpaceBetween>
          </Container>
        </ContentLayout>
      </Box>
    );
  }

  // Render success state
  if (state.success) {
    return (
      <Box padding={{ horizontal: 'l', vertical: 'l' }}>
        <ContentLayout
          header={
            <Header variant="h1" description="¡Tu enlace mágico ha funcionado perfectamente!">
              Autenticación Exitosa
            </Header>
          }
        >
          <Container>
            <Box textAlign="center" padding={{ vertical: 'xl' }}>
              <SpaceBetween size="l" direction="vertical">
                <Box>
                  <Icon name="status-positive" size="big" variant="success" />
                </Box>
                <Header variant="h2">¡Autenticación Exitosa!</Header>
                <Box variant="p" color="text-body-secondary">
                  Has sido autenticado correctamente. Serás redirigido automáticamente a la
                  aplicación en unos segundos.
                </Box>
                <StatusIndicator type="success">Redirigiendo...</StatusIndicator>
              </SpaceBetween>
            </Box>
          </Container>
        </ContentLayout>
      </Box>
    );
  }

  return null;
};

export default AuthCallbackRoute;
