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

export type Category = {
  __typename?: 'Category';
  categoryItems: Array<CategoryItem>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  sort: Scalars['Int']['output'];
};

export type CategoryItem = {
  __typename?: 'CategoryItem';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  updateUser?: Maybe<User>;
  viewProfile?: Maybe<User>;
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
};

export type Room = {
  __typename?: 'Room';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
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
  user_id: Scalars['ID']['output'];
};
