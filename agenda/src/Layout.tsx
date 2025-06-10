import TopNavigation from '@cloudscape-design/components/top-navigation';
import { Outlet } from 'react-router';
import { useEffect, useState } from 'react';
// @ts-ignore
import imgUrl from './assets/logo.png';
import { v4 as uuidv4 } from 'uuid';

export function Layout() {
  useEffect(() => {
    // Check if anonUserId cookie exists
    const cookies = document.cookie.split(';');
    const anonUserIdCookie = cookies.find((cookie) => cookie.trim().startsWith('anonUserId='));

    // If the cookie doesn't exist, create it with a UUID and set to expire in 1 year
    if (!anonUserIdCookie) {
      const uuid = uuidv4();
      document.cookie = `anonUserId=${uuid}; path=/; domain=awscommunity.mx; max-age=31536000`;
      console.log('Anonymous user ID created:', uuid);
    }
  }, []);

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
      />
      <Outlet /> {/* This renders the current route's component */}
    </div>
  );
}
