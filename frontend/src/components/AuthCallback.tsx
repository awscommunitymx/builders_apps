// src/components/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../AuthContext';
import { COGNITO_DOMAIN, CLIENT_ID, REDIRECT_URI } from '../AuthConfig';

export default function AuthCallback() {
  const { setTokens } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) {
      navigate('/');
      return;
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
    });

    fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
      .then((res) => res.json())
      .then((tokens) => {
        setTokens(tokens);
        navigate('/');
      })
      .catch(() => {
        navigate('/');
      });
  }, [navigate, setTokens]);

  return <p>Signing you in…</p>;
}
