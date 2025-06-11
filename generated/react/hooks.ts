import { gql } from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AgendaData = {
  __typename?: 'AgendaData';
  sessions: Array<Session>;
};

export type AgendaDataInput = {
  sessions: Array<SessionInput>;
};

export type Category = {
  __typename?: 'Category';
  categoryItems: Array<CategoryItem>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  sort: Scalars['Int']['output'];
};

export type CategoryInput = {
  categoryItems: Array<CategoryItemInput>;
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  sort: Scalars['Int']['input'];
};

export type CategoryItem = {
  __typename?: 'CategoryItem';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type CategoryItemInput = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type CheckInResponse = {
  __typename?: 'CheckInResponse';
  message?: Maybe<Scalars['String']['output']>;
  missingFields?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  status: CheckInStatus;
  user?: Maybe<User>;
};

export enum CheckInStatus {
  IncompleteProfile = 'INCOMPLETE_PROFILE',
  Success = 'SUCCESS'
}

export type Mutation = {
  __typename?: 'Mutation';
  checkInAttendee: CheckInResponse;
  registerSponsorVisit?: Maybe<SponsorUser>;
  updateAgenda?: Maybe<AgendaData>;
  updateRoomAgenda?: Maybe<RoomAgendaData>;
  updateUser?: Maybe<User>;
  viewProfile?: Maybe<User>;
};


export type MutationCheckInAttendeeArgs = {
  barcode_id?: InputMaybe<Scalars['ID']['input']>;
  bypass_email?: InputMaybe<Scalars['Boolean']['input']>;
  bypass_phone?: InputMaybe<Scalars['Boolean']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationRegisterSponsorVisitArgs = {
  input: RegisterSponsorVisitInput;
};


export type MutationUpdateAgendaArgs = {
  sessions: AgendaDataInput;
};


export type MutationUpdateRoomAgendaArgs = {
  location: Scalars['String']['input'];
  sessions: AgendaDataInput;
};


export type MutationUpdateUserArgs = {
  input: UpdateUserInput;
};


export type MutationViewProfileArgs = {
  id: Scalars['String']['input'];
  pin: Scalars['String']['input'];
};

export type ProfileAccess = {
  __typename?: 'ProfileAccess';
  PK: Scalars['String']['output'];
  SK: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  getMyProfile?: Maybe<User>;
  getSponsorDashboard: SponsorDashboard;
  getSponsorVisit?: Maybe<SponsorUser>;
};


export type QueryGetSponsorVisitArgs = {
  short_id: Scalars['ID']['input'];
};

export type RegisterSponsorVisitInput = {
  message?: InputMaybe<Scalars['String']['input']>;
  short_id: Scalars['ID']['input'];
};

export type Room = {
  __typename?: 'Room';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type RoomAgendaData = {
  __typename?: 'RoomAgendaData';
  location: Scalars['String']['output'];
  sessions: Array<Session>;
};

export type RoomInput = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type Session = {
  __typename?: 'Session';
  categories: Array<Category>;
  description: Scalars['String']['output'];
  endsAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isConfirmed: Scalars['Boolean']['output'];
  isInformed: Scalars['Boolean']['output'];
  isPlenumSession: Scalars['Boolean']['output'];
  isServiceSession: Scalars['Boolean']['output'];
  liveUrl?: Maybe<Scalars['String']['output']>;
  recordingUrl?: Maybe<Scalars['String']['output']>;
  room: Room;
  speakers: Array<Speaker>;
  startsAt: Scalars['String']['output'];
  status: SessionStatus;
  title: Scalars['String']['output'];
};

export type SessionInput = {
  categories: Array<CategoryInput>;
  description: Scalars['String']['input'];
  endsAt: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  isConfirmed: Scalars['Boolean']['input'];
  isInformed: Scalars['Boolean']['input'];
  isPlenumSession: Scalars['Boolean']['input'];
  isServiceSession: Scalars['Boolean']['input'];
  liveUrl?: InputMaybe<Scalars['String']['input']>;
  recordingUrl?: InputMaybe<Scalars['String']['input']>;
  room: RoomInput;
  speakers: Array<SpeakerInput>;
  startsAt: Scalars['String']['input'];
  status: SessionStatus;
  title: Scalars['String']['input'];
};

export enum SessionStatus {
  Cancelled = 'CANCELLED',
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

export type Speaker = {
  __typename?: 'Speaker';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type SpeakerInput = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type SponsorDashboard = {
  __typename?: 'SponsorDashboard';
  sponsor_name: Scalars['String']['output'];
  total_visits: Scalars['Int']['output'];
  visits: Array<SponsorUser>;
};

export type SponsorUser = {
  __typename?: 'SponsorUser';
  cell_phone?: Maybe<Scalars['String']['output']>;
  company?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  job_title?: Maybe<Scalars['String']['output']>;
  last_visit?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  short_id?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  onAgendaUpdate?: Maybe<AgendaData>;
  onRoomAgendaUpdate?: Maybe<RoomAgendaData>;
};


export type SubscriptionOnRoomAgendaUpdateArgs = {
  location: Scalars['String']['input'];
};

export type UpdateUserInput = {
  company?: InputMaybe<Scalars['String']['input']>;
  pin?: InputMaybe<Scalars['Int']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
  share_email?: InputMaybe<Scalars['Boolean']['input']>;
  share_phone?: InputMaybe<Scalars['Boolean']['input']>;
};

export type User = {
  __typename?: 'User';
  cell_phone?: Maybe<Scalars['String']['output']>;
  company?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  initialized?: Maybe<Scalars['Boolean']['output']>;
  job_title?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  pin?: Maybe<Scalars['Int']['output']>;
  share_email?: Maybe<Scalars['Boolean']['output']>;
  share_phone?: Maybe<Scalars['Boolean']['output']>;
  short_id?: Maybe<Scalars['String']['output']>;
  sponsor_visits?: Maybe<Array<Scalars['String']['output']>>;
  ticket_class_id?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
};
