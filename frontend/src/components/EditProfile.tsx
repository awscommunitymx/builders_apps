import { useState, useEffect } from 'react';
import { User } from '@awscommunity/generated-react/hooks';
import '@cloudscape-design/global-styles/index.css';
import {
  Header,
  ContentLayout,
  SpaceBetween,
  Container,
  Flashbar,
  Form,
  FormField,
  Input,
  Button,
  Select,
  Checkbox,
} from '@cloudscape-design/components';
import { gql, useMutation } from '@apollo/client';

// Mutación basada en el esquema GraphQL existente
const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      user_id
      name
      company
      job_title
      email
      cell_phone
    }
  }
`;

export interface UserProfileProps {
  initialId?: string;
  loading?: boolean;
  error?: Error | null;
  user?: User | null;
  actionButton?: React.ReactNode;
}

export function EditUserProfile({ loading = false, error = null, user = null }: UserProfileProps) {
  const [name, setName] = useState(user?.name || '');
  const [jobTitle, setJobTitle] = useState(user?.job_title || '');
  const [email, setEmail] = useState(user?.email || '');
  const [cellPhone, setCellPhone] = useState(user?.cell_phone || '');
  const [company, setCompany] = useState(user?.company || '');
  const [formError, setFormError] = useState<string | null>(null);

  const [shareEmail, setShareEmail] = useState(false);
  const [sharePhone, setSharePhone] = useState(false);

  const [updateProfile, { loading: updateLoading, error: updateError }] = useMutation(UPDATE_USER);

  // Actualizar estados cuando cambia el usuario
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setJobTitle(user.job_title || '');
      setEmail(user.email || '');
      setCellPhone(user.cell_phone || '');
      setCompany(user.company || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.user_id) {
      setFormError('No se puede actualizar el perfil: ID de usuario no disponible.');
      return;
    }

    try {
      // Extraer el nombre y apellido del nombre completo
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      await updateProfile({
        variables: {
          input: {
            userId: user.user_id,
            firstName,
            lastName,
            company,
            role: jobTitle, // Mapear job_title a role según esquema
            // Nota: No podemos enviar email ni cell_phone según el esquema existente
          },
        },
      });

      // Navegar de vuelta al perfil o mostrar mensaje de éxito
      window.location.href = '/profile';
    } catch (error) {
      setFormError('Error al actualizar el perfil. Por favor, inténtalo de nuevo.');
      console.error('Error updating profile:', error);
    }
  };

  const handleCancel = () => {
    // Volver a la página de perfil
    window.location.href = '/profile';
  };

  return (
    <ContentLayout
      header={
        !error && (
          <SpaceBetween size="m">
            <Header variant="h1">Editar mi perfil</Header>
          </SpaceBetween>
        )
      }
    >
      {error || updateError || formError ? (
        <Flashbar
          items={[
            {
              type: 'error',
              content:
                error?.message ||
                updateError?.message ||
                formError ||
                'Ocurrió un error al cargar los datos del usuario',
              dismissible: true,
              onDismiss: () => setFormError(null),
            },
          ]}
        />
      ) : (
        <form onSubmit={handleSubmit}>
          <Form
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button formAction="none" variant="link" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button variant="primary" loading={updateLoading} disabled={loading}>
                  Guardar cambios
                </Button>
              </SpaceBetween>
            }
          >
            <Container header={<Header variant="h2">Información personal</Header>}>
              <SpaceBetween direction="vertical" size="l">
                <FormField label="Nombre completo">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.detail.value)}
                    disabled={loading}
                    placeholder="Ingresa tu nombre completo"
                  />
                </FormField>
                <FormField
                  label="Correo electrónico"
                  description="Este campo no se puede editar actualmente."
                >
                  <Input
                    value={email}
                    disabled={true}
                    type="email"
                    placeholder="Correo electrónico"
                  />
                </FormField>
                <Checkbox
                  checked={shareEmail}
                  onChange={({ detail }) => setShareEmail(detail.checked)}
                >
                  Compartir mi correo electrónico
                </Checkbox>
                <FormField
                  label="Teléfono"
                  description="Este campo no se puede editar actualmente."
                >
                  <Input value={cellPhone} disabled={true} placeholder="Número de teléfono" />
                </FormField>
                <Checkbox
                  checked={sharePhone}
                  onChange={({ detail }) => setSharePhone(detail.checked)}
                >
                  Compartir mi número de teléfono
                </Checkbox>
                <FormField label="Compañía">
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.detail.value)}
                    disabled={loading}
                    placeholder="Ingresa el nombre de tu empresa"
                  />
                </FormField>
                <FormField label="Puesto o rol">
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.detail.value)}
                    disabled={loading}
                    placeholder="Ingresa tu puesto de trabajo o rol"
                  />
                </FormField>
              </SpaceBetween>
            </Container>
          </Form>
        </form>
      )}
    </ContentLayout>
  );
}
