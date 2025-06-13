import { AppLayoutToolbar, BreadcrumbGroup } from '@cloudscape-design/components';
import SessionDetail from '../components/SessionDetails';
import { useParams } from 'react-router';

export function AgendaDetailsRoute() {
  const { id } = useParams<{ id: string }>() as { id: string };
  return (
    <AppLayoutToolbar
      navigationHide={true}
      toolsHide={true}
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: 'Inicio', href: '/' },
            { text: 'Agenda', href: '/agenda' },
            { text: id, href: `/agenda/${id}` },
          ]}
        />
      }
      content={<SessionDetail sessionId={id} />}
    ></AppLayoutToolbar>
  );
}
