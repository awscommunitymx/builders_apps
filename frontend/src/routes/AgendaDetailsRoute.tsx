import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { UserProfile } from '../components/UserProfile';
import { AppLayoutToolbar, BreadcrumbGroup, Button } from '@cloudscape-design/components';
import { EditUserProfile } from '../components/EditProfile';
import SessionLists from '../components/SessionsLists';
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
            { text: id , href: `/agenda/${id}` },
          ]}
        />
      }
      content={<SessionDetail sessionId={id.toString()} />}
    ></AppLayoutToolbar>
  );
}
