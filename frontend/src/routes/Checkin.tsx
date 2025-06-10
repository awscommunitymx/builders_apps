import React, { useState } from 'react';
import {
  Button,
  Input,
  SpaceBetween,
  Container,
  Header,
  Box,
  Modal,
  Checkbox,
  Flashbar,
  Spinner,
} from '@cloudscape-design/components';
import algoliasearch from 'algoliasearch/lite';
import { gql, useMutation } from '@apollo/client';
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';

// Initialize Algolia client
const searchClient = algoliasearch(
  import.meta.env.VITE_ALGOLIA_APP_ID || '',
  import.meta.env.VITE_ALGOLIA_SEARCH_KEY || ''
);

const index = searchClient.initIndex(import.meta.env.VITE_ALGOLIA_INDEX_NAME || '');

const CHECK_IN_ATTENDEE = gql`
  mutation CheckInAttendee(
    $barcode_id: ID
    $user_id: ID
    $bypass_email: Boolean
    $bypass_phone: Boolean
    $email: String
    $phone: String
  ) {
    checkInAttendee(
      barcode_id: $barcode_id
      user_id: $user_id
      bypass_email: $bypass_email
      bypass_phone: $bypass_phone
      email: $email
      phone: $phone
    ) {
      status
      message
      missingFields
      user {
        user_id
        name
        ticket_class_id
      }
    }
  }
`;

interface Attendee {
  objectID: string;
  name: string;
  email?: string;
  company?: string;
}

interface CheckInResponse {
  status: 'SUCCESS' | 'INCOMPLETE_PROFILE';
  message: string;
  missingFields: string[] | null;
  user?: {
    user_id: string;
    name: string;
    ticket_class_id: string;
  };
}

interface Notification {
  type: 'success' | 'error';
  content: string;
  dismissible: boolean;
  onDismiss: () => void;
  user?: {
    user_id: string;
    name: string;
    ticket_class_id: string;
  };
}

const Checkin: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Attendee[]>([]);
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [bypassEmail, setBypassEmail] = useState(false);
  const [bypassPhone, setBypassPhone] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingAttendeeId, setLoadingAttendeeId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    name: string;
    ticket_class_id: string;
  } | null>(null);

  const [checkInAttendee] = useMutation(CHECK_IN_ATTENDEE);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      try {
        const { hits } = await index.search(query);
        setSearchResults(hits as Attendee[]);
      } catch (error) {
        console.error('Error searching:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const canSubmit = () => {
    if (!email && !bypassEmail) return false;
    if (!phone && !bypassPhone) return false;
    return true;
  };

  const handleCheckin = async (attendee: Attendee) => {
    setLoadingAttendeeId(attendee.objectID);
    try {
      const { data } = await checkInAttendee({
        variables: {
          user_id: attendee.objectID,
          bypass_email: bypassEmail,
          bypass_phone: bypassPhone,
          email: email || undefined,
          phone: phone || undefined,
        },
      });

      const response = data.checkInAttendee as CheckInResponse;

      if (response.status === 'SUCCESS' && response.user) {
        setCheckInResult({
          name: response.user.name,
          ticket_class_id: response.user.ticket_class_id,
        });
        setNotifications([
          {
            type: 'success',
            content: `Check-in successful for ${response.user.name} (${response.user.ticket_class_id})`,
            dismissible: true,
            onDismiss: () => setNotifications([]),
          },
        ]);
        setShowModal(false);
        setBypassEmail(false);
        setBypassPhone(false);
        setEmail('');
        setPhone('');
      } else {
        setSelectedAttendee(attendee);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      setNotifications([
        {
          type: 'error',
          content: 'Error during check-in. Please try again.',
          dismissible: true,
          onDismiss: () => setNotifications([]),
        },
      ]);
    } finally {
      setLoadingAttendeeId(null);
    }
  };

  const handleRetryCheckin = () => {
    if (!canSubmit()) {
      setNotifications([
        {
          type: 'error',
          content: 'Please provide email and phone or use bypass options',
          dismissible: true,
          onDismiss: () => setNotifications([]),
        },
      ]);
      return;
    }
    if (selectedAttendee) {
      handleCheckin(selectedAttendee);
    }
  };

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length > 0) {
      const barcode_id = detectedCodes[0].rawValue;
      console.log('QR Code content:', barcode_id);
      setShowScanner(false);
      setIsCheckingIn(true);

      checkInAttendee({
        variables: {
          barcode_id,
          bypass_email: bypassEmail,
          bypass_phone: bypassPhone,
          email: email || undefined,
          phone: phone || undefined,
        },
      })
        .then(({ data }) => {
          const response = data.checkInAttendee as CheckInResponse;
          if (response.status === 'SUCCESS' && response.user) {
            setCheckInResult({
              name: response.user.name,
              ticket_class_id: response.user.ticket_class_id,
            });
            setNotifications([
              {
                type: 'success',
                content: `Check-in successful for ${response.user.name} (${response.user.ticket_class_id})`,
                dismissible: true,
                onDismiss: () => setNotifications([]),
              },
            ]);
          } else {
            setNotifications([
              {
                type: 'error',
                content: response.message || 'Check-in failed',
                dismissible: true,
                onDismiss: () => setNotifications([]),
              },
            ]);
          }
        })
        .catch((error) => {
          console.error('Check-in error:', error);
          setNotifications([
            {
              type: 'error',
              content: 'Error during check-in. Please try again.',
              dismissible: true,
              onDismiss: () => setNotifications([]),
            },
          ]);
        })
        .finally(() => {
          setIsCheckingIn(false);
        });
    }
  };

  const handleError = (error: unknown) => {
    console.error('QR Scanner error:', error);
  };

  const getLanyardImage = (ticketClassId: string) => {
    return `/assets/lanyards/${ticketClassId}.png`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Flashbar items={notifications} />
      {checkInResult && (
        <div style={{ width: '100%', marginTop: '24px', marginBottom: '24px' }}>
          <img
            src={getLanyardImage(checkInResult.ticket_class_id)}
            alt="Lanyard"
            style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain' }}
          />
        </div>
      )}
      <Container header={<Header variant="h1">Check-in</Header>}>
        <SpaceBetween size="l">
          <SpaceBetween size="m" direction="horizontal">
            <Input
              type="search"
              value={searchQuery}
              onChange={({ detail }) => handleSearch(detail.value)}
              placeholder="Search attendees..."
            />
            <Button onClick={() => setShowScanner(!showScanner)} disabled={isCheckingIn}>
              {showScanner ? 'Close Scanner' : 'Scan QR Code'}
            </Button>
          </SpaceBetween>

          {showScanner && (
            <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
              {isCheckingIn ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <SpaceBetween size="m" direction="vertical">
                    <Spinner size="large" />
                    <Box textAlign="center">Checking in attendee...</Box>
                  </SpaceBetween>
                </div>
              ) : (
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  constraints={{ facingMode: 'environment' }}
                  styles={{ container: { width: '100%' } }}
                />
              )}
            </div>
          )}

          {searchResults.length > 0 && (
            <SpaceBetween size="m">
              {searchResults.map((result) => (
                <div
                  key={result.objectID}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #eaeded',
                  }}
                >
                  <SpaceBetween size="m" direction="horizontal">
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{result.name}</div>
                      {(result.email || result.company) && (
                        <div style={{ color: '#666', fontSize: '0.9em' }}>
                          {result.email}
                          {result.email && result.company && ' • '}
                          {result.company}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => handleCheckin(result)}
                      loading={loadingAttendeeId === result.objectID}
                      disabled={loadingAttendeeId === result.objectID}
                    >
                      Check In
                    </Button>
                  </SpaceBetween>
                </div>
              ))}
            </SpaceBetween>
          )}
        </SpaceBetween>
      </Container>

      <Modal
        visible={showModal}
        onDismiss={() => setShowModal(false)}
        header="Perfil incompleto"
        size="medium"
      >
        <SpaceBetween size="l">
          <div>
            Faltan datos obligatorios en el perfil del asistente. Por favor, actualiza su perfil o
            utiliza las opciones de omisión.
          </div>
          <SpaceBetween size="m">
            <Input
              type="email"
              value={email}
              onChange={({ detail }) => setEmail(detail.value)}
              placeholder="Correo electrónico"
              invalid={!email && !bypassEmail}
            />
            {!email && !bypassEmail && (
              <div style={{ color: 'red', fontSize: '0.85em' }}>
                El correo electrónico es obligatorio o debe ser omitido
              </div>
            )}
            <Input
              type="text"
              value={phone}
              onChange={({ detail }) => setPhone(detail.value)}
              placeholder="Número de teléfono"
              invalid={!phone && !bypassPhone}
            />
            {!phone && !bypassPhone && (
              <div style={{ color: 'red', fontSize: '0.85em' }}>
                El número de teléfono es obligatorio o debe ser omitido
              </div>
            )}
            <Checkbox
              checked={bypassEmail}
              onChange={({ detail }) => setBypassEmail(detail.checked)}
            >
              Omitir requisito de correo electrónico
            </Checkbox>
            <Checkbox
              checked={bypassPhone}
              onChange={({ detail }) => setBypassPhone(detail.checked)}
            >
              Omitir requisito de teléfono
            </Checkbox>
          </SpaceBetween>
          <SpaceBetween size="m" direction="horizontal">
            <Button onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleRetryCheckin}
              loading={loadingAttendeeId === selectedAttendee?.objectID}
              disabled={loadingAttendeeId === selectedAttendee?.objectID || !canSubmit()}
            >
              Registrar de todas formas
            </Button>
          </SpaceBetween>
        </SpaceBetween>
      </Modal>
    </div>
  );
};

export default Checkin;
