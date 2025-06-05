import TopNavigation from '@cloudscape-design/components/top-navigation';
import { Outlet } from 'react-router';
import { useEffect, useState } from 'react';
import imgUrl from './assets/logo.svg';

export function Layout() {


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
