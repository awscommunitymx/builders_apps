import React, { useState } from 'react';
import { Container, Cards, Link, Button, Icon } from '@cloudscape-design/components';
import { useNavigate } from 'react-router';

// Datos de ejemplo para un evento/conferencia
const items = [
  {
    id: '1',
    name: 'Innovación en Inteligencia Artificial',
    description: 'Explorando las últimas tendencias en IA y sus aplicaciones prácticas',
    speaker: 'Dra. María Rodríguez',
    time: '09:00 - 10:30',
    location: 'Sala Principal',
  },
  {
    id: '2',
    name: 'Desarrollo Sostenible y Tecnología',
    description: 'Cómo la tecnología puede impulsar iniciativas de sostenibilidad',
    speaker: 'Ing. Carlos Mendoza',
    time: '11:00 - 12:30',
    location: 'Auditorio B',
  },
  {
    id: '3',
    name: 'Seguridad en la Nube: Desafíos Actuales',
    description: 'Estrategias para proteger datos e infraestructura en entornos cloud',
    speaker: 'Lic. Ana Gómez',
    time: '14:00 - 15:30',
    location: 'Sala de Conferencias C',
  },
];

export default function SessionLists() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const navigate = useNavigate();

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

  return (
    <Container header="Agenda del Evento">
      <Cards
        cardsPerRow={[
          { cards: 1 }, // Default for smallest screens
          { minWidth: 500, cards: 2 }, // Only use 2 cards when width >= 500px
        ]}
        items={items}
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
              content: (item) => item.description,
            },
            {
              id: 'speaker',
              header: 'Presentador',
              content: (item) => item.speaker,
            },
            {
              id: 'time',
              header: 'Horario',
              content: (item) => item.time,
            },
            {
              id: 'location',
              header: 'Ubicación',
              content: (item) => item.location,
            },
          ],
        }}
      />
    </Container>
  );
}
