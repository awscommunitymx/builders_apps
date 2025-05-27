import { useEffect, useState } from 'react';
import { UserProfile } from '../components/UserProfile';
import { gql, useMutation, useQuery } from '@apollo/client';
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

const GET_USER_VISIT_DATA = gql`
  query getSponsorVisit($shortId: ID!) {
    getSponsorVisit(short_id: $shortId) {
      name
      job_title
      email
      cell_phone
      company
      message
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
          />
        }
      ></AppLayoutToolbar>
    </>
  );
}
