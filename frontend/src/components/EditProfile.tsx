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
  Checkbox,
  Box,
  Link,
  Popover,
} from '@cloudscape-design/components';
import { gql, useMutation } from '@apollo/client';

// Mutación basada en el esquema GraphQL existente
const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      user_id
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

  const [shareEmail, setShareEmail] = useState<boolean>(user?.share_email ?? true);
  const [sharePhone, setSharePhone] = useState<boolean>(user?.share_phone ?? true);
  const [consentDataSharing, setConsentDataSharing] = useState<boolean>(user?.consent_data_sharing ?? true);
  const [pin, setPin] = useState(user?.pin?.toString() || '');
  const [pinError, setPinError] = useState<string | null>(null);
  const [twitterUrl, setTwitterUrl] = useState(user?.twitter_url || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedin_url || '');
  const [blogUrl, setBlogUrl] = useState(user?.blog_url || '');

  const [updateProfile, { loading: updateLoading, error: updateError }] = useMutation(UPDATE_USER);

  // Actualizar estados cuando cambia el usuario
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setJobTitle(user.job_title || '');
      setEmail(user.email || '');
      setCellPhone(user.cell_phone || '');
      setCompany(user.company || '');
      setShareEmail(user.share_email ?? true);
      setSharePhone(user.share_phone ?? true);
      setConsentDataSharing(user.consent_data_sharing ?? true);
      setTwitterUrl(user.twitter_url || '');
      setLinkedinUrl(user.linkedin_url || '');
      setBlogUrl(user.blog_url || '');
    }
  }, [user]);

  // Validar el PIN: solo 4 dígitos numéricos
  const validatePin = (pinValue: string) => {
    const pinError = 'El PIN debe contener exactamente 4 dígitos numéricos';
    if (pinValue === '') {
      setPinError(pinError);
      return false;
    }

    // If PIN is provided, it must be exactly 4 digits
    if (!/^\d{4}$/.test(pinValue)) {
      setPinError(pinError);
      return false;
    }

    setPinError(null);
    return true;
  };

  // Manejar cambios en el PIN con validación
  const handlePinChange = (e: { detail: { value: string } }) => {
    const value = e.detail.value;

    // Solo permitir números y limitar a 4 caracteres
    const numericValue = value.replace(/\D/g, '').substring(0, 4);

    setPin(numericValue);
    validatePin(numericValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.user_id) {
      setFormError('No se puede actualizar el perfil: ID de usuario no disponible.');
      console.error('User ID not available');
      return;
    }

    // Validar el PIN antes de enviar
    const isPinValid = validatePin(pin);
    if (pin && !isPinValid) {
      console.error('Invalid PIN');
      return;
    }

    try {
      await updateProfile({
        variables: {
          input: {
            company,
            role: jobTitle, // Mapear job_title a role según esquema
            pin: pin ? parseInt(pin, 10) : undefined, // Convertir a número si existe
            share_email: shareEmail,
            share_phone: sharePhone,
            consent_data_sharing: consentDataSharing,
            twitter_url: twitterUrl || undefined,
            linkedin_url: linkedinUrl || undefined,
            blog_url: blogUrl || undefined,
          },
        },
      });

      // Navegar de vuelta al perfil o mostrar mensaje de éxito
      window.location.href = '/profile';
    } catch (error) {
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
      {(error || updateError || formError) && (
        <>
          <Flashbar
            items={[
              {
                type: 'error',
                content: error?.message || updateError?.message || formError,
                dismissible: true,
                onDismiss: () => setFormError(null),
              },
            ]}
          />
          <br />
        </>
      )}
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
                label={
                  <SpaceBetween direction="horizontal" size="xs">
                    Correo electrónico
                    <Box color="text-status-info" display="inline">
                      <Popover
                        header="Cambiar correo electrónico"
                        size="medium"
                        triggerType="text"
                        content="Si quieres cambiar tu correo electrónico, asiste después de las 12:00 PM a soporte."
                        renderWithPortal={true}
                      >
                        <Box color="text-status-info" fontSize="body-s" fontWeight="bold">
                          Info
                        </Box>
                      </Popover>
                    </Box>
                  </SpaceBetween>
                }
              >
                <Input
                  value={email}
                  disabled={true}
                  type="email"
                  placeholder="Correo electrónico"
                />
                <Checkbox
                  checked={shareEmail}
                  onChange={({ detail }) => setShareEmail(detail.checked)}
                >
                  Compartir mi correo electrónico
                </Checkbox>
              </FormField>
              <FormField
                label={
                  <SpaceBetween direction="horizontal" size="xs">
                    Teléfono
                    <Box color="text-status-info" display="inline">
                      <Popover
                        header="Cambiar teléfono"
                        size="medium"
                        triggerType="text"
                        content="Si quieres cambiar tu número de teléfono, asiste después de las 12:00 PM a soporte."
                        renderWithPortal={true}
                      >
                        <Box color="text-status-info" fontSize="body-s" fontWeight="bold">
                          Info
                        </Box>
                      </Popover>
                    </Box>
                  </SpaceBetween>
                }
              >
                <Input value={cellPhone} disabled={true} placeholder="Número de teléfono" />
                <Checkbox
                  checked={sharePhone}
                  onChange={({ detail }) => setSharePhone(detail.checked)}
                >
                  Compartir mi número de teléfono
                </Checkbox>
              </FormField>
              <FormField label="Compañía">
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.detail.value)}
                  disabled={loading}
                  placeholder="Ingresa el nombre de tu empresa"
                />
              </FormField>
              <FormField label="Puesto">
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.detail.value)}
                  disabled={loading}
                  placeholder="Ingresa tu puesto de trabajo"
                />
              </FormField>
              <FormField
                label={
                  <SpaceBetween direction="horizontal" size="xs">
                    PIN
                    <Box color="text-status-info" display="inline">
                      <Popover
                        header="Tu PIN"
                        size="medium"
                        triggerType="text"
                        content="El PIN es un código de 4 dígitos que permitirá a otros builders acceder a tu perfil y contactarte. Puedes cambiarlo en cualquier momento. No uses tu PIN bancario"
                        renderWithPortal={true}
                      >
                        <Box color="text-status-info" fontSize="body-s" fontWeight="bold">
                          Info
                        </Box>
                      </Popover>
                    </Box>
                  </SpaceBetween>
                }
                description="Ingresa exactamente 4 dígitos."
                errorText={pinError}
              >
                <Input
                  value={pin}
                  placeholder="PIN de acceso (4 dígitos)"
                  onChange={handlePinChange}
                  type="text"
                  inputMode="numeric"
                />
              </FormField>
              <FormField
                label={
                  <SpaceBetween direction="horizontal" size="xs">
                    Consentimiento de compartir datos
                    <Box color="text-status-info" display="inline">
                      <Popover
                        header="Consentimiento de datos"
                        size="medium"
                        triggerType="text"
                        content="Al marcar esta opción, consientes que tus datos de perfil puedan ser compartidos con otros participantes del evento y con los patrocinadores para fines de networking y seguimiento del evento."
                        renderWithPortal={true}
                      >
                        <Box color="text-status-info" fontSize="body-s" fontWeight="bold">
                          Info
                        </Box>
                      </Popover>
                    </Box>
                  </SpaceBetween>
                }
                description="Acepta compartir tus datos de perfil para networking y seguimiento del evento."
              >
                <Checkbox
                  checked={consentDataSharing}
                  onChange={({ detail }) => setConsentDataSharing(detail.checked)}
                >
                  Consiento compartir mis datos de perfil con otros participantes y patrocinadores del evento
                </Checkbox>
              </FormField>
            </SpaceBetween>
          </Container>
          <Container header={<Header variant="h2">Redes sociales y blog</Header>}>
            <SpaceBetween direction="vertical" size="l">
              <FormField 
                label="X (Twitter)"
                description="Comparte tu perfil de X para que otros builders puedan conectar contigo."
              >
                <Input
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.detail.value)}
                  disabled={loading}
                  placeholder="https://x.com/tu_usuario"
                  type="url"
                />
              </FormField>
              <FormField 
                label="LinkedIn"
                description="Comparte tu perfil profesional de LinkedIn."
              >
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.detail.value)}
                  disabled={loading}
                  placeholder="https://linkedin.com/in/tu-perfil"
                  type="url"
                />
              </FormField>
              <FormField 
                label="Blog personal"
                description="Comparte la URL de tu blog o sitio web personal."
              >
                <Input
                  value={blogUrl}
                  onChange={(e) => setBlogUrl(e.detail.value)}
                  disabled={loading}
                  placeholder="https://tu-blog.com"
                  type="url"
                />
              </FormField>
            </SpaceBetween>
          </Container>
        </Form>
      </form>
    </ContentLayout>
  );
}
