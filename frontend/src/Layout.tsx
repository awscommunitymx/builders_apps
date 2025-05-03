import TopNavigation from '@cloudscape-design/components/top-navigation';
import { Outlet } from 'react-router';
import { generateLoginUrl } from './auth-utils';

export function Layout() {
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
