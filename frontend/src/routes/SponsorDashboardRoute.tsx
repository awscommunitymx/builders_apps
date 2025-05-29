import { gql, useQuery } from '@apollo/client';

const GET_SPONSOR_DASHBOARD = gql`
  query getSponsorDashboard {
    getSponsorDashboard {
      visits {
        name
        message
        last_visit
      }
      sponsor_name
      total_visits
    }
  }
`;

export function SponsorDashboardRoute() {
  const { data, loading, error } = useQuery(GET_SPONSOR_DASHBOARD);

  return (
    <div>
      <h1>Sponsor Dashboard</h1>
      <p>This is the sponsor dashboard route.</p>
    </div>
  );
}
