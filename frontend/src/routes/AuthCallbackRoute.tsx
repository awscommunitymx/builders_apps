import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Amplify, Auth } from 'aws-amplify';
import { CognitoUser } from 'amazon-cognito-identity-js';

// Configure Amplify if not already configured
// This should ideally be done in your main App.tsx or index.tsx file
const configureAmplify = () => {
  if (!Amplify.configure) {
    return;
  }

  try {
    // Check if already configured
    const config = Amplify.configure();
    if (config.Auth) {
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

          // Redirect to dashboard or home page after successful auth
          setTimeout(() => {
            navigate('/dashboard'); // Adjust the route as needed
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
      <div className="auth-callback-container">
        <div className="loading-spinner">
          <h2>Verifying your authentication...</h2>
          <p>Please wait while we process your login.</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <div className="auth-callback-container">
        <div className="error-message">
          <h2>Authentication Failed</h2>
          <p>{state.error}</p>
          <button onClick={() => navigate('/login')}>Return to Login</button>
        </div>
      </div>
    );
  }

  // Render success state
  if (state.success) {
    return (
      <div className="auth-callback-container">
        <div className="success-message">
          <h2>Authentication Successful!</h2>
          <p>You have been successfully authenticated. Redirecting...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallbackRoute;
