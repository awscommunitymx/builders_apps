import React, { useState, useEffect } from 'react';
import {
  Container,
  Cards,
  Link,
  Button,
  Icon,
  Badge,
  StatusIndicator,
  Multiselect,
  SpaceBetween,
  Header,
} from '@cloudscape-design/components';
import { useNavigate } from 'react-router';
import Avatar from '@cloudscape-design/chat-components/avatar';
import sessionsData from '../data/sessions-transformed.json';
import CountryFlag from './CountryFlag';

// Definición de la interfaz para los presentadores
interface SpeakerType {
  name: string;
  avatarUrl: string;
  company?: string;
  nationality?: string; // Añadimos nacionalidad específica para cada ponente
}

// Definición de la interfaz para las sesiones
interface SessionType {
  id: string;
  name: string;
  description: string;
  speakers: SpeakerType[];
  time: string;
  location: string;
  level: string;
  language: string;
  catergory: string;
  Nationality?: string; // Campo para la nacionalidad (mantenemos por compatibilidad)
}

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

// Extraer los datos del JSON y ordenarlos por hora
const items: SessionType[] = sortSessionsByTime(sessionsData.sessions);

export default function SessionLists() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState<string[]>([]);

  // Estados para los filtros
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // Extraer valores únicos para los filtros
  const uniqueLevels = Array.from(new Set(items.map((item) => item.level)));
  const uniqueLocations = Array.from(new Set(items.map((item) => item.location)));
  const uniqueCategories = Array.from(new Set(items.map((item) => item.catergory)));
  const uniqueLanguages = Array.from(new Set(items.map((item) => item.language)));

  // Opciones para los multiselect
  const levelOptions = uniqueLevels.map((level) => ({ label: level, value: level }));
  const locationOptions = uniqueLocations.map((location) => ({ label: location, value: location }));
  const categoryOptions = uniqueCategories.map((category) => ({
    label: category,
    value: category,
  }));

  const navigate = useNavigate();

  // Función para determinar el color según el nivel
  const getLevelColor = (
    level: string
  ): 'severity-medium' | 'severity-low' | 'grey' | 'severity-high' => {
    switch (level) {
      case 'Básico':
        return 'severity-low'; // Usar 'severity-high' para el nivel básico
      case 'Intermedio':
        return 'severity-medium'; // Usar 'severity-medium' para el nivel intermedio
      case 'Avanzado':
        return 'severity-high';
      default:
        return 'grey';
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    navigate(`/agenda/${sessionId}`);
  };

  const toggleFavorite = (sessionId: string, event: CustomEvent) => {
    event.preventDefault(); // Evitar que el clic se propague al link
    event.stopPropagation();

    setFavorites((prevFavorites) => {
      if (prevFavorites.includes(sessionId)) {
        return prevFavorites.filter((id) => id !== sessionId);
      } else {
        return [...prevFavorites, sessionId];
      }
    });
    console.log(
      `Sesión ${sessionId} ${favorites.includes(sessionId) ? 'eliminada de' : 'agregada a'} favoritos`
    );
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

  // Función para truncar texto
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Función para resetear todos los filtros
  const resetFilters = () => {
    setSelectedLevels([]);
    setSelectedLocations([]);
    setSelectedCategories([]);
    setSelectedLanguages([]);
  };

  // Filtrar los items según las selecciones
  const filteredItems = items.filter((item) => {
    // Si no hay filtros seleccionados, mostrar todos los items
    const levelMatch = selectedLevels.length === 0 || selectedLevels.includes(item.level);
    const locationMatch =
      selectedLocations.length === 0 || selectedLocations.includes(item.location);
    const categoryMatch =
      selectedCategories.length === 0 || selectedCategories.includes(item.catergory);
    const languageMatch =
      selectedLanguages.length === 0 || selectedLanguages.includes(item.language);

    return levelMatch && locationMatch && categoryMatch && languageMatch;
  });

  return (
    <SpaceBetween size="l">
      {/* Sección de filtros */}
      <Container header={<Header variant="h2">Filtros</Header>}>
        <SpaceBetween size="m">
          {/* Filtro de Nivel */}
          <div>
            <Header variant="h3">Nivel</Header>
            <Multiselect
              selectedOptions={selectedLevels.map((level) => ({ label: level, value: level }))}
              onChange={({ detail }) =>
                setSelectedLevels(detail.selectedOptions.map((option) => option.value as string))
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
                setSelectedLocations(detail.selectedOptions.map((option) => option.value as string))
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
                setSelectedLanguages(detail.selectedOptions.map((option) => option.value as string))
              }
              options={uniqueLanguages.map((language) => ({ label: language, value: language }))}
              placeholder="Seleccionar idiomas"
              filteringType="auto"
            />
          </div>

          {/* Información de filtros activos y botón de reset */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusIndicator type="success">
              {filteredItems.length} sesiones encontradas
              {selectedLevels.length > 0 ||
                selectedLocations.length > 0 ||
                selectedCategories.length > 0 ||
                selectedLanguages.length > 0}
            </StatusIndicator>

            {(selectedLevels.length > 0 ||
              selectedLocations.length > 0 ||
              selectedCategories.length > 0 ||
              selectedLanguages.length > 0) && (
              <Button onClick={resetFilters} iconName="refresh" variant="normal">
                Limpiar filtros
              </Button>
            )}
          </div>
        </SpaceBetween>
      </Container>

      {/* Sección de tarjetas */}
      <Cards
        cardsPerRow={[
          { cards: 1 }, // Default for smallest screens
          { minWidth: 500, cards: 2 }, // Only use 2 cards when width >= 500px
        ]}
        variant="container"
        items={filteredItems}
        cardDefinition={{
          header: (item) => (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link href="#" onFollow={() => handleSessionSelect(item.id)}>
                {item.name}
              </Link>
              <Button
                variant="icon"
                iconName={favorites.includes(item.id) ? 'heart-filled' : 'heart'}
                onClick={(e) => toggleFavorite(item.id, e)}
                ariaLabel={
                  favorites.includes(item.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'
                }
              />
            </div>
          ),
          sections: [
            {
              id: 'description',
              header: 'Descripción',
              content: (item) => (
                <div>
                  {expandedDescriptions.includes(item.id)
                    ? item.description
                    : truncateText(item.description)}
                  {item.description.length > 100 && (
                    <div style={{ marginTop: '8px' }}>
                      <Button
                        variant="link"
                        onClick={(e) => toggleDescription(item.id, e)}
                        ariaLabel={
                          expandedDescriptions.includes(item.id) ? 'Leer menos' : 'Leer más'
                        }
                      >
                        {expandedDescriptions.includes(item.id) ? 'Leer menos' : 'Leer más'}
                      </Button>
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'details',
              content: (item) => (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Horario</div>
                    <div>{item.time}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Ubicación</div>
                    <div>{item.location}</div>
                  </div>
                </div>
              ),
            },
            {
              id: 'speaker',
              header: 'Presentadores',
              content: (item) => (
                <div style={{ marginTop: '4px', marginBottom: '4px' }}>
                  {item.speakers.map((speaker, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: index < item.speakers.length - 1 ? '10px' : '0',
                        padding: '6px',
                        borderRadius: '4px',
                        backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'transparent',
                      }}
                    >
                      <Avatar ariaLabel={speaker.name} imgUrl={speaker.avatarUrl} width={36} />
                      <div style={{ marginLeft: '12px', flex: 1 }}>
                        <div
                          style={{
                            fontWeight: '600',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {speaker.name}
                          <CountryFlag nationality={speaker.nationality} />
                        </div>
                        {speaker.company && (
                          <div style={{ fontSize: '12px', color: '#555' }}>{speaker.company}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              id: 'level',
              content: (item) => <Badge color={getLevelColor(item.level)}>{item.level}</Badge>,
            },
            {
              id: 'category-language',
              content: (item) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <Badge color={'severity-neutral'}>{item.catergory}</Badge>
                  <Badge color={'blue'}>{item.language}</Badge>
                </div>
              ),
            },
          ],
        }}
      />
    </SpaceBetween>
  );
}
