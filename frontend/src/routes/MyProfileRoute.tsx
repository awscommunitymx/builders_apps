import { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { UserProfile } from '../components/UserProfile';

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
    <UserProfile
      initialId={data?.getMyProfile?.user_id}
      loading={loading}
      error={error}
      user={data?.getMyProfile}
    />
  );
}
