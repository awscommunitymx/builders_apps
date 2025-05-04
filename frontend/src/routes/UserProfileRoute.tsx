import { useParams } from 'react-router';
import { useState } from 'react';
import { UserProfile } from '../components/UserProfile';
import { gql, useMutation, useQuery } from '@apollo/client';

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

  return <UserProfile initialId={id} loading={loading} error={error} user={data?.viewProfile} />;
}

export default UserProfileRoute;
