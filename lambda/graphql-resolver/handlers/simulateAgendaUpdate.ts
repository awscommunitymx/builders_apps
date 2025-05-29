import { Session } from '@awscommunity/generated-ts';

export async function simulateAgendaUpdate(session: Session): Promise<Session> {
  // You could log or track here
  return session;
}

export async function simulateRoomAgendaUpdate(roomId: string, session: Session): Promise<Session> {
  // You could log or track here
  return session;
}
