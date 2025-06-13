import { useState, useEffect } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  AppLayoutToolbar,
  Box,
  BreadcrumbGroup,
  Button,
  Container,
  FormField,
  Header,
  SpaceBetween,
  Spinner,
  StatusIndicator,
  Textarea,
  Alert,
  RadioGroup,
  RadioGroupProps,
} from '@cloudscape-design/components';
import { useNavigate } from 'react-router';

const GET_AGENDA = gql`
  query GetAgenda {
    getAgenda {
      sessions {
        id
        name
        description
        speakers {
          name
          company
        }
        time
        location
        category
        dateStart
        dateEnd
      }
    }
  }
`;

const SUBMIT_SESSION_CSAT = gql`
  mutation SubmitSessionCSAT($input: SessionCSATInput!) {
    submitSessionCSAT(input: $input) {
      success
      message
    }
  }
`;

export interface SessionCSATProps {
  sessionId: string;
}

interface SessionData {
  id: string;
  name: string;
  description?: string;
  speakers?: Array<{
    name: string;
    company?: string;
  }>;
  time: string;
  location?: string;
  category?: string;
  dateStart: string;
  dateEnd: string;
}

export function SessionCSAT({ sessionId }: SessionCSATProps) {
  const navigate = useNavigate();
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  const { data: agendaData, loading: isLoadingSession, error: sessionError } = useQuery(GET_AGENDA);
  
  const [submitCSAT, { loading: submittingCSAT, error: submitError }] = useMutation(
    SUBMIT_SESSION_CSAT,
    {
      onCompleted: (data) => {
        if (data.submitSessionCSAT.success) {
          // Show success and redirect after a delay
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      },
    }
  );

  const sessionData = agendaData?.getAgenda?.sessions?.find(
    (session: SessionData) => session.id === sessionId
  );

  const handleSubmit = async () => {
    if (rating === 0) {
      return;
    }

    try {
      await submitCSAT({
        variables: {
          input: {
            sessionId,
            rating,
            feedback: feedback.trim() || undefined,
          },
        },
      });
    } catch (error) {
      console.error('Error submitting CSAT:', error);
    }
  };

  const isSubmitDisabled = rating === 0 || submittingCSAT;

  return (
    <AppLayoutToolbar
      navigationHide={true}
      toolsHide={true}
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: 'Inicio', href: '/' },
            { text: 'Evaluación de Sesión', href: `/session/${sessionId}/csat` },
          ]}
        />
      }
      content={
        <Container
          header={
            <Header variant="h1">
              Evalúa la Sesión
            </Header>
          }
        >
          <SpaceBetween size="l">
            {isLoadingSession ? (
              <Box textAlign="center">
                <Spinner size="large" />
                <Box margin={{ top: "s" }}>Cargando información de la sesión...</Box>
              </Box>
            ) : sessionError ? (
              <Alert type="error" header="Error">
                Error al cargar la agenda: {sessionError.message}
              </Alert>
            ) : !sessionData ? (
              <Alert type="error" header="Error">
                Sesión no encontrada
              </Alert>
            ) : (
              <>
                <Container
                  header={<Header variant="h2">Información de la Sesión</Header>}
                >
                  <SpaceBetween size="m">
                    <Box>
                      <Box variant="strong">Título:</Box>
                      <Box>{sessionData.name}</Box>
                    </Box>
                    
                    {sessionData.description && (
                      <Box>
                        <Box variant="strong">Descripción:</Box>
                        <Box>{sessionData.description}</Box>
                      </Box>
                    )}
                    
                    {sessionData.speakers && sessionData.speakers.length > 0 && (
                      <Box>
                        <Box variant="strong">Ponentes:</Box>
                        <Box>
                          {sessionData.speakers.map((speaker: { name: string; company?: string }, index: number) => (
                            <Box key={index}>
                              {speaker.name}
                              {speaker.company && ` - ${speaker.company}`}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    <Box>
                      <Box variant="strong">Horario:</Box>
                      <Box>{sessionData.time}</Box>
                    </Box>
                    
                    {sessionData.location && (
                      <Box>
                        <Box variant="strong">Ubicación:</Box>
                        <Box>{sessionData.location}</Box>
                      </Box>
                    )}
                  </SpaceBetween>
                </Container>

                <Container
                  header={<Header variant="h2">Tu Evaluación</Header>}
                >
                  <SpaceBetween size="l">
                    <FormField
                      label="Calificación general"
                      description="¿Qué tan útil fue esta sesión? (1 = No útil, 5 = Muy útil)"
                    >
                      <RadioGroup
                        value={rating.toString()}
                        onChange={({ detail }: { detail: { value: string } }) => setRating(parseInt(detail.value))}
                        items={[
                          { value: "1", label: "1 - No útil" },
                          { value: "2", label: "2 - Poco útil" },
                          { value: "3", label: "3 - Neutral" },
                          { value: "4", label: "4 - Útil" },
                          { value: "5", label: "5 - Muy útil" },
                        ]}
                      />
                    </FormField>

                    <FormField
                      label="Comentarios adicionales (opcional)"
                      description="Comparte tus comentarios sobre la sesión"
                    >
                      <Textarea
                        value={feedback}
                        onChange={({ detail }) => setFeedback(detail.value)}
                        placeholder="¿Qué te gustó más? ¿Qué se podría mejorar?"
                        rows={4}
                      />
                    </FormField>

                    {submitError && (
                      <Alert type="error" header="Error al enviar evaluación">
                        {submitError.message}
                      </Alert>
                    )}

                    <Box>
                      <SpaceBetween direction="horizontal" size="xs">
                        <Button
                          variant="primary"
                          onClick={handleSubmit}
                          disabled={isSubmitDisabled}
                          loading={submittingCSAT}
                        >
                          {submittingCSAT ? 'Enviando...' : 'Enviar Evaluación'}
                        </Button>
                        
                        <Button
                          variant="link"
                          onClick={() => navigate('/')}
                        >
                          Cancelar
                        </Button>
                      </SpaceBetween>
                    </Box>
                  </SpaceBetween>
                </Container>
              </>
            )}
          </SpaceBetween>
        </Container>
      }
    />
  );
}