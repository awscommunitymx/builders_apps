import React from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Container,
  ContentLayout,
  SpaceBetween,
  Header,
  Box,
  Button,
  Grid,
  ColumnLayout,
} from '@cloudscape-design/components';

// Sample images - replace with actual images for each session
const sessionImages = {
  '1': 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format',
  '2': 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?w=800&auto=format',
  '3': 'https://images.unsplash.com/photo-1573164574511-73c773193279?w=800&auto=format',
};

// Extended session data with more details for the detail view
const sessionData = {
  '1': {
    id: '1',
    name: 'Innovación en Inteligencia Artificial',
    description: 'Explorando las últimas tendencias en IA y sus aplicaciones prácticas',
    extendedDescription: `Esta charla profundiza en cómo la inteligencia artificial está transformando industrias enteras. 
    Analizaremos los avances más recientes en machine learning y deep learning, así como casos de uso prácticos 
    que están generando valor en diversos sectores. La Dra. Rodríguez compartirá su experiencia en proyectos de IA aplicada
    y ofrecerá una visión práctica de cómo implementar estas tecnologías en entornos reales.`,
    speaker: 'Dra. María Rodríguez',
    speakerBio: 'Investigadora principal en el Instituto de Tecnología Avanzada y ex-directora de AI Research en Tech Innovations Inc. Cuenta con más de 15 años de experiencia en el campo de la IA y numerosas publicaciones académicas.',
    time: '09:00 - 10:30',
    location: 'Sala Principal',
    capacity: 200,
    tags: ['Inteligencia Artificial', 'Machine Learning', 'Innovación'],
  },
  '2': {
    id: '2',
    name: 'Desarrollo Sostenible y Tecnología',
    description: 'Cómo la tecnología puede impulsar iniciativas de sostenibilidad',
    extendedDescription: `En esta presentación, exploraremos la intersección entre la tecnología moderna y la sostenibilidad ambiental.
    Veremos ejemplos concretos de cómo las empresas están utilizando soluciones tecnológicas para reducir su huella de carbono,
    optimizar el uso de recursos y contribuir a los Objetivos de Desarrollo Sostenible de la ONU.
    El Ing. Mendoza presentará casos de éxito y lecciones aprendidas de proyectos reales.`,
    speaker: 'Ing. Carlos Mendoza',
    speakerBio: 'Ingeniero ambiental y consultor en tecnologías sostenibles con experiencia en más de 50 proyectos internacionales. Fundador de GreenTech Solutions y asesor para varias organizaciones comprometidas con la agenda medioambiental.',
    time: '11:00 - 12:30',
    location: 'Auditorio B',
    capacity: 150,
    tags: ['Sostenibilidad', 'Tecnología Verde', 'Medio Ambiente'],
  },
  '3': {
    id: '3',
    name: 'Seguridad en la Nube: Desafíos Actuales',
    description: 'Estrategias para proteger datos e infraestructura en entornos cloud',
    extendedDescription: `La adopción masiva de servicios en la nube ha creado nuevos desafíos de seguridad que requieren 
    enfoques innovadores. En esta charla, la Lic. Gómez abordará las amenazas más comunes en entornos cloud, 
    estrategias efectivas de mitigación y buenas prácticas para proteger datos sensibles y garantizar la continuidad del negocio.
    Se presentarán estudios de caso y recomendaciones prácticas basadas en estándares internacionales.`,
    speaker: 'Lic. Ana Gómez',
    speakerBio: 'Especialista en ciberseguridad con certificación CISSP y AWS Security Specialist. Ha liderado equipos de seguridad en importantes empresas del sector financiero y actualmente es consultora independiente en seguridad cloud.',
    time: '14:00 - 15:30',
    location: 'Sala de Conferencias C',
    capacity: 120,
    tags: ['Seguridad', 'Cloud Computing', 'Ciberseguridad'],
  },
};


export interface SessionDetailProps {
  sessionId: string;
}

export default function SessionDetail({sessionId}: SessionDetailProps) {
  const navigate = useNavigate();
  
  // Verificar si el ID de sesión es válido
  if (!sessionId || !sessionData[sessionId]) {
    return (
      <Container header={<Header>Sesión no encontrada</Header>}>
        <Box textAlign="center" padding="l">
          <SpaceBetween size="m">
            <div>La sesión solicitada no existe o ha sido eliminada.</div>
            <Button onClick={() => navigate('/')}>Volver a la agenda</Button>
          </SpaceBetween>
        </Box>
      </Container>
    );
  }
  
  const session = sessionData[sessionId];
  
  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={
            <Button variant="primary" onClick={() => navigate('/')}>
              Volver a la agenda
            </Button>
            
          }
        >
          {session.name}
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container>
                <SpaceBetween size="l">
                    <Box variant="awsui-key-label"></Box>
                    <ColumnLayout columns={1}>
                  <Box variant="awsui-key-label">Horario</Box>
                  <div>{session.time}</div>
                  
                  <Box variant="awsui-key-label">Ubicación</Box>
                  <div>{session.location}</div>
                  
                  <Box variant="awsui-key-label">Capacidad</Box>
                  <div>{session.capacity} asistentes</div>
                </ColumnLayout>
              </SpaceBetween>
        </Container>
        <Container>
          <Grid gridDefinition={[{ colspan: 8 }, { colspan: 4 }]}>
            <div>
              <SpaceBetween size="l">
                <Box>
                  <h3>Descripción</h3>
                  <p>{session.extendedDescription}</p>
                </Box>
                
                <Box>
                  <h3>Presentador</h3>
                  <div>{session.speaker}</div>
                  <p>{session.speakerBio}</p>
                </Box>
                
                <Box>
                  <h3>Etiquetas</h3>
                  <div>
                    {session.tags.map(tag => (
                      <span key={tag} style={{
                        display: 'inline-block',
                        margin: '0 8px 8px 0',
                        padding: '4px 8px',
                        backgroundColor: '#f0f0f0',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </Box>
                <Box>
                  <img
                    src={sessionImages[sessionId]}
                    alt={session.name}
                    style={{ width: '30', borderRadius: '8px', objectFit: 'cover' }}
                  />
                </Box>
              </SpaceBetween>
            </div>
            
            <div>

            </div>
          </Grid>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
