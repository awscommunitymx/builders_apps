import { useParams } from 'react-router';
import { useState } from 'react';
import { UserProfile } from '../components/UserProfile';
import { useUserProfile } from '../hooks/useUserProfile';

export function UserProfileRoute() {
  const { id } = useParams<{ id: string }>();
  const [currentId, setCurrentId] = useState<string>(id || '');

  // Load data using the hook in the route component
  const { loading, error, user } = useUserProfile(currentId);

  // Handler for when the user changes the ID in the input field
  const handleIdChange = (newId: string) => {
    setCurrentId(newId);
  };

  return (
    <UserProfile
      initialId={id || ''}
      loading={loading}
      error={error}
      user={user}
      onIdChange={handleIdChange}
    />
  );
}

export default UserProfileRoute;
