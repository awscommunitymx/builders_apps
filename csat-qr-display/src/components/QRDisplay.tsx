import QRCode from 'react-qr-code';
import { useParams } from 'react-router-dom';
import { useAgendaData } from '../hooks/useAgendaData';

interface QRDisplayProps {
  roomName?: string;
}

// Helper function to transform kebab-case to Title Case
const formatRoomName = (name: string): string => {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export function QRDisplay({ roomName: propRoomName }: QRDisplayProps) {
  const { roomName } = useParams<{ roomName: string }>();

  const finalRoomName = propRoomName || roomName;

  // Transform room name to Title Case only for useAgendaData
  const formattedRoomName = finalRoomName ? formatRoomName(finalRoomName) : '';

  // Get agenda data for the room to find current session
  const { currentSession, loading, error } = useAgendaData(formattedRoomName);

  const frontendUrl =
    import.meta.env.VITE_FRONTEND_URL || 'https://mx-central-1-staging.console.awscommunity.mx';

  // Determine which session ID to use
  const qrSessionId = currentSession?.id;

  // Generate QR code data with session-based URL format
  const qrData = `${frontendUrl}/session/${qrSessionId}/csat`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#00FF00', // Chroma green
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        {loading && <div>Loading...</div>}
        {error && <div>Error: {error.message}</div>}
        {currentSession && (
          <QRCode size={400} value={qrData} bgColor="#ffffff" fgColor="#000000" level="M" />
        )}
      </div>
    </div>
  );
}
