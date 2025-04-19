import TopNavigation from '@cloudscape-design/components/top-navigation';
import { Outlet } from 'react-router';
import { COGNITO_DOMAIN, CLIENT_ID, REDIRECT_URI, RESPONSE_TYPE, SCOPES } from './AuthConfig';

export function Layout() {
  const generateLoginUrl = () => {
    const params = new URLSearchParams({
      response_type: RESPONSE_TYPE,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
    });
    return `https://${COGNITO_DOMAIN}/login?${params}`;
  };

  return (
    <div>
      <TopNavigation
        identity={{
          href: '#',
          title: 'Service',
          logo: {
            src: '/logo-small-top-navigation.svg',
            alt: 'Service',
          },
        }}
        utilities={[
          {
            type: 'button',
            text: 'Login',
            href: generateLoginUrl(),
          },
        ]}
      />
      <Outlet /> {/* This renders the current route's component */}
    </div>
  );
}
