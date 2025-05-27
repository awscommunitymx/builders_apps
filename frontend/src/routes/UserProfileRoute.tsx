import { useParams } from 'react-router';
import { PublicUserProfile } from '../components/PublicUserProfile';
import { getLoggedInUser } from '../utils/getAuthenticatedUser';

export function UserProfileRoute() {
  const { id } = useParams<{ id: string }>() as { id: string };

  const loggedInUser = getLoggedInUser();

  return (
    <>
      {loggedInUser?.groups.includes('Sponsor') && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Admin View</h2>
          <p>Admin users can view and manage all profiles.</p>
        </div>
      )}
      <PublicUserProfile id={id} />;
    </>
  );
}

export default UserProfileRoute;
