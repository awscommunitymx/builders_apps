import TopNavigation from '@cloudscape-design/components/top-navigation';
import { Outlet } from 'react-router';
import { generateLoginUrl } from './auth-utils';
import { useEffect, useState } from 'react';
import imgUrl from './assets/logo.svg';
import { getLoggedInUser } from './utils/getAuthenticatedUser';

export function Layout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if access_token exists in localStorage
    const user = getLoggedInUser();
    setIsLoggedIn(!!user);
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
          href: '/login',
        },
      ];
    }
  };

  return (
    <div>
      <TopNavigation
        identity={{
          href: '/',
          logo: {
            src: imgUrl,
            alt: 'Logo',
          },
        }}
        utilities={[
          ...getUtilityItems(),
          {
            type: 'button',
            text: 'Link',
            href: 'https://example.com/',
            external: true,
            externalIconAriaLabel: ' (opens in a new tab)',
          },
          {
            type: 'button',
            iconName: 'notification',
            title: 'Notifications',
            ariaLabel: 'Notifications (unread)',
            badge: true,
            disableUtilityCollapse: false,
          },
          {
            type: 'menu-dropdown',
            iconName: 'settings',
            ariaLabel: 'Settings',
            title: 'Settings',
            items: [
              {
                id: 'settings-org',
                text: 'Organizational settings',
              },
              {
                id: 'settings-project',
                text: 'Project settings',
              },
            ],
          },
        ]}
      />
      <Outlet /> {/* This renders the current route's component */}
    </div>
  );
}
