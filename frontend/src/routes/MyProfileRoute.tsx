import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { UserProfile } from '../components/UserProfile';
import { AppLayoutToolbar, BreadcrumbGroup, Button } from '@cloudscape-design/components';
import { EditUserProfile } from '../components/EditProfile';

const GET_USER = gql`
  query getMyProfile {
    getMyProfile {
      name
      user_id
      job_title
      email
      company
      cell_phone
      share_email
      share_phone
      pin
      initialized
    }
  }
`;

export function MyProfileRoute() {
  const { data, loading, error } = useQuery(GET_USER);

  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState(data?.getMyProfile);
  const [errorState, setErrorState] = useState(error);
  const [loadingState, setLoadingState] = useState(loading);

  const actionButton = (
    <Button
      iconName="edit"
      ariaLabel="Editar perfil"
      onClick={() => {
        setEditing(true);
      }}
    >
      Editar perfil
    </Button>
  );

  useEffect(() => {
    if (data) {
      setUser(data.getMyProfile);
      setLoadingState(false);
      setErrorState(undefined);
    } else if (error) {
      setErrorState(error);
      setLoadingState(false);
    }
  }, [data, error]);

  return (
    <AppLayoutToolbar
      navigationHide={true}
      toolsHide={true}
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: 'Inicio', href: '/' },
            { text: 'Perfil', href: '/profile' },
            ...(editing ? [{ text: 'Editar', href: '#' }] : []),
          ]}
        />
      }
      content={
        editing ? (
          <EditUserProfile
            initialId={user?.user_id}
            loading={loadingState}
            error={errorState}
            user={user}
          />
        ) : (
          <UserProfile
            initialId={user?.user_id}
            loading={loadingState}
            error={errorState}
            user={user}
            actionButton={actionButton}
            isMyProfile={true}
          />
        )
      }
    ></AppLayoutToolbar>
  );
}
