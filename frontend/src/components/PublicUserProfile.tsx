import { useEffect, useState } from 'react';
import { UserProfile } from '../components/UserProfile';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  AppLayoutToolbar,
  Box,
  BreadcrumbGroup,
  Button,
  Input,
  Modal,
  SpaceBetween,
  Spinner,
} from '@cloudscape-design/components';

const GET_USER = gql`
  mutation viewProfile($id: String!, $pin: String!) {
    viewProfile(id: $id, pin: $pin) {
      name
      job_title
      email
      cell_phone
      company
      user_id
    }
  }
`;

export interface PublicUserProfileProps {
  id: string;
}

export function PublicUserProfile({ id }: PublicUserProfileProps) {
  const [mutateFunction, { data, loading, error }] = useMutation(GET_USER, {
    variables: { id },
  });

  const [showPinPrompt, setShowPinPrompt] = useState(true);
  const [pin, setPin] = useState('');

  const handlePinSubmit = () => {
    mutateFunction({ variables: { id, pin } });
  };

  useEffect(() => {
    if (data) {
      setShowPinPrompt(false);
    }
  }, [data]);

  const actionButton = (
    <Button variant="primary" iconName="download" ariaLabel="Descargar tarjeta de contacto">
      Descargar contacto
    </Button>
  );

  return (
    <>
      {showPinPrompt ? (
        <Modal
          onDismiss={() => {}}
          visible={showPinPrompt}
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="primary"
                  onClick={handlePinSubmit}
                  disabled={pin.length !== 4}
                  loading={loading}
                >
                  Enviar
                </Button>
              </SpaceBetween>
            </Box>
          }
          header="Introduce el PIN para ver el perfil"
        >
          <Input value={pin} onChange={(e) => setPin(e.detail.value)} placeholder="PIN" />

          {error && (
            <>
              <br />
              <Alert type="error" header="Error">
                {error.message}
              </Alert>
            </>
          )}
        </Modal>
      ) : (
        <AppLayoutToolbar
          navigationHide={true}
          toolsHide={true}
          breadcrumbs={
            <BreadcrumbGroup
              items={[
                { text: 'Inicio', href: '/' },
                { text: 'Perfil', href: '/profile' },
                { text: loading ? <Spinner /> : data?.viewProfile.name, href: `/profile/${id}` },
              ]}
            />
          }
          content={
            <UserProfile
              initialId={data?.getMyProfile?.user_id}
              loading={loading}
              error={error}
              user={data?.viewProfile}
              actionButton={actionButton}
            />
          }
        ></AppLayoutToolbar>
      )}
    </>
  );
}
