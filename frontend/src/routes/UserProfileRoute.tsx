import { useParams } from 'react-router';
import { useState } from 'react';
import { UserProfile } from '../components/UserProfile';
import { gql, useMutation } from '@apollo/client';
import { AppLayoutToolbar, BreadcrumbGroup, Button, Spinner } from '@cloudscape-design/components';

const GET_USER = gql`
  mutation viewProfile($id: String!) {
    viewProfile(id: $id) {
      name
      job_title
      email
      cell_phone
      company
    }
  }
`;

export function UserProfileRoute() {
  const { id } = useParams<{ id: string }>() as { id: string };

  const [mutateFunction, { data, loading, error }] = useMutation(GET_USER, {
    variables: { id },
  });

  useState(() => {
    mutateFunction();
  });

  const actionButton = (
    <Button variant="primary" iconName="download" ariaLabel="Descargar tarjeta de contacto">
      Descargar contacto
    </Button>
  );

  // return <UserProfile initialId={id} loading={loading} error={error} user={data?.viewProfile} />;
  return (
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
  );
}

export default UserProfileRoute;
