import TopNavigation from '@cloudscape-design/components/top-navigation';
import { Outlet } from 'react-router';
import { useNavigate } from 'react-router';
import imgUrl from './assets/logo-community.png';

export function Layout() {
  const navigate = useNavigate();

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
          {
            type: 'button',
            text: 'Inicio',
            onClick: () => navigate('/'),
          },
        ]}
      />
      <Outlet /> {/* This renders the current route's component */}
    </div>
  );
}
