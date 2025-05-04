import { useParams } from 'react-router';
import { useState } from 'react';
import { UserProfile } from '../components/UserProfile';
import { useUserProfile } from '../hooks/useUserProfile';
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

  // Load data using the hook in the route component
  const [mutateFunction, { data, loading, error }] = useMutation(GET_USER, {
    variables: { id },
  });

  useState(() => {
    mutateFunction();
  });

  // Handler for when the user changes the ID in the input field

  return <UserProfile initialId={id} loading={loading} error={error} user={data?.viewProfile} />;
}

export default UserProfileRoute;
