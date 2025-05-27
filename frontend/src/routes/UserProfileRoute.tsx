import { useParams } from 'react-router';
import { PublicUserProfile } from '../components/PublicUserProfile';

export function UserProfileRoute() {
  const { id } = useParams<{ id: string }>() as { id: string };

  return <PublicUserProfile id={id} />;
}

export default UserProfileRoute;
