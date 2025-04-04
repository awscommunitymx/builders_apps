import { useParams } from 'react-router';
import { UserProfile } from './UserProfile';

export default function UserProfileRoute() {
  const { id } = useParams<{ id: string }>();

  return <UserProfile initialId={id || ''} />;
}
