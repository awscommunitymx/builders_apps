import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { UserProfile } from '../components/UserProfile';
import { AppLayoutToolbar, BreadcrumbGroup, Button } from '@cloudscape-design/components';
import { EditUserProfile } from '../components/EditProfile';
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
