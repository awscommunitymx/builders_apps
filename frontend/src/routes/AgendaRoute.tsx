import { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  AppLayoutToolbar,
  BreadcrumbGroup,
  Container,
  Cards,
  StatusIndicator,
  Multiselect,
  SpaceBetween,
  Header,
  Button,
  Box,
} from '@cloudscape-design/components';
import { useNavigate } from 'react-router';
import { getSessionCardDefinition } from '../components/SessionCard';
import {
  useGetMyFavoriteSessionsQuery,
  useAddFavoriteSessionMutation,
  useRemoveFavoriteSessionMutation,
  useGetAgendaQuery,
} from '../../../generated/react/hooks';

const CHECK_INITIALIZATION = gql`
  query getMyProfile {
    getMyProfile {
      initialized
    }
  }
`;

// Importar logos de sponsors
// @ts-ignore
import astraZenecaLogo from '../assets/sponsors/AZ_RGB_H_COL.PNG';
import awsLogo from '../assets/sponsors/AWS_Logo_color.png';
import capitalOneLogo from '../assets/sponsors/_Web-C1_Core_K.png';
import doitLogo from '../assets/sponsors/DoiT_Logo_Ink_Spark.png';
import caylentLogo from '../assets/sponsors/Caylent Logo Black.png';
import nuLogo from '../assets/sponsors/01_nulogo_the-purple.png';
import ibmLogo from '../assets/sponsors/IBM_logo®_pos_blue60_RGB.png';
import epamLogo from '../assets/sponsors/EPAM_LOGO_Black.png';
import softServeLogo from '../assets/sponsors/SoftServe logo.png';
import collectorsLogo from '../assets/sponsors/Collectors_Logo_Black_RGB.png';
import ualaLogo from '../assets/sponsors/Uala_Logo_Lockup_Horizontal_FondoBlanco.png';
import wizelineLogo from '../assets/sponsors/Main_Logo_digital (1).png';
import globantLogo from '../assets/sponsors/1-Original.png'; // Usando el mismo por ahora
import zillowLogo from '../assets/sponsors/Zillow Logo_Primary.png';
import grafanaLogo from '../assets/sponsors/Grafana_Logo_Stacked_FullColor_dark (1).png';

// Definición de la interfaz para los presentadores
interface SpeakerType {
  id?: string | null;
  name: string;
  avatarUrl?: string | null;
  company?: string | null;
  bio?: string | null;
  nationality?: string | null;
  socialMedia?: {
    twitter?: string | null;
    linkedin?: string | null;
    company?: string | null;
  } | null;
}

// Definición de la interfaz para las sesiones
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
  nationality?: string | null;
  level?: string | null;
  language?: string | null;
  category?: string | null;
  capacity?: number | null;
  status?: string | null;
  liveUrl?: string | null;
  recordingUrl?: string | null;
}

// Definición de la interfaz para los sponsors
interface SponsorType {
  id: string;
  name: string;
  tier: 'Diamante' | 'Oro' | 'Plata' | 'Bronce';
  logoUrl: string;
  websiteUrl: string;
  type: 'sponsor';
}

// Definición de la unión de tipos para items que pueden ser sesiones o sponsors
type ItemType = SessionType | SponsorType;

// Definición de los sponsors por tier
const SPONSORS_DATA = {
  Diamante: [
    {
      id: 'sponsor-astrazeneca',
      name: 'AstraZeneca',
      logoUrl: astraZenecaLogo,
      websiteUrl: 'https://www.astrazeneca.com',
    },
    { id: 'sponsor-aws', name: 'AWS', logoUrl: awsLogo, websiteUrl: 'https://aws.amazon.com' },
    {
      id: 'sponsor-capitalone',
      name: 'CapitalOne',
      logoUrl: capitalOneLogo,
      websiteUrl: 'https://www.capitalone.com',
    },
    {
      id: 'sponsor-doit',
      name: 'DoIt',
      logoUrl: doitLogo,
      websiteUrl: 'https://www.doit-intl.com',
    },
    {
      id: 'sponsor-caylent',
      name: 'Caylent',
      logoUrl: caylentLogo,
      websiteUrl: 'https://caylent.com',
    },
  ],
  Oro: [
    { id: 'sponsor-nu', name: 'Nu', logoUrl: nuLogo, websiteUrl: 'https://nu.com.mx' },
    { id: 'sponsor-ibm', name: 'IBM', logoUrl: ibmLogo, websiteUrl: 'https://www.ibm.com' },
    { id: 'sponsor-epam', name: 'EPAM', logoUrl: epamLogo, websiteUrl: 'https://www.epam.com' },
    {
      id: 'sponsor-softserve',
      name: 'SoftServe',
      logoUrl: softServeLogo,
      websiteUrl: 'https://www.softserveinc.com',
    },
    {
      id: 'sponsor-collectors',
      name: 'Collectors',
      logoUrl: collectorsLogo,
      websiteUrl: 'https://www.collectors.com',
    },
  ],
  Plata: [
    { id: 'sponsor-uala', name: 'Ualá', logoUrl: ualaLogo, websiteUrl: 'https://www.uala.com.ar' },
    {
      id: 'sponsor-wizeline',
      name: 'Wizeline',
      logoUrl: wizelineLogo,
      websiteUrl: 'https://www.wizeline.com',
    },
    {
      id: 'sponsor-globant',
      name: 'Globant',
      logoUrl: globantLogo,
      websiteUrl: 'https://www.globant.com',
    },
  ],
  Bronce: [
    {
      id: 'sponsor-zillow',
      name: 'Zillow',
      logoUrl: zillowLogo,
      websiteUrl: 'https://www.zillow.com',
    },
    {
      id: 'sponsor-grafana',
      name: 'Grafana',
      logoUrl: grafanaLogo,
      websiteUrl: 'https://grafana.com',
    },
  ],
};

// Función para barajar un array
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Función para crear sponsors aleatorios respetando la jerarquía (solo se ejecuta una vez)
const createRandomSponsors = (): SponsorType[] => {
  const sponsors: SponsorType[] = [];

  // Agregar sponsors de cada tier en orden de jerarquía
  const tiers: Array<keyof typeof SPONSORS_DATA> = ['Diamante', 'Oro', 'Plata', 'Bronce'];

  tiers.forEach((tier) => {
    const shuffledSponsors = shuffleArray(SPONSORS_DATA[tier]);
    shuffledSponsors.forEach((sponsor) => {
      sponsors.push({
        ...sponsor,
        tier,
        type: 'sponsor',
      });
    });
  });

  return sponsors;
};

// Función para insertar sponsors cada 5 sesiones usando sponsors estáticos
const createMixedItems = (sessions: SessionType[], staticSponsors: SponsorType[]): ItemType[] => {
  const mixedItems: ItemType[] = [];
  let sponsorIndex = 0;

  sessions.forEach((session, index) => {
    mixedItems.push(session);

    // Insertar sponsor cada 5 sesiones (índices 4, 9, 14, etc.)
    if ((index + 1) % 5 === 0 && sponsorIndex < staticSponsors.length) {
      mixedItems.push(staticSponsors[sponsorIndex]);
      sponsorIndex++;
    }
  });

  // Agregar cualquier sponsor restante al final
  while (sponsorIndex < staticSponsors.length) {
    mixedItems.push(staticSponsors[sponsorIndex]);
    sponsorIndex++;
  }

  return mixedItems;
};

// Función para verificar si un item es un sponsor
const isSponsor = (item: ItemType): item is SponsorType => {
  return 'type' in item && item.type === 'sponsor';
};

// Función para ordenar sesiones por hora
const sortSessionsByTime = (sessions: SessionType[]): SessionType[] => {
  return [...sessions].sort((a, b) => {
    // Extraer la hora de inicio del formato "HH:MM - HH:MM"
    const startTimeA = a.time.split(' - ')[0];
    const startTimeB = b.time.split(' - ')[0];

    // Convertir a minutos para comparación más sencilla
    const [hoursA, minutesA] = startTimeA.split(':').map(Number);
    const [hoursB, minutesB] = startTimeB.split(':').map(Number);

    const totalMinutesA = hoursA * 60 + minutesA;
    const totalMinutesB = hoursB * 60 + minutesB;

    return totalMinutesA - totalMinutesB;
  });
};

// Función para verificar si una sesión ha terminado
const isSessionFinished = (sessionTime: string): boolean => {
  const now = new Date();

  // Verificar si estamos en la fecha del evento: sábado 14 de junio de 2025
  const eventDate = new Date(2025, 5, 14); // Mes 5 = junio (0-indexed)
  const isEventDay =
    now.getFullYear() === eventDate.getFullYear() &&
    now.getMonth() === eventDate.getMonth() &&
    now.getDate() === eventDate.getDate();

  // Si no es el día del evento, todas las sesiones se consideran activas
  if (!isEventDay) {
    return false;
  }

  const currentTime = now.getHours() * 60 + now.getMinutes(); // Tiempo actual en minutos

  // Extraer la hora de fin del formato "HH:MM - HH:MM"
  const endTime = sessionTime.split(' - ')[1];
  if (!endTime) return false;

  const [hours, minutes] = endTime.split(':').map(Number);
  const sessionEndTime = hours * 60 + minutes; // Tiempo de fin de sesión en minutos

  return currentTime > sessionEndTime;
};

// Función para separar sesiones activas y terminadas
const separateSessionsByStatus = (sessions: SessionType[]) => {
  const activeSessions: SessionType[] = [];
  const finishedSessions: SessionType[] = [];

  sessions.forEach((session) => {
    if (isSessionFinished(session.time)) {
      finishedSessions.push(session);
    } else {
      activeSessions.push(session);
    }
  });

  return { activeSessions, finishedSessions };
};

export function AgendaRoute() {
  const navigate = useNavigate();
  const { data: initData, loading: initLoading } = useQuery(CHECK_INITIALIZATION);

  // GraphQL query para obtener la agenda
  const { data: agendaData, loading: agendaLoading, error: agendaError } = useGetAgendaQuery();

  // Check initialization and redirect if needed
  useEffect(() => {
    if (initData?.getMyProfile && !initData.getMyProfile.initialized) {
      navigate('/profile');
    }
  }, [initData, navigate]);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]); // Changed to string[] for GraphQL
  const [expandedDescriptions, setExpandedDescriptions] = useState<string[]>([]);
  const [activeMixedItems, setActiveMixedItems] = useState<ItemType[]>([]);
  const [finishedMixedItems, setFinishedMixedItems] = useState<ItemType[]>([]);
  // Estado para sponsors estáticos - se crean una sola vez
  const [staticSponsors] = useState<SponsorType[]>(() => createRandomSponsors());

  // GraphQL hooks for favorites
  const {
    data: favoriteSessionsData,
    loading: favoritesLoading,
    refetch: refetchFavorites,
  } = useGetMyFavoriteSessionsQuery();
  const [addFavoriteSession] = useAddFavoriteSessionMutation();
  const [removeFavoriteSession] = useRemoveFavoriteSessionMutation();

  // Update favorites when GraphQL data is available
  useEffect(() => {
    if (favoriteSessionsData?.getMyFavoriteSessions) {
      setFavorites(favoriteSessionsData.getMyFavoriteSessions);
    }
  }, [favoriteSessionsData]);

  // Obtener sesiones de GraphQL y transformarlas al tipo local
  const sessions: SessionType[] = (agendaData?.getAgenda?.sessions || []).map((session) => ({
    ...session,
    // Filtrar speakers que sean null
    speakers: session.speakers?.filter((speaker) => speaker !== null) || [],
  })) as SessionType[];

  // Crear items mezclados con sponsors al cargar el componente
  useEffect(() => {
    if (sessions.length > 0) {
      const sortedSessions = sortSessionsByTime(sessions);
      const { activeSessions, finishedSessions } = separateSessionsByStatus(sortedSessions);
      setActiveMixedItems(createMixedItems(activeSessions, staticSponsors));
      setFinishedMixedItems(createMixedItems(finishedSessions, staticSponsors));
    }
  }, [sessions, staticSponsors]);

  // Actualizar la clasificación de sesiones cada minuto
  useEffect(() => {
    if (sessions.length > 0) {
      const interval = setInterval(() => {
        const sortedSessions = sortSessionsByTime(sessions);
        const { activeSessions, finishedSessions } = separateSessionsByStatus(sortedSessions);
        setActiveMixedItems(createMixedItems(activeSessions, staticSponsors));
        setFinishedMixedItems(createMixedItems(finishedSessions, staticSponsors));
      }, 60000); // Actualizar cada minuto

      return () => clearInterval(interval);
    }
  }, [sessions, staticSponsors]);

  // Estados para los filtros
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);

  // Extraer valores únicos para los filtros (solo de sesiones, no sponsors)
  const uniqueLevels = Array.from(
    new Set(sessions.map((session) => session.level).filter(Boolean))
  );
  const uniqueLocations = Array.from(
    new Set(sessions.map((session) => session.location).filter(Boolean))
  );
  const uniqueCategories = Array.from(
    new Set(sessions.map((session) => session.category).filter(Boolean))
  );
  const uniqueLanguages = Array.from(
    new Set(sessions.map((session) => session.language).filter(Boolean))
  );

  // Opciones para los multiselect - asegurándonos de que no hay valores null/undefined
  const levelOptions = uniqueLevels.map((level) => ({
    label: level as string,
    value: level as string,
  }));
  const locationOptions = uniqueLocations.map((location) => ({
    label: location as string,
    value: location as string,
  }));
  const categoryOptions = uniqueCategories.map((category) => ({
    label: category as string,
    value: category as string,
  }));
  const languageOptions = uniqueLanguages.map((language) => ({
    label: language as string,
    value: language as string,
  }));

  // Cargar favoritos al iniciar el componente ya no es necesario
  // porque ahora usamos el hook useGetMyFavoriteSessionsQuery

  const toggleFavorite = async (sessionId: string, event: CustomEvent) => {
    event.preventDefault(); // Evitar que el clic se propague al link
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
    }
  };

  const toggleDescription = (sessionId: string, event: CustomEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setExpandedDescriptions((prev) => {
      if (prev.includes(sessionId)) {
        return prev.filter((id) => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
  };

  // Función para crear la definición de tarjetas mezcladas
  const getMixedCardDefinition = () => {
    const sessionCardDef = getSessionCardDefinition({
      favorites,
      expandedDescriptions,
      onToggleFavorite: toggleFavorite,
      onToggleDescription: toggleDescription,
    });

    return {
      header: (item: ItemType) => {
        if (isSponsor(item)) {
          return (
            <Box textAlign="center" padding="m">
              <Header variant="h3" description={`Sponsor ${item.tier}`}>
                {item.name}
              </Header>
            </Box>
          );
        } else {
          return sessionCardDef.header(item as SessionType);
        }
      },
      sections: [
        {
          id: 'dynamic-content',
          content: (item: ItemType) => {
            if (isSponsor(item)) {
              return (
                <Box textAlign="center" padding="l">
                  <a
                    href={item.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: 'none',
                      display: 'block',
                      transition: 'transform 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <div
                      style={{
                        borderRadius: '8px',
                        padding: '20px',
                        minHeight: '180px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'transparent',
                      }}
                    >
                      <img
                        src={item.logoUrl}
                        alt={`${item.name} logo`}
                        style={{
                          maxWidth: '250px',
                          maxHeight: '150px',
                          objectFit: 'contain',
                          cursor: 'pointer',
                        }}
                        onError={(e) => {
                          // Fallback si la imagen no se carga
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `
                            <div style="
                              padding: 20px; 
                              color: #666; 
                              font-size: 18px; 
                              font-weight: bold;
                              text-align: center;
                            ">
                              ${item.name}
                            </div>
                          `;
                        }}
                      />
                    </div>
                  </a>
                </Box>
              );
            } else {
              // Para sesiones, retornamos un div que contiene todas las secciones
              const session = item as SessionType;
              return (
                <div>
                  {sessionCardDef.sections.map((section) => (
                    <div key={section.id} style={{ marginBottom: '1rem' }}>
                      {section.header && (
                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                          {section.header}
                        </div>
                      )}
                      {section.content(session)}
                    </div>
                  ))}
                </div>
              );
            }
          },
        },
      ],
    };
  };

  // Función para resetear todos los filtros
  const resetFilters = () => {
    setSelectedLevels([]);
    setSelectedLocations([]);
    setSelectedCategories([]);
    setSelectedLanguages([]);
    setShowOnlyFavorites(false);
  };

  // Función para filtrar items
  const filterItems = (items: ItemType[]) => {
    return items.filter((item) => {
      // Verificar si hay algún filtro activo
      const hasActiveFilters =
        selectedLevels.length > 0 ||
        selectedLocations.length > 0 ||
        selectedCategories.length > 0 ||
        selectedLanguages.length > 0 ||
        showOnlyFavorites;

      // Si es un sponsor y hay filtros activos, no incluirlo
      if (isSponsor(item)) {
        return !hasActiveFilters;
      }

      // Si es una sesión, aplicar filtros
      const session = item as SessionType;
      const levelMatch =
        selectedLevels.length === 0 || (session.level && selectedLevels.includes(session.level));
      const locationMatch =
        selectedLocations.length === 0 ||
        (session.location && selectedLocations.includes(session.location));
      const categoryMatch =
        selectedCategories.length === 0 ||
        (session.category && selectedCategories.includes(session.category));
      const languageMatch =
        selectedLanguages.length === 0 ||
        (session.language && selectedLanguages.includes(session.language));

      // Filtro de favoritos
      const favoriteMatch = !showOnlyFavorites || favorites.includes(session.id);

      return levelMatch && locationMatch && categoryMatch && languageMatch && favoriteMatch;
    });
  };

  // Filtrar sesiones activas y terminadas
  const filteredActiveItems = filterItems(activeMixedItems);
  const filteredFinishedItems = filterItems(finishedMixedItems);

  // Contar solo las sesiones filtradas para el indicador
  const filteredActiveSessionsCount = filteredActiveItems.filter((item) => !isSponsor(item)).length;
  const filteredFinishedSessionsCount = filteredFinishedItems.filter(
    (item) => !isSponsor(item)
  ).length;
  const totalFilteredSessionsCount = filteredActiveSessionsCount + filteredFinishedSessionsCount;

  return (
    <AppLayoutToolbar
      navigationHide={true}
      toolsHide={true}
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: 'Inicio', href: '/' },
            { text: 'Agenda', href: '/agenda' },
          ]}
        />
      }
      content={
        <SpaceBetween size="l">
          {/* Mostrar loading si está cargando los datos */}
          {(agendaLoading || initLoading) && (
            <Container>
              <StatusIndicator type="loading">Cargando agenda...</StatusIndicator>
            </Container>
          )}

          {/* Mostrar error si hay algún error */}
          {agendaError && (
            <Container>
              <StatusIndicator type="error">
                Error al cargar la agenda: {agendaError.message}
              </StatusIndicator>
            </Container>
          )}

          {/* Contenido principal - solo mostrar si no hay loading ni error */}
          {!agendaLoading && !initLoading && !agendaError && (
            <>
              {/* Botones superiores */}
              <div
                style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}
              >
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  iconName={showFilters ? 'angle-up' : 'angle-down'}
                  variant="primary"
                >
                  {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                </Button>
                <Button
                  onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                  variant={showOnlyFavorites ? 'primary' : 'normal'}
                  iconName={showOnlyFavorites ? 'heart-filled' : 'heart'}
                >
                  {showOnlyFavorites ? 'Mostrando solo favoritos' : 'Mostrar solo mis favoritos'}
                </Button>
              </div>

              {/* Sección de filtros - mostrar solo si showFilters es true */}
              {showFilters && (
                <Container header={<Header variant="h2">Filtros</Header>}>
                  <SpaceBetween size="m">
                    {/* Filtro de Nivel */}
                    <div>
                      <Header variant="h3">Nivel</Header>
                      <Multiselect
                        selectedOptions={selectedLevels.map((level) => ({
                          label: level,
                          value: level,
                        }))}
                        onChange={({ detail }) =>
                          setSelectedLevels(
                            detail.selectedOptions.map((option) => option.value as string)
                          )
                        }
                        options={levelOptions}
                        placeholder="Seleccionar niveles"
                        filteringType="auto"
                      />
                    </div>

                    {/* Filtro de Ubicación */}
                    <div>
                      <Header variant="h3">Sala</Header>
                      <Multiselect
                        selectedOptions={selectedLocations.map((location) => ({
                          label: location,
                          value: location,
                        }))}
                        onChange={({ detail }) =>
                          setSelectedLocations(
                            detail.selectedOptions.map((option) => option.value as string)
                          )
                        }
                        options={locationOptions}
                        placeholder="Seleccionar ubicaciones"
                        filteringType="auto"
                      />
                    </div>

                    {/* Filtro de Categoría */}
                    <div>
                      <Header variant="h3">Categoría</Header>
                      <Multiselect
                        selectedOptions={selectedCategories.map((category) => ({
                          label: category,
                          value: category,
                        }))}
                        onChange={({ detail }) =>
                          setSelectedCategories(
                            detail.selectedOptions.map((option) => option.value as string)
                          )
                        }
                        options={categoryOptions}
                        placeholder="Seleccionar categorías"
                        filteringType="auto"
                      />
                    </div>

                    {/* Filtro de Idioma */}
                    <div>
                      <Header variant="h3">Idioma</Header>
                      <Multiselect
                        selectedOptions={selectedLanguages.map((language) => ({
                          label: language,
                          value: language,
                        }))}
                        onChange={({ detail }) =>
                          setSelectedLanguages(
                            detail.selectedOptions.map((option) => option.value as string)
                          )
                        }
                        options={languageOptions}
                        placeholder="Seleccionar idiomas"
                        filteringType="auto"
                      />
                    </div>

                    {/* Información de filtros activos y botón de reset */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <StatusIndicator type="success">
                        {totalFilteredSessionsCount} sesiones encontradas (
                        {filteredActiveSessionsCount} activas, {filteredFinishedSessionsCount}{' '}
                        terminadas)
                      </StatusIndicator>

                      {(selectedLevels.length > 0 ||
                        selectedLocations.length > 0 ||
                        selectedCategories.length > 0 ||
                        selectedLanguages.length > 0 ||
                        showOnlyFavorites) && (
                        <Button onClick={resetFilters} iconName="refresh" variant="normal">
                          Limpiar filtros
                        </Button>
                      )}
                    </div>
                  </SpaceBetween>
                </Container>
              )}

              {/* Sección de sesiones activas */}
              {filteredActiveItems.length > 0 && (
                <>
                  <Header variant="h2">Sesiones Activas</Header>
                  <Cards
                    cardsPerRow={[
                      { cards: 1 }, // Default for smallest screens
                      { minWidth: 500, cards: 2 }, // Only use 2 cards when width >= 500px
                    ]}
                    variant="full-page"
                    items={filteredActiveItems}
                    cardDefinition={getMixedCardDefinition()}
                  />
                </>
              )}

              {/* Sección de sesiones terminadas */}
              {filteredFinishedItems.length > 0 && (
                <>
                  <Header variant="h2" description="Sesiones que ya han finalizado">
                    Sesiones Terminadas
                  </Header>
                  <Cards
                    cardsPerRow={[
                      { cards: 1 }, // Default for smallest screens
                      { minWidth: 500, cards: 2 }, // Only use 2 cards when width >= 500px
                    ]}
                    variant="full-page"
                    items={filteredFinishedItems}
                    cardDefinition={getMixedCardDefinition()}
                  />
                </>
              )}
            </>
          )}
        </SpaceBetween>
      }
    />
  );
}
