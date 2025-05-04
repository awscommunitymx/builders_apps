import TopNavigation from '@cloudscape-design/components/top-navigation';
import { Outlet } from 'react-router';
import { generateLoginUrl } from './auth-utils';
import { useEffect, useState } from 'react';

export function Layout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if access_token exists in localStorage
    const accessToken = localStorage.getItem('access_token');
    setIsLoggedIn(!!accessToken);
  }, []);

  const getUtilityItems = () => {
    if (isLoggedIn) {
      return [
        {
          type: 'button' as const,
          text: 'My Profile',
          href: '/profile', // Adjust this path as needed
        },
      ];
    } else {
      return [
        {
          type: 'button' as const,
          text: 'Login',
          href: generateLoginUrl(),
        },
      ];
    }
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
        utilities={getUtilityItems()}
      />
      <Outlet /> {/* This renders the current route's component */}
    </div>
  );
}
