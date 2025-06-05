import { AppLayoutToolbar, BreadcrumbGroup } from '@cloudscape-design/components';
import SessionLists from '../components/SessionsLists';

export function AgendaRoute() {
  return (
    <AppLayoutToolbar
      navigationHide={true}
      toolsHide={true}
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: 'Inicio', href: '/' },
            { text: 'Agenda', href: '/agenda' },
          ]}
        />
      }
      content={<SessionLists />}
    ></AppLayoutToolbar>
  );
}
