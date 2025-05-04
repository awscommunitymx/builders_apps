import { useState, useEffect } from 'react';
import { User } from '@awscommunity/generated-react/hooks';
import '@cloudscape-design/global-styles/index.css';
import {
  Header,
  ContentLayout,
  SpaceBetween,
  Container,
  KeyValuePairs,
  CopyToClipboard,
  Button,
} from '@cloudscape-design/components';

export interface UserProfileProps {
  initialId?: string;
  loading?: boolean;
  error?: Error | null;
  user?: User | null;
}

export function UserProfile({ loading = false, error = null, user = null }: UserProfileProps) {
  return (
    <ContentLayout
      defaultPadding
      header={
        <SpaceBetween size="m">
          <Header
            variant="h1"
            actions={
              // Descargar tarjeta de contacto
              <Button
                variant="primary"
                iconName="download"
                ariaLabel="Descargar tarjeta de contacto"
              >
                Descargar contacto
              </Button>
            }
          >
            {user?.name || 'User Profile'}
          </Header>
        </SpaceBetween>
      }
    >
      <Container header={<Header variant="h2">Resumen</Header>}>
        <KeyValuePairs
          columns={1}
          items={[
            {
              label: 'ARN',
              value: (
                <CopyToClipboard
                  copyButtonAriaLabel="Copy ARN"
                  copyErrorText="ARN failed to copy"
                  copySuccessText="ARN copied"
                  textToCopy={`arn:aws:iam::${user?.user_id}:user/${user?.name.toLowerCase().replace(/\s/g, '')}`}
                  variant="inline"
                />
              ),
            },
            {
              label: 'Nombre',
              value: user?.name,
            },
            {
              label: 'Email',
              value: user?.email,
            },
            {
              label: 'Teléfono',
              value: user?.cell_phone,
            },
            {
              label: 'Compañía',
              value: user?.company,
            },
          ]}
        />
      </Container>
    </ContentLayout>
  );
}
