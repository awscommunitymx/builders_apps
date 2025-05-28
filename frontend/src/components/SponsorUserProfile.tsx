import { UserProfile } from '../components/UserProfile';
import { gql, useQuery } from '@apollo/client';
import {
  AppLayoutToolbar,
  Box,
  BreadcrumbGroup,
  Container,
  Header,
  Popover,
  Spinner,
} from '@cloudscape-design/components';
import Textarea from '@cloudscape-design/components/textarea';

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

export interface PublicUserProfileProps {
  id: string;
}

export function SponsorUserProfile({ id }: PublicUserProfileProps) {
  const { data, loading, error } = useQuery(GET_USER_VISIT_DATA, {
    variables: { shortId: id },
    fetchPolicy: 'network-only',
  });

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
                value={data?.getSponsorVisit?.message || ''}
                readOnly
                rows={5}
                placeholder="No hay mensaje disponible"
              />
              {data?.getSponsorVisit?.last_visit && (
                <Box margin={{ top: 's' }}>
                  Última visita: {new Date(data.getSponsorVisit.last_visit).toLocaleString()}
                </Box>
              )}
            </Container>
          </UserProfile>
        }
      ></AppLayoutToolbar>
    </>
  );
}
