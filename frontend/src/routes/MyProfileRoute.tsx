import { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { UserProfile } from '../components/UserProfile';
import { AppLayoutToolbar, BreadcrumbGroup, SideNavigation } from '@cloudscape-design/components';

const GET_USER = gql`
  query getMyProfile {
    getMyProfile {
      name
      user_id
      job_title
      email
      company
      cell_phone
    }
  }
`;

export function MyProfileRoute() {
  const { data, loading, error } = useQuery(GET_USER);

  return (
    <AppLayoutToolbar
      navigationHide={true}
      toolsHide={true}
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: 'Inicio', href: '/' },
            { text: 'Perfil', href: '/profile' },
          ]}
        />
      }
      content={
        <UserProfile
          initialId={data?.getMyProfile?.user_id}
          loading={loading}
          error={error}
          user={data?.getMyProfile}
        />
      }
    ></AppLayoutToolbar>
  );
}
