import { Link, Button, Badge } from '@cloudscape-design/components';
import Avatar from '@cloudscape-design/chat-components/avatar';
import CountryFlag from './CountryFlag';

// Definición de la interfaz para los presentadores
interface SpeakerType {
  name: string;
  avatarUrl: string;
  company?: string;
  nationality?: string;
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
  Nationality?: string;
}

interface SessionCardProps {
  item: SessionType;
  favorites: number[];
  expandedDescriptions: string[];
  onToggleFavorite: (sessionId: string, event: CustomEvent) => void;
  onToggleDescription: (sessionId: string, event: CustomEvent) => void;
}

// Función para determinar el color según el nivel
const getLevelColor = (
  level: string
): 'severity-medium' | 'severity-low' | 'grey' | 'severity-high' => {
  switch (level) {
    case 'L100':
      return 'severity-low'; // Nivel principiante
    case 'L200':
      return 'severity-medium'; // Nivel intermedio
    case 'L300':
      return 'severity-high'; // Nivel avanzado
    case 'L400':
      return 'severity-high'; // Nivel experto
    default:
      return 'grey';
  }
};

// Función para truncar texto
const truncateText = (text: string, maxLength: number = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Función para convertir saltos de línea a elementos <br>
const formatTextWithBreaks = (text: string) => {
  return text.split(/\r\n|\r|\n/).map((line, index, array) => (
    <span key={index}>
      {line}
      {index < array.length - 1 && <br />}
    </span>
  ));
};

export const getSessionCardDefinition = ({
  favorites,
  expandedDescriptions,
  onToggleFavorite,
  onToggleDescription,
}: Omit<SessionCardProps, 'item'>) => ({
  header: (item: SessionType) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Link href={`/${item.id}`}>{item.name}</Link>
      <Button
        variant="icon"
        iconName={favorites.includes(parseInt(item.id, 10)) ? 'heart-filled' : 'heart'}
        onClick={(e) => onToggleFavorite(item.id, e)}
        ariaLabel={
          favorites.includes(parseInt(item.id, 10))
            ? 'Quitar de favoritos'
            : 'Agregar a favoritos'
        }
      />
    </div>
  ),
  sections: [
    {
      id: 'description',
      header: 'Descripción',
      content: (item: SessionType) => (
        <div>
          {expandedDescriptions.includes(item.id)
            ? formatTextWithBreaks(item.description)
            : formatTextWithBreaks(truncateText(item.description))}
          {item.description.length > 100 && (
            <div style={{ marginTop: '0px' }}>
              <Button
                variant="inline-link"
                onClick={(e) => onToggleDescription(item.id, e)}
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
      content: (item: SessionType) => (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Horario</div>
            <div>{item.time}</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Escenario</div>
            <div>{item.location}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'speaker',
      header: 'Presentadores',
      content: (item: SessionType) => (
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
      content: (item: SessionType) => <Badge color={getLevelColor(item.level)}>{item.level}</Badge>,
    },
    {
      id: 'category-language',
      content: (item: SessionType) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Badge color={'severity-neutral'}>{item.catergory}</Badge>
          <Badge color={'blue'}>{item.language}</Badge>
        </div>
      ),
    },
  ],
});
