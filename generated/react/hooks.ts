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

export type Mutation = {
  __typename?: 'Mutation';
  viewProfile?: Maybe<User>;
};


export type MutationViewProfileArgs = {
  pin: Scalars['Int']['input'];
  shortId: Scalars['String']['input'];
  viewerId: Scalars['ID']['input'];
};

export type ProfileAccess = {
  __typename?: 'ProfileAccess';
  PK: Scalars['String']['output'];
  SK: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
  viewed_id: Scalars['String']['output'];
  viewer_id: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  getProfileAccesses?: Maybe<Array<Maybe<ProfileAccess>>>;
  getUserByShortId?: Maybe<User>;
};


export type QueryGetProfileAccessesArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryGetUserByShortIdArgs = {
  shortId: Scalars['String']['input'];
};

export type User = {
  __typename?: 'User';
  company?: Maybe<Scalars['String']['output']>;
  first_name?: Maybe<Scalars['String']['output']>;
  last_name?: Maybe<Scalars['String']['output']>;
  pin?: Maybe<Scalars['Int']['output']>;
  role?: Maybe<Scalars['String']['output']>;
  short_id: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};
