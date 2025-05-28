import { UserProfile } from '../components/UserProfile';
import { gql, useQuery, useMutation } from '@apollo/client';
import {
  AppLayoutToolbar,
  Box,
  BreadcrumbGroup,
  Button,
  Container,
  Flashbar,
  Header,
  Popover,
  Spinner,
} from '@cloudscape-design/components';
import Textarea from '@cloudscape-design/components/textarea';
import { useEffect, useState } from 'react';

const GET_USER_VISIT_DATA = gql`
  query getSponsorVisit($shortId: ID!) {
    getSponsorVisit(short_id: $shortId) {
      name
      user_id
      job_title
      email
      cell_phone
      company
      message
      last_visit
    }
  }
`;

const REGISTER_VISIT = gql`
  mutation registerSponsorVisit($shortId: ID!, $message: String) {
    registerSponsorVisit(input: { short_id: $shortId, message: $message }) {
      name
      user_id
      job_title
      email
      cell_phone
      company
      message
      last_visit
    }
  }
`;

export interface PublicUserProfileProps {
  id: string;
}

type Item = {
  type: 'success' | 'error' | 'info' | 'warning';
  dismissible: boolean;
  dismissLabel: string;
  content: string;
  id: string;
  onDismiss?: () => void;
};

export function SponsorUserProfile({ id }: PublicUserProfileProps) {
  const { data, loading, error } = useQuery(GET_USER_VISIT_DATA, {
    variables: { shortId: id },
    fetchPolicy: 'network-only',
  });

  const [items, setItems] = useState<Array<Item>>([]);

  const [registerSponsorVisit, { loading: updateLoading, error: updateError }] =
    useMutation(REGISTER_VISIT);

  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (data?.getSponsorVisit?.message) {
      setMessage(data.getSponsorVisit.message);
    } else {
      setMessage('');
    }
  }, [data]);

  return (
    <>
      <AppLayoutToolbar
        navigationHide={true}
        toolsHide={true}
        breadcrumbs={
          <BreadcrumbGroup
            items={[
              { text: 'Inicio', href: '/' },
              { text: 'Perfil', href: '/profile' },
              { text: loading ? <Spinner /> : data?.getSponsorVisit.name, href: `/profile/${id}` },
            ]}
          />
        }
        content={
          <>
            <Flashbar stackItems items={items} />
            <UserProfile
              initialId={data?.getMyProfile?.user_id}
              loading={loading}
              error={error}
              user={data?.getSponsorVisit}
            >
              <Container
                header={
                  <>
                    <Header variant="h2">Notas internas</Header>

                    <Box color="text-status-info" display="inline">
                      <Popover
                        header="Notas internas"
                        size="medium"
                        triggerType="text"
                        content="Usa este espacio para dejar notas internas sobre el asistente. No se compartirá con el asistente."
                        renderWithPortal={true}
                      >
                        <Box color="text-status-info" fontSize="body-s" fontWeight="bold">
                          Info
                        </Box>
                      </Popover>
                    </Box>
                  </>
                }
              >
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.detail.value)}
                  rows={5}
                  placeholder={loading ? 'Cargando...' : 'No hay notas internas disponibles.'}
                />
                {data?.getSponsorVisit?.last_visit && (
                  <Box margin={{ top: 's' }}>
                    Última visita: {new Date(data.getSponsorVisit.last_visit).toLocaleString()}
                  </Box>
                )}
              </Container>
              <Button
                fullWidth
                variant="primary"
                disabled={loading || updateLoading}
                onClick={async () => {
                  if (!id) return;
                  try {
                    await registerSponsorVisit({
                      variables: { shortId: id, message },
                    });
                    const messageId = crypto.randomUUID();

                    setItems((prevItems) => [
                      ...prevItems,
                      {
                        type: 'success',
                        dismissible: true,
                        dismissLabel: 'Dismiss message',
                        content: 'Visita registrada correctamente.',
                        id: messageId,
                        onDismiss: () =>
                          setItems((items) => items.filter((item) => item.id !== messageId)),
                      },
                    ]);
                  } catch (e) {
                    console.error('Error registering visit:', e);
                    const messageId = crypto.randomUUID();
                    setItems((prevItems) => [
                      ...prevItems,
                      {
                        type: 'error',
                        dismissible: true,
                        dismissLabel: 'Dismiss message',
                        content: 'Error al registrar la visita. Inténtalo de nuevo más tarde.',
                        id: messageId,
                        onDismiss: () =>
                          setItems((items) => items.filter((item) => item.id !== messageId)),
                      },
                    ]);
                  }
                }}
              >
                {loading ? <Spinner size="normal" /> : 'Registrar visita'}
              </Button>
            </UserProfile>
          </>
        }
      ></AppLayoutToolbar>
    </>
  );
}
