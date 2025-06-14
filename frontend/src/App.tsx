import { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router';
import Header from '@cloudscape-design/components/header';
import ContentLayout from '@cloudscape-design/components/content-layout';
import {
  AppLayoutToolbar,
  BreadcrumbGroup,
  ColumnLayout,
  Container,
  Link,
  SideNavigation,
  SpaceBetween,
} from '@cloudscape-design/components';

import iamUrl from './assets/iam.svg';
import eventbridgeUrl from './assets/EventBridge.svg';
import mapIconUrl from './assets/map-icon.svg';
import { getLoggedInUser } from './utils/getAuthenticatedUser';
import Checkin from './routes/Checkin';

const CHECK_INITIALIZATION = gql`
  query getMyProfile {
    getMyProfile {
      initialized
    }
  }
`;

// Interface for the data property in board items
interface BoardItemData {
  title: string;
  content: string;
}

// Interface for the board items
interface BoardItemType {
  id: string;
  rowSpan: number;
  columnSpan: number;
  data: BoardItemData;
}

// Interface for the event detail in onItemsChange
interface BoardChangeDetail {
  items: BoardItemType[];
}

function boardItem(text: string, imgUrl: string, url: string) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img src={imgUrl} alt="Logo" style={{ width: '30px', height: '30px' }} />
      <Link fontSize="heading-s" href={url}>
        {text}
      </Link>
    </div>
  );
}

function App() {
  const loggedInUser = getLoggedInUser();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(CHECK_INITIALIZATION);

  useEffect(() => {
    if (data?.getMyProfile && !data.getMyProfile.initialized) {
      navigate('/profile');
    }
  }, [data, navigate]);

  const services = [
    {
      title: 'Mi perfil',
      imgUrl: iamUrl,
      url: '/profile',
    },
    {
      title: 'Agenda',
      imgUrl: eventbridgeUrl,
      url: '/agenda',
    },
    {
      title: 'Sesiones de Fotos',
      imgUrl: iamUrl,
      url: '/photo-sessions',
    },
    {
      title: 'Mapa del Evento',
      imgUrl: mapIconUrl,
      url: '/map',
    },
    ...(loggedInUser?.groups.includes('Sponsors')
      ? [
          {
            title: 'Panel de Patrocinadores',
            imgUrl: iamUrl,
            url: '/sponsor-dashboard',
          },
        ]
      : []),
    ...(loggedInUser?.groups.some((group) => group.startsWith('CheckInVolunteer'))
      ? [
          {
            title: 'Check-in',
            imgUrl: iamUrl,
            url: '/checkin',
          },
        ]
      : []),
  ];

  return (
    <>
      <AppLayoutToolbar
        toolsHide={true}
        navigation={
          <SideNavigation
            header={{
              href: '#',
              text: 'Builders App',
            }}
            items={[
              { type: 'link' as const, text: `Mi perfil`, href: `/profile` },
              { type: 'link' as const, text: `Agenda`, href: `/agenda` },
              { type: 'link' as const, text: `Sesiones de Fotos`, href: `/photo-sessions` },
              { type: 'link' as const, text: `Mapa del Evento`, href: `/map` },
              // { type: 'link' as const, text: `Check-in`, href: `/checkin` },
              ...(loggedInUser?.groups.some((group) => group.startsWith('CheckInVolunteer'))
                ? [
                    {
                      type: 'link' as const,
                      text: `Check-in`,
                      href: `/checkin`,
                    },
                  ]
                : []),
              ...(loggedInUser?.groups.includes('Sponsors')
                ? [
                    {
                      type: 'link' as const,
                      text: `Panel de Patrocinadores`,
                      href: `/sponsor-dashboard`,
                    },
                  ]
                : []),
            ]}
          />
        }
        content={
          <ContentLayout
            header={
              <SpaceBetween size="m">
                <Header variant="h1">Página de inicio de Builders app</Header>
              </SpaceBetween>
            }
          >
            <Container
              header={
                <Header variant="h1">
                  Visitados recientemente <Link variant="info">Info</Link>
                </Header>
              }
            >
              <ColumnLayout borders="horizontal" columns={1}>
                {services.map((service) => boardItem(service.title, service.imgUrl, service.url))}
              </ColumnLayout>
            </Container>
          </ContentLayout>
        }
      ></AppLayoutToolbar>
    </>
  );
}

export default App;
