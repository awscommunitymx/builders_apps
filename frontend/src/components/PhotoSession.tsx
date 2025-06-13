import { useState, useEffect } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import {
  Container,
  Header,
  ContentLayout,
  SpaceBetween,
  Grid,
  Button,
  Cards,
  Box,
  StatusIndicator,
  Alert,
  Modal,
  Flashbar,
  Spinner,
  ColumnLayout,
} from '@cloudscape-design/components';
import { PhotoSession as PhotoSessionType, PhotoReservation } from '@awscommunity/generated-react/hooks';

const GET_AVAILABLE_PHOTO_SESSIONS = gql`
  query GetAvailablePhotoSessions($date: String!) {
    getAvailablePhotoSessions(date: $date) {
      timeSlot
      date
      availableSpots
      totalSpots
      reservations {
        user_id
        name
        timeSlot
        date
        reservedAt
      }
    }
  }
`;

const GET_MY_PHOTO_RESERVATION = gql`
  query GetMyPhotoReservation {
    getMyPhotoReservation {
      user_id
      name
      email
      cell_phone
      timeSlot
      date
      reservedAt
    }
  }
`;

const RESERVE_PHOTO_SESSION = gql`
  mutation ReservePhotoSession($input: ReservePhotoSessionInput!) {
    reservePhotoSession(input: $input) {
      success
      message
      reservation {
        user_id
        name
        timeSlot
        date
        reservedAt
      }
    }
  }
`;

const CANCEL_PHOTO_RESERVATION = gql`
  mutation CancelPhotoReservation {
    cancelPhotoReservation {
      success
      message
    }
  }
`;

function formatTimeSlot(timeSlot: string): string {
  const [hour, minute] = timeSlot.split(':');
  const hourNum = parseInt(hour);
  const isPM = hourNum >= 12;
  const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
  return `${displayHour}:${minute} ${isPM ? 'PM' : 'AM'}`;
}

function getAvailabilityStatus(availableSpots: number, totalSpots: number) {
  const percentage = (availableSpots / totalSpots) * 100;
  if (percentage === 0) return { type: 'error' as const, text: 'Completo' };
  if (percentage <= 20) return { type: 'warning' as const, text: 'Pocos espacios' };
  return { type: 'success' as const, text: 'Disponible' };
}

export function PhotoSessionBooking() {
  const [selectedDate] = useState('2025-06-14');
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [flashMessages, setFlashMessages] = useState<any[]>([]);

  const { data: sessionsData, loading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useQuery(
    GET_AVAILABLE_PHOTO_SESSIONS,
    { 
      variables: { date: selectedDate },
      fetchPolicy: 'cache-and-network'
    }
  );

  const { data: reservationData, loading: reservationLoading, refetch: refetchReservation } = useQuery(
    GET_MY_PHOTO_RESERVATION,
    { fetchPolicy: 'cache-and-network' }
  );

  const [reserveSession, { loading: reserveLoading }] = useMutation(RESERVE_PHOTO_SESSION, {
    onCompleted: (data) => {
      if (data.reservePhotoSession.success) {
        setFlashMessages([{
          type: 'success',
          content: data.reservePhotoSession.message,
          dismissible: true,
          id: Date.now().toString(),
        }]);
        refetchReservation();
        refetchSessions();
      } else {
        setFlashMessages([{
          type: 'error',
          content: data.reservePhotoSession.message,
          dismissible: true,
          id: Date.now().toString(),
        }]);
      }
      setShowConfirmModal(false);
      setSelectedTimeSlot(null);
    },
    onError: () => {
      setFlashMessages([{
        type: 'error',
        content: 'Error al reservar sesión de fotos. Por favor intenta de nuevo.',
        dismissible: true,
        id: Date.now().toString(),
      }]);
      setShowConfirmModal(false);
      setSelectedTimeSlot(null);
    }
  });

  const [cancelReservation, { loading: cancelLoading }] = useMutation(CANCEL_PHOTO_RESERVATION, {
    onCompleted: (data) => {
      if (data.cancelPhotoReservation.success) {
        setFlashMessages([{
          type: 'success',
          content: data.cancelPhotoReservation.message,
          dismissible: true,
          id: Date.now().toString(),
        }]);
        refetchReservation();
        refetchSessions();
      } else {
        setFlashMessages([{
          type: 'error',
          content: data.cancelPhotoReservation.message,
          dismissible: true,
          id: Date.now().toString(),
        }]);
      }
    },
    onError: () => {
      setFlashMessages([{
        type: 'error',
        content: 'Error al cancelar la reserva. Por favor intenta de nuevo.',
        dismissible: true,
        id: Date.now().toString(),
      }]);
    }
  });

  const handleReserveClick = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setShowConfirmModal(true);
  };

  const handleConfirmReservation = () => {
    if (selectedTimeSlot) {
      reserveSession({
        variables: {
          input: {
            date: selectedDate,
            timeSlot: selectedTimeSlot
          }
        }
      });
    }
  };

  const handleCancelReservation = () => {
    cancelReservation();
  };

  const existingReservation = reservationData?.getMyPhotoReservation;
  const sessions: PhotoSessionType[] = sessionsData?.getAvailablePhotoSessions || [];

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Reserva tu sesión de fotos profesional para el evento. Las sesiones tienen una duración de 15 minutos y están disponibles desde las 11:30 AM hasta las 4:45 PM."
        >
          Sesiones de Fotos
        </Header>
      }
    >
      <SpaceBetween size="l">
        {flashMessages.length > 0 && (
          <Flashbar
            items={flashMessages.map(item => ({
              ...item,
              onDismiss: () => {
                setFlashMessages(flashMessages.filter(msg => msg.id !== item.id));
              }
            }))}
          />
        )}

        {existingReservation && (
          <Alert
            statusIconAriaLabel="Info"
            header="Reserva Existente"
            action={
              <Button
                variant="normal"
                loading={cancelLoading}
                onClick={handleCancelReservation}
              >
                Cancelar Reserva
              </Button>
            }
          >
            Ya tienes una reserva para el {formatTimeSlot(existingReservation.timeSlot)} el día {existingReservation.date}.
            Reservado el {new Date(existingReservation.reservedAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}.
          </Alert>
        )}

        <Container
          header={
            <Header variant="h2">
              Horarios Disponibles - {new Date(selectedDate).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Header>
          }
        >
          {sessionsLoading && <Spinner size="large" />}
          {sessionsError && (
            <Alert statusIconAriaLabel="Error" type="error">
              Error al cargar las sesiones disponibles: {sessionsError.message}
            </Alert>
          )}
          
          {sessions.length > 0 && (
            <Cards
              cardDefinition={{
                header: (session) => formatTimeSlot(session.timeSlot),
                sections: [
                  {
                    id: 'availability',
                    content: (session) => {
                      const status = getAvailabilityStatus(session.availableSpots, session.totalSpots);
                      return (
                        <ColumnLayout columns={2} borders="vertical">
                          <div>
                            <Box variant="awsui-key-label">Disponibilidad</Box>
                            <StatusIndicator type={status.type}>
                              {status.text}
                            </StatusIndicator>
                          </div>
                          <div>
                            <Box variant="awsui-key-label">Espacios</Box>
                            <Box>{session.availableSpots}/{session.totalSpots}</Box>
                          </div>
                        </ColumnLayout>
                      );
                    }
                  },
                  {
                    id: 'actions',
                    content: (session) => (
                      <Button
                        variant="primary"
                        disabled={
                          session.availableSpots === 0 || 
                          !!existingReservation ||
                          reserveLoading
                        }
                        onClick={() => handleReserveClick(session.timeSlot)}
                      >
                        {existingReservation ? 'Ya tienes una reserva' : 
                         session.availableSpots === 0 ? 'Completo' : 'Reservar'}
                      </Button>
                    )
                  }
                ]
              }}
              items={sessions}
              loading={sessionsLoading}
              empty={
                <Box textAlign="center" color="inherit">
                  <b>No hay sesiones disponibles</b>
                  <Box variant="p" color="inherit">
                    No se encontraron sesiones para la fecha seleccionada.
                  </Box>
                </Box>
              }
            />
          )}
        </Container>

        <Modal
          onDismiss={() => setShowConfirmModal(false)}
          visible={showConfirmModal}
          closeAriaLabel="Cerrar modal"
          size="medium"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="link"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  loading={reserveLoading}
                  onClick={handleConfirmReservation}
                >
                  Confirmar Reserva
                </Button>
              </SpaceBetween>
            </Box>
          }
          header="Confirmar Reserva de Sesión de Fotos"
        >
          {selectedTimeSlot && (
            <SpaceBetween size="m">
              <Box>
                ¿Estás seguro que deseas reservar la sesión de fotos para las{' '}
                <strong>{formatTimeSlot(selectedTimeSlot)}</strong> el día{' '}
                <strong>
                  {new Date(selectedDate).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </strong>?
              </Box>
              <Alert statusIconAriaLabel="Info">
                Las sesiones tienen una duración de 15 minutos. Solo puedes tener una reserva activa a la vez.
              </Alert>
            </SpaceBetween>
          )}
        </Modal>
      </SpaceBetween>
    </ContentLayout>
  );
}