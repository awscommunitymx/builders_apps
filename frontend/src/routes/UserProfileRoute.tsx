import { useParams } from 'react-router';
import { PublicUserProfile } from '../components/PublicUserProfile';
import { getLoggedInUser } from '../utils/getAuthenticatedUser';
import { SponsorUserProfile } from '../components/SponsorUserProfile';

export function UserProfileRoute() {
  const { id } = useParams<{ id: string }>() as { id: string };

  const loggedInUser = getLoggedInUser();

  return (
    <>
      {loggedInUser?.groups.includes('Sponsors') ? (
        <SponsorUserProfile id={id} />
      ) : (
        <PublicUserProfile id={id} />
      )}
    </>
  );
}

export default UserProfileRoute;
