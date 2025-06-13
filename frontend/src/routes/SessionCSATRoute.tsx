import { useParams } from 'react-router';
import { SessionCSAT } from '../components/SessionCSAT';

export function SessionCSATRoute() {
  const { sessionId } = useParams<{ sessionId: string }>() as { sessionId: string };

  return <SessionCSAT sessionId={sessionId} />;
}

export default SessionCSATRoute;