import React, { useState } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  FormField,
  Input,
  Button,
  Box,
  Alert,
  Popover,
  StatusIndicator,
} from '@cloudscape-design/components';

interface LoginState {
  shortId: string;
  isLoading: boolean;
  error: string | null;
  response: any | null;
}

const LoginRoute: React.FC = () => {
  const [state, setState] = useState<LoginState>({
    shortId: '',
    isLoading: false,
    error: null,
    response: null,
  });

  const handleShortIdChange = (event: { detail: { value: string } }) => {
    setState((prev) => ({
      ...prev,
      shortId: event.detail.value,
      error: null, // Clear error when user types
      response: null, // Clear response when user types
    }));
  };

  const handleSubmit = async () => {
    if (!state.shortId.trim()) {
      setState((prev) => ({
        ...prev,
        error: 'Short ID es requerido para enviar el enlace mágico',
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null, response: null }));

    try {
      const apiResponse = await submitShortIdToBackend(state.shortId);

      setState((prev) => ({
        ...prev,
        response: apiResponse,
      }));

      console.log('Magic link sent for short ID:', state.shortId, 'Response:', apiResponse);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al enviar el enlace mágico',
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Function for backend submission
  const submitShortIdToBackend = async (shortId: string): Promise<any> => {
    const apiUrl = import.meta.env.VITE_AUTH_API_URL;

    if (!apiUrl) {
      throw new Error('VITE_AUTH_API_URL environment variable is not configured');
    }

    const response = await fetch(`${apiUrl}/auth/short-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        short_id: shortId,
      }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#fafafa',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <Container
          header={
            <Box textAlign="center">
              <Header variant="h2">Acceder a la Builders App</Header>
            </Box>
          }
        >
          <SpaceBetween direction="vertical" size="l">
            {state.error && (
              <Alert
                type="error"
                dismissible
                onDismiss={() => setState((prev) => ({ ...prev, error: null }))}
              >
                {state.error}
              </Alert>
            )}

            {state.response && (
              <Alert
                type="success"
                dismissible
                onDismiss={() => setState((prev) => ({ ...prev, response: null }))}
              >
                {state.response.message || 'Operación completada exitosamente'}
              </Alert>
            )}

            <FormField
              label={
                <SpaceBetween direction="horizontal" size="xs">
                  <span>Short ID</span>
                </SpaceBetween>
              }
              description="Ingresa tu identificador único para recibir un enlace mágico en tu email"
              stretch
            >
              <Input
                value={state.shortId}
                onChange={handleShortIdChange}
                placeholder="Ejemplo: CDABC"
                disabled={state.isLoading}
                invalid={!!state.error}
                autoFocus
              />
            </FormField>

            <Button
              variant="primary"
              fullWidth
              loading={state.isLoading}
              disabled={!state.shortId.trim()}
              onClick={handleSubmit}
            >
              {state.isLoading ? 'Enviando enlace mágico...' : 'Enviar enlace mágico'}
            </Button>
          </SpaceBetween>
        </Container>
      </div>
    </div>
  );
};

export default LoginRoute;
