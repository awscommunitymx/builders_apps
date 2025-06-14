import { useState } from 'react';
import {
  AppLayoutToolbar,
  BreadcrumbGroup,
  ContentLayout,
  Container,
  Header,
  SpaceBetween,
  Tabs,
  Box,
  Grid,
  Button,
  Modal,
} from '@cloudscape-design/components';

// Importar las imágenes del mapa
import mapP4 from '../assets/Map -P4.png';
import mapPB from '../assets/Map -PB.png';

export function MapRoute() {
  const [selectedFloor, setSelectedFloor] = useState('floor4');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImage, setModalImage] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  const breadcrumbs = [
    { text: 'Inicio', href: '/' },
    { text: 'Mapa del Evento', href: '#' },
  ];

  const handleImageClick = (image: string, title: string) => {
    setModalImage(image);
    setModalTitle(title);
    setModalVisible(true);
  };

  const floorTabs = [
    {
      label: 'Planta 4',
      id: 'floor4',
      content: (
        <Container>
          <SpaceBetween size="m">
            <Header
              variant="h2"
              description="Planta 4 - Área principal del evento con zonas de presentaciones, descanso y actividades especializadas"
            >
              Planta 4
            </Header>
            <Box textAlign="center">
              <img
                src={mapP4}
                alt="Mapa de la Planta 4"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  border: '1px solid #d5dbdb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
                onClick={() => handleImageClick(mapP4, 'Planta 4')}
              />
            </Box>
            <Grid
              gridDefinition={[
                { colspan: { default: 12, xs: 6, s: 4 } },
                { colspan: { default: 12, xs: 6, s: 4 } },
                { colspan: { default: 12, xs: 6, s: 4 } },
              ]}
            ></Grid>
          </SpaceBetween>
        </Container>
      ),
    },
    {
      label: 'Planta Baja',
      id: 'floorPB',
      content: (
        <Container>
          <SpaceBetween size="m">
            <Header
              variant="h2"
              description="Planta Baja - Recepción, stands comerciales y servicios generales para los asistentes"
            >
              Planta Baja
            </Header>
            <Box textAlign="center">
              <img
                src={mapPB}
                alt="Mapa de la Planta Baja"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  border: '1px solid #d5dbdb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
                onClick={() => handleImageClick(mapPB, 'Planta Baja')}
              />
            </Box>
            <Grid
              gridDefinition={[
                { colspan: { default: 12, xs: 6, s: 4 } },
                { colspan: { default: 12, xs: 6, s: 4 } },
                { colspan: { default: 12, xs: 6, s: 4 } },
              ]}
            ></Grid>
          </SpaceBetween>
        </Container>
      ),
    },
  ];

  return (
    <>
      <AppLayoutToolbar
        toolsHide={true}
        breadcrumbs={<BreadcrumbGroup items={breadcrumbs} />}
        content={
          <ContentLayout
            header={
              <SpaceBetween size="m">
                <Header
                  variant="h1"
                  description="Encuentra tu camino en el evento. Haz clic en los mapas para verlos en tamaño completo."
                >
                  Mapa del Evento
                </Header>
              </SpaceBetween>
            }
          >
            <SpaceBetween size="l">
              <Container>
                <SpaceBetween size="m">
                  <Header variant="h2">🗺️ Información General</Header>
                </SpaceBetween>
              </Container>

              <Tabs
                tabs={floorTabs}
                activeTabId={selectedFloor}
                onChange={({ detail }) => setSelectedFloor(detail.activeTabId)}
              />
            </SpaceBetween>
          </ContentLayout>
        }
      />

      <Modal
        onDismiss={() => setModalVisible(false)}
        visible={modalVisible}
        closeAriaLabel="Cerrar modal"
        size="max"
        header={modalTitle}
      >
        <Box textAlign="center">
          <img
            src={modalImage}
            alt={modalTitle}
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        </Box>
      </Modal>
    </>
  );
}
