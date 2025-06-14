import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Container,
  ContentLayout,
  SpaceBetween,
  Header,
  Box,
  Button,
  Grid,
  StatusIndicator,
} from '@cloudscape-design/components';
import Avatar from '@cloudscape-design/chat-components/avatar';
import CountryFlag from './CountryFlag';
import {
  useGetAgendaQuery,
  useGetMyFavoriteSessionsQuery,
  useAddFavoriteSessionMutation,
  useRemoveFavoriteSessionMutation,
} from '../../../generated/react/hooks';

// Sample images - usados como fallback en caso de no tener imágenes reales
const sessionImages: { [key: string]: string } = {
  default: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format',
};

// Define the Speaker interface - actualizada para coincidir con GraphQL
interface SpeakerType {
  id?: string | null;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  company?: string | null;
  nationality?: string | null;
  socialMedia?: {
    linkedin?: string | null;
    github?: string | null;
    twitter?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    blog?: string | null;
    company?: string | null;
    other?: string | null;
  } | null;
}

// Define the Session interface - actualizada para coincidir con GraphQL
interface SessionType {
  id: string;
  name?: string | null;
  description?: string | null;
  extendedDescription?: string | null;
  speakers?: SpeakerType[] | null;
  time: string;
  dateStart: string;
  dateEnd: string;
  duration?: number | null;
  location?: string | null;
  capacity?: number | null;
  nationality?: string | null;
  level?: string | null;
  language?: string | null;
  category?: string | null;
  status?: string | null;
  liveUrl?: string | null;
  recordingUrl?: string | null;
  tags?: string[]; // Campo computado para compatibilidad con la UI
}

export interface SessionDetailProps {
  sessionId: string;
}

export default function SessionDetail({ sessionId }: SessionDetailProps) {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // GraphQL queries y mutations
  const { data: agendaData, loading: agendaLoading, error: agendaError } = useGetAgendaQuery();
  const {
    data: favoriteSessionsData,
    loading: favoritesLoading,
    refetch: refetchFavorites,
  } = useGetMyFavoriteSessionsQuery();
  const [addFavoriteSession] = useAddFavoriteSessionMutation();
  const [removeFavoriteSession] = useRemoveFavoriteSessionMutation();

  // Obtener sesiones de GraphQL y transformarlas al tipo local
  const sessions: SessionType[] = (agendaData?.getAgenda?.sessions || []).map((session: any) => ({
    ...session,
    // Filtrar speakers que sean null
    speakers: session.speakers?.filter((speaker: any) => speaker !== null) || [],
    // Crear tags a partir de los campos para compatibilidad con la UI
    tags: [
      session.language,
      session.category,
      session.level,
    ].filter(Boolean) as string[],
  })) as SessionType[];

  // Buscar la sesión específica por ID
  const session = sessions.find((s) => s.id === sessionId);

  // Update favorites when GraphQL data is available
  useEffect(() => {
    if (favoriteSessionsData?.getMyFavoriteSessions) {
      setFavorites(favoriteSessionsData.getMyFavoriteSessions);
      setIsFavorite(favoriteSessionsData.getMyFavoriteSessions.includes(sessionId));
    }
  }, [favoriteSessionsData, sessionId]);

  // Función para convertir saltos de línea a elementos <br>
  const formatTextWithBreaks = (text: string) => {
    return text.split(/\r\n|\r|\n/).map((line, index, array) => (
      <span key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </span>
    ));
  };

  const toggleFavorite = async (event: CustomEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Verificar si ya estaba en favoritos antes de actualizar el estado
    const isCurrentlyFavorited = favorites.includes(sessionId);

    // Actualizar el estado local primero para una UI responsiva
    setFavorites((prevFavorites) => {
      if (prevFavorites.includes(sessionId)) {
        return prevFavorites.filter((id) => id !== sessionId);
      } else {
        return [...prevFavorites, sessionId];
      }
    });
    setIsFavorite(!isCurrentlyFavorited);

    try {
      if (isCurrentlyFavorited) {
        // Quitar de favoritos
        await removeFavoriteSession({
          variables: { sessionId },
        });
        console.log(`Sesión ${sessionId} eliminada de favoritos con éxito`);
      } else {
        // Agregar a favoritos
        await addFavoriteSession({
          variables: { sessionId },
        });
        console.log(`Sesión ${sessionId} agregada a favoritos con éxito`);
      }

      // Refrescar los favoritos desde el servidor
      await refetchFavorites();
    } catch (error) {
      console.error('Error al actualizar favoritos:', error);

      // Revertir el cambio local en caso de error
      setFavorites((prevFavorites) => {
        if (isCurrentlyFavorited) {
          return [...prevFavorites, sessionId]; // Volver a agregar
        } else {
          return prevFavorites.filter((id) => id !== sessionId); // Volver a quitar
        }
      });
      setIsFavorite(isCurrentlyFavorited);
    }
  };

  // Mostrar loading mientras se cargan los datos
  if (agendaLoading || favoritesLoading) {
    return (
      <Container>
        <StatusIndicator type="loading">Cargando detalles de la sesión...</StatusIndicator>
      </Container>
    );
  }

  // Mostrar error si hay algún error
  if (agendaError) {
    return (
      <Container>
        <StatusIndicator type="error">
          Error al cargar los datos: {agendaError.message}
        </StatusIndicator>
      </Container>
    );
  }

  // Verificar si el ID de sesión es válido
  if (!sessionId || !session) {
    return (
      <Container header={<Header>Sesión no encontrada</Header>}>
        <Box textAlign="center" padding="l">
          <SpaceBetween size="m">
            <div>La sesión solicitada no existe o ha sido eliminada.</div>
            <Button onClick={() => navigate('/agenda')}>Volver a la agenda</Button>
          </SpaceBetween>
        </Box>
      </Container>
    );
  }
  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={
            <SpaceBetween direction="horizontal" size="s">
              <Button
                variant="icon"
                iconName={isFavorite ? 'heart-filled' : 'heart'}
                onClick={toggleFavorite}
                ariaLabel={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              />
              <Button variant="primary" onClick={() => navigate('/agenda')}>
                Volver a la agenda
              </Button>
            </SpaceBetween>
          }
        >
          {session.name || 'Sesión sin título'}
        </Header>
      }
      maxContentWidth={1200}
    >
      <SpaceBetween size="xs">
        <Container>
          <SpaceBetween size="s">
            {/* Primera fila: Horario, Ubicación, Capacidad */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                justifyContent: 'space-between',
                width: '100%',
                overflowX: 'auto', // Permite desplazamiento horizontal en pantallas muy pequeñas
              }}
            >
              <div style={{ flex: '1', minWidth: '10px', paddingRight: '3px' }}>
                <Box variant="awsui-key-label">Horario</Box>
                <div>{session.time}</div>
              </div>

              <div style={{ flex: '1', minWidth: '10px', padding: '0 3px' }}>
                <Box variant="awsui-key-label">Escenario</Box>
                <div>{session.location || 'No especificado'}</div>
              </div>

              <div style={{ flex: '1', minWidth: '10px', paddingLeft: '3px' }}>
                <Box variant="awsui-key-label">Duracion</Box>
                <div>{session.duration ? `${session.duration} minutos` : 'No disponible'}</div>
              </div>
            </div>

            {isFavorite && (
              <StatusIndicator type="success">Esta sesión está en tus favoritos</StatusIndicator>
            )}
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="s">
            <Box>
              <h3>Descripción</h3>
              <p>{formatTextWithBreaks(session.extendedDescription || session.description || 'Sin descripción disponible')}</p>
            </Box>

            <Box>
              <h3>Presentadores</h3>

              <SpaceBetween size="s">
                {(session.speakers || []).map((speaker, index) => (
                  <div key={index} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Avatar ariaLabel="" imgUrl={speaker.avatarUrl || undefined} width={40} />
                      <div style={{ marginLeft: '15px', flex: 1 }}>
                        <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                          {speaker.name}
                          {speaker.nationality && <CountryFlag nationality={speaker.nationality} />}
                        </div>
                        {speaker.company && (
                          <div style={{ fontSize: '14px', color: '#222' }}>{speaker.company}</div>
                        )}
                        {/* Mostrar biografía si está disponible */}
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                          {speaker.bio || 'No hay biografía disponible para este ponente.'}
                        </div>

                        {/* Social Media Icons */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {speaker.socialMedia?.linkedin && (
                            <a
                              href={speaker.socialMedia.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="LinkedIn"
                              title="LinkedIn"
                              style={{ color: '#1a1a1a', textDecoration: 'none' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
                                </svg>
                              </div>
                            </a>
                          )}
                          {speaker.socialMedia?.github && (
                            <a
                              href={speaker.socialMedia.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="GitHub"
                              title="GitHub"
                              style={{ color: '#1a1a1a', textDecoration: 'none' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                              </div>
                            </a>
                          )}
                          {speaker.socialMedia?.twitter && (
                            <a
                              href={speaker.socialMedia.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="X (Twitter)"
                              title="X (Twitter)"
                              style={{ color: '#1a1a1a', textDecoration: 'none' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                              </div>
                            </a>
                          )}
                          {speaker.socialMedia?.facebook && (
                            <a
                              href={speaker.socialMedia.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Facebook"
                              title="Facebook"
                              style={{ color: '#1a1a1a', textDecoration: 'none' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                                </svg>
                              </div>
                            </a>
                          )}
                          {speaker.socialMedia?.instagram && (
                            <a
                              href={speaker.socialMedia.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Instagram"
                              title="Instagram"
                              style={{ color: '#1a1a1a', textDecoration: 'none' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                              </div>
                            </a>
                          )}
                          {speaker.socialMedia?.blog && (
                            <a
                              href={speaker.socialMedia.blog}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Blog Personal"
                              title="Blog Personal"
                              style={{ color: '#1a1a1a', textDecoration: 'none' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12,2C9.24,2,7,4.24,7,7v2h10V7C17,4.24,14.76,2,12,2z M12,6c-0.55,0-1-0.45-1-1s0.45-1,1-1s1,0.45,1,1S12.55,6,12,6z" />
                                  <path d="M12,11c-4.42,0-8,1.79-8,4v5c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2v-5C20,12.79,16.42,11,12,11z" />
                                </svg>
                              </div>
                            </a>
                          )}
                          {speaker.socialMedia?.company && (
                            <a
                              href={speaker.socialMedia.company}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Sitio web de la compañía"
                              title="Sitio web de la compañía"
                              style={{ color: '#1a1a1a', textDecoration: 'none' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm1 16.057v-3.057h2.994c-.059 1.143-.212 2.24-.456 3.279-.823-.12-1.674-.188-2.538-.222zm1.957 2.162c-.499 1.33-1.159 2.497-1.957 3.456v-3.62c.666.028 1.319.081 1.957.164zm-1.957-7.219v-3.015c.868-.034 1.721-.103 2.548-.224.238 1.027.389 2.111.446 3.239h-2.994zm0-5.014v-3.661c.806.969 1.471 2.15 1.971 3.496-.642.084-1.3.137-1.971.165zm2.703-3.267c1.237.496 2.354 1.228 3.29 2.146-.642.234-1.311.442-2.019.607-.344-.992-.775-1.91-1.271-2.753zm-7.241 13.56c-.244-1.039-.398-2.136-.456-3.279h2.994v3.057c-.865.034-1.714.102-2.538.222zm2.538 1.776v3.62c-.798-.959-1.458-2.126-1.957-3.456.638-.083 1.291-.136 1.957-.164zm-2.994-7.055c.057-1.128.207-2.212.446-3.239.827.121 1.68.19 2.548.224v3.015h-2.994zm1.024-5.179c.5-1.346 1.165-2.527 1.97-3.496v3.661c-.671-.028-1.329-.081-1.97-.165zm-2.005-.35c-.708-.165-1.377-.373-2.018-.607.937-.918 2.053-1.65 3.29-2.146-.496.844-.927 1.762-1.272 2.753zm-.549 1.918c-.264 1.151-.434 2.36-.492 3.611h-3.933c.165-1.658.739-3.197 1.617-4.518.88.361 1.816.67 2.808.907zm.009 9.262c-.988.236-1.92.542-2.797.9-.89-1.328-1.471-2.879-1.637-4.551h3.934c.058 1.265.231 2.488.5 3.651zm.553 1.917c.342.976.768 1.881 1.257 2.712-1.223-.49-2.326-1.211-3.256-2.115.636-.229 1.299-.435 1.999-.597zm9.924 0c.7.163 1.362.367 1.999.597-.931.903-2.034 1.625-3.257 2.116.489-.832.915-1.737 1.258-2.713zm.553-1.917c.27-1.163.442-2.386.501-3.651h3.934c-.167 1.672-.748 3.223-1.638 4.551-.877-.358-1.81-.664-2.797-.9zm.501-5.651c-.058-1.251-.229-2.46-.492-3.611.992-.237 1.929-.546 2.809-.907.877 1.321 1.451 2.86 1.616 4.518h-3.933z" />
                                </svg>
                              </div>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </SpaceBetween>
            </Box>
            <Box>
              <h3>Etiquetas</h3>
              <div>
                {session.tags &&
                  session.tags.map((tag: string) => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-block',
                        margin: '0 8px 8px 0',
                        padding: '4px 8px',
                        backgroundColor: '#e0e0e3',
                        borderRadius: '4px',
                        fontSize: '14px',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </Box>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
