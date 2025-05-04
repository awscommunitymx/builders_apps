import { useState } from 'react';
import Header from '@cloudscape-design/components/header';
import ContentLayout from '@cloudscape-design/components/content-layout';
import { ColumnLayout, Container, Link, SpaceBetween } from '@cloudscape-design/components';

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

function boardItem(text: string, imgUrl: string) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img src={imgUrl} alt="Logo" style={{ width: '30px', height: '30px' }} />
      <Link fontSize="heading-s">{text}</Link>
    </div>
  );
}

function App() {
  const services = [
    {
      title: 'Perfil',
      imgUrl: iamUrl,
    },
    {
      title: 'Agenda',
      imgUrl: eventbridgeUrl,
    },
  ];

  return (
    <ContentLayout
      defaultPadding
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
          {services.map((service) => boardItem(service.title, service.imgUrl))}
        </ColumnLayout>
      </Container>
    </ContentLayout>
  );
}

export default App;
