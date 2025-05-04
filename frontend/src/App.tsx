import { useState } from 'react';
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
  const services = [
    {
      title: 'Perfil',
      imgUrl: iamUrl,
      url: '/profile',
    },
    {
      title: 'Agenda',
      imgUrl: eventbridgeUrl,
      url: '/agenda',
    },
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
              { type: 'link', text: `Mi perfil`, href: `/profile` },
              { type: 'link', text: `Agenda`, href: `/agenda` },
            ]}
          />
        }
        content={
          <ContentLayout
            header={
              <SpaceBetween size="m">
                <Header variant="h1">Página de inicio de la Consola</Header>
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
