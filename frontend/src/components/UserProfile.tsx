import { User } from '@awscommunity/generated-react/hooks';
import '@cloudscape-design/global-styles/index.css';
import {
  Header,
  ContentLayout,
  SpaceBetween,
  Container,
  KeyValuePairs,
  CopyToClipboard,
  Spinner,
  Flashbar,
  StatusIndicator,
} from '@cloudscape-design/components';
import { PropsWithChildren } from 'react';

export interface UserProfileProps {
  initialId?: string;
  loading?: boolean;
  error?: Error | null;
  user?: User | null;
  actionButton?: React.ReactNode;
  isMyProfile?: boolean;
}

export function UserProfile({
  loading = false,
  error = null,
  user = null,
  actionButton = null,
  isMyProfile = false,
  children = null,
}: PropsWithChildren<UserProfileProps>) {
  return (
    <ContentLayout
      header={
        !error && (
          <SpaceBetween size="m">
            <Header
              variant="h1"
              actions={
                // Descargar tarjeta de contacto
                actionButton
              }
            >
              {user?.name || <Spinner />}
            </Header>
          </SpaceBetween>
        )
      }
    >
      {!user?.initialized && !loading && isMyProfile && (
        <div>
          <Flashbar
            items={[
              {
                type: 'error',
                content:
                  'Tu perfil no está configurado. Para acceder a todas las funciones de Builders App, debes completar tu perfil haciendo clic en "Editar perfil".',
                dismissible: false,
              },
            ]}
          />
          <br />
        </div>
      )}
      {error ? (
        <Flashbar
          items={[
            {
              type: 'error',
              content: error.message || 'Ocurrió un error al cargar los datos del usuario',
              dismissible: true,
            },
          ]}
        />
      ) : (
        <SpaceBetween size="l">
          <Container header={<Header variant="h2">Resumen</Header>}>
            <KeyValuePairs
              columns={1}
              items={[
                ...[
                  {
                    label: 'ARN',
                    value: loading ? (
                      <Spinner />
                    ) : (
                      <CopyToClipboard
                        copyButtonAriaLabel="Copy ARN"
                        copyErrorText="ARN failed to copy"
                        copySuccessText="ARN copied"
                        textToCopy={`arn:aws:iam::140625:builder/${user?.name.toLowerCase().replace(/\s/g, '')}`}
                        variant="inline"
                      />
                    ),
                  },
                  {
                    label: 'Nombre',
                    value: loading ? <Spinner /> : user?.name,
                  },
                  {
                    label: 'Compañía',
                    value: loading ? <Spinner /> : user?.company,
                  },
                ],
                ...(user?.job_title
                  ? [
                      {
                        label: 'Puesto',
                        value: loading ? <Spinner /> : user?.job_title,
                      },
                    ]
                  : []),
                ...(user?.email
                  ? [
                      {
                        label: 'Email',
                        value: loading ? (
                          <Spinner />
                        ) : (
                          <SpaceBetween direction="vertical" size="xs">
                            {user?.email}
                            {isMyProfile && (
                              <StatusIndicator type={user?.share_email ? 'success' : 'error'}>
                                {user?.share_email ? 'Compartiendo' : 'No se comparte'}
                              </StatusIndicator>
                            )}
                          </SpaceBetween>
                        ),
                      },
                    ]
                  : []),
                ...(user?.cell_phone
                  ? [
                      {
                        label: 'Teléfono',
                        value: loading ? (
                          <Spinner />
                        ) : (
                          <SpaceBetween direction="vertical" size="xs">
                            {user?.cell_phone}
                            {isMyProfile && (
                              <StatusIndicator type={user?.share_phone ? 'success' : 'error'}>
                                {user?.share_phone ? 'Compartiendo' : 'No se comparte'}
                              </StatusIndicator>
                            )}
                          </SpaceBetween>
                        ),
                      },
                    ]
                  : []),
                ...(user?.pin
                  ? [
                      {
                        label: 'PIN',
                        value: loading ? (
                          <Spinner />
                        ) : (
                          <SpaceBetween direction="vertical" size="xs">
                            {user?.pin}
                            <StatusIndicator type={user?.pin ? 'success' : 'error'}>
                              {user?.pin ? 'Configurado' : 'No configurado'}
                            </StatusIndicator>
                          </SpaceBetween>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Container>
          {children}
        </SpaceBetween>
      )}
    </ContentLayout>
  );
}
