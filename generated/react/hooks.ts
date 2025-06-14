import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
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
  cancelPhotoReservation: PhotoReservationResponse;
  addFavoriteSession: Scalars['Boolean']['output'];
  checkInAttendee: CheckInResponse;
  registerSponsorVisit?: Maybe<SponsorUser>;
  reservePhotoSession: PhotoReservationResponse;
  submitSessionCSAT: SessionCsatResponse;
  removeFavoriteSession: Scalars['Boolean']['output'];
  updateAgenda?: Maybe<AgendaData>;
  updateRoomAgenda?: Maybe<RoomAgendaData>;
  updateUser?: Maybe<User>;
  viewProfile?: Maybe<User>;
};


export type MutationAddFavoriteSessionArgs = {
  sessionId: Scalars['ID']['input'];
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


export type MutationReservePhotoSessionArgs = {
  input: ReservePhotoSessionInput;
};


export type MutationSubmitSessionCsatArgs = {
  input: SessionCsatInput;
};


export type MutationRemoveFavoriteSessionArgs = {
  sessionId: Scalars['ID']['input'];
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

export type PhotoReservation = {
  __typename?: 'PhotoReservation';
  cell_phone?: Maybe<Scalars['String']['output']>;
  date: Scalars['String']['output'];
  email?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  reservedAt: Scalars['String']['output'];
  timeSlot: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

export type PhotoReservationResponse = {
  __typename?: 'PhotoReservationResponse';
  message: Scalars['String']['output'];
  reservation?: Maybe<PhotoReservation>;
  success: Scalars['Boolean']['output'];
};

export type PhotoSession = {
  __typename?: 'PhotoSession';
  availableSpots: Scalars['Int']['output'];
  date: Scalars['String']['output'];
  reservations: Array<PhotoReservation>;
  timeSlot: Scalars['String']['output'];
  totalSpots: Scalars['Int']['output'];
};

export type ProfileAccess = {
  __typename?: 'ProfileAccess';
  PK: Scalars['String']['output'];
  SK: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  getAgenda?: Maybe<AgendaData>;
  getAgendaHash: Scalars['String']['output'];
  getAvailablePhotoSessions: Array<PhotoSession>;
  getMyPhotoReservation?: Maybe<PhotoReservation>;
  getMyFavoriteSessions: Array<Scalars['String']['output']>;
  getMyProfile?: Maybe<User>;
  getPhotoSessionReservations: Array<PhotoReservation>;
  getRoomAgenda?: Maybe<RoomAgendaData>;
  getRoomAgendaHash: Scalars['String']['output'];
  getSessionFavoriteUsers: Array<User>;
  getSponsorDashboard: SponsorDashboard;
  getSponsorVisit?: Maybe<SponsorUser>;
};


export type QueryGetAvailablePhotoSessionsArgs = {
  date: Scalars['String']['input'];
};


export type QueryGetPhotoSessionReservationsArgs = {
  date: Scalars['String']['input'];
  timeSlot: Scalars['String']['input'];
};


export type QueryGetRoomAgendaArgs = {
  location: Scalars['String']['input'];
};


export type QueryGetRoomAgendaHashArgs = {
  location: Scalars['String']['input'];
};


export type QueryGetSessionFavoriteUsersArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QueryGetSponsorVisitArgs = {
  short_id: Scalars['ID']['input'];
};

export type RegisterSponsorVisitInput = {
  message?: InputMaybe<Scalars['String']['input']>;
  short_id: Scalars['ID']['input'];
};

export type ReservePhotoSessionInput = {
  date: Scalars['String']['input'];
  timeSlot: Scalars['String']['input'];
};

export type RoomAgendaData = {
  __typename?: 'RoomAgendaData';
  location: Scalars['String']['output'];
  sessions: Array<Session>;
};

export type Session = {
  __typename?: 'Session';
  capacity?: Maybe<Scalars['Int']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  dateEnd: Scalars['String']['output'];
  dateStart: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  duration?: Maybe<Scalars['Int']['output']>;
  extendedDescription?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  language?: Maybe<Scalars['String']['output']>;
  level?: Maybe<Scalars['String']['output']>;
  liveUrl?: Maybe<Scalars['String']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  nationality?: Maybe<Scalars['String']['output']>;
  recordingUrl?: Maybe<Scalars['String']['output']>;
  speakers?: Maybe<Array<Maybe<Speaker>>>;
  status?: Maybe<Scalars['String']['output']>;
  time: Scalars['String']['output'];
};

export type SessionCsatInput = {
  feedback?: InputMaybe<Scalars['String']['input']>;
  rating: Scalars['Int']['input'];
  sessionId: Scalars['ID']['input'];
};

export type SessionCsatResponse = {
  __typename?: 'SessionCSATResponse';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type SessionInput = {
  capacity?: InputMaybe<Scalars['Int']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  dateEnd: Scalars['String']['input'];
  dateStart: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  duration?: InputMaybe<Scalars['Int']['input']>;
  extendedDescription?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
  level?: InputMaybe<Scalars['String']['input']>;
  liveUrl?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  nationality?: InputMaybe<Scalars['String']['input']>;
  recordingUrl?: InputMaybe<Scalars['String']['input']>;
  speakers?: InputMaybe<Array<InputMaybe<SpeakerInput>>>;
  status?: InputMaybe<Scalars['String']['input']>;
  time: Scalars['String']['input'];
};

export type SocialMedia = {
  __typename?: 'SocialMedia';
  company?: Maybe<Scalars['String']['output']>;
  linkedin?: Maybe<Scalars['String']['output']>;
  twitter?: Maybe<Scalars['String']['output']>;
};

export type SocialMediaInput = {
  company?: InputMaybe<Scalars['String']['input']>;
  linkedin?: InputMaybe<Scalars['String']['input']>;
  twitter?: InputMaybe<Scalars['String']['input']>;
};

export type Speaker = {
  __typename?: 'Speaker';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  company?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  name: Scalars['String']['output'];
  nationality?: Maybe<Scalars['String']['output']>;
  socialMedia?: Maybe<SocialMedia>;
};

export type SpeakerInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  company?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  nationality?: InputMaybe<Scalars['String']['input']>;
  socialMedia?: InputMaybe<SocialMediaInput>;
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

export type AddFavoriteSessionMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type AddFavoriteSessionMutation = { __typename?: 'Mutation', addFavoriteSession: boolean };

export type RemoveFavoriteSessionMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type RemoveFavoriteSessionMutation = { __typename?: 'Mutation', removeFavoriteSession: boolean };

export type GetMyFavoriteSessionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyFavoriteSessionsQuery = { __typename?: 'Query', getMyFavoriteSessions: Array<string> };

export type GetSessionFavoriteUsersQueryVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type GetSessionFavoriteUsersQuery = { __typename?: 'Query', getSessionFavoriteUsers: Array<{ __typename?: 'User', user_id: string, name: string, email?: string | null, company?: string | null }> };


export const AddFavoriteSessionDocument = gql`
    mutation AddFavoriteSession($sessionId: ID!) {
  addFavoriteSession(sessionId: $sessionId)
}
    `;
export type AddFavoriteSessionMutationFn = Apollo.MutationFunction<AddFavoriteSessionMutation, AddFavoriteSessionMutationVariables>;

/**
 * __useAddFavoriteSessionMutation__
 *
 * To run a mutation, you first call `useAddFavoriteSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddFavoriteSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addFavoriteSessionMutation, { data, loading, error }] = useAddFavoriteSessionMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useAddFavoriteSessionMutation(baseOptions?: Apollo.MutationHookOptions<AddFavoriteSessionMutation, AddFavoriteSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddFavoriteSessionMutation, AddFavoriteSessionMutationVariables>(AddFavoriteSessionDocument, options);
      }
export type AddFavoriteSessionMutationHookResult = ReturnType<typeof useAddFavoriteSessionMutation>;
export type AddFavoriteSessionMutationResult = Apollo.MutationResult<AddFavoriteSessionMutation>;
export type AddFavoriteSessionMutationOptions = Apollo.BaseMutationOptions<AddFavoriteSessionMutation, AddFavoriteSessionMutationVariables>;
export const RemoveFavoriteSessionDocument = gql`
    mutation RemoveFavoriteSession($sessionId: ID!) {
  removeFavoriteSession(sessionId: $sessionId)
}
    `;
export type RemoveFavoriteSessionMutationFn = Apollo.MutationFunction<RemoveFavoriteSessionMutation, RemoveFavoriteSessionMutationVariables>;

/**
 * __useRemoveFavoriteSessionMutation__
 *
 * To run a mutation, you first call `useRemoveFavoriteSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveFavoriteSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeFavoriteSessionMutation, { data, loading, error }] = useRemoveFavoriteSessionMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useRemoveFavoriteSessionMutation(baseOptions?: Apollo.MutationHookOptions<RemoveFavoriteSessionMutation, RemoveFavoriteSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveFavoriteSessionMutation, RemoveFavoriteSessionMutationVariables>(RemoveFavoriteSessionDocument, options);
      }
export type RemoveFavoriteSessionMutationHookResult = ReturnType<typeof useRemoveFavoriteSessionMutation>;
export type RemoveFavoriteSessionMutationResult = Apollo.MutationResult<RemoveFavoriteSessionMutation>;
export type RemoveFavoriteSessionMutationOptions = Apollo.BaseMutationOptions<RemoveFavoriteSessionMutation, RemoveFavoriteSessionMutationVariables>;
export const GetMyFavoriteSessionsDocument = gql`
    query GetMyFavoriteSessions {
  getMyFavoriteSessions
}
    `;

/**
 * __useGetMyFavoriteSessionsQuery__
 *
 * To run a query within a React component, call `useGetMyFavoriteSessionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyFavoriteSessionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyFavoriteSessionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyFavoriteSessionsQuery(baseOptions?: Apollo.QueryHookOptions<GetMyFavoriteSessionsQuery, GetMyFavoriteSessionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyFavoriteSessionsQuery, GetMyFavoriteSessionsQueryVariables>(GetMyFavoriteSessionsDocument, options);
      }
export function useGetMyFavoriteSessionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyFavoriteSessionsQuery, GetMyFavoriteSessionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyFavoriteSessionsQuery, GetMyFavoriteSessionsQueryVariables>(GetMyFavoriteSessionsDocument, options);
        }
export function useGetMyFavoriteSessionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyFavoriteSessionsQuery, GetMyFavoriteSessionsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMyFavoriteSessionsQuery, GetMyFavoriteSessionsQueryVariables>(GetMyFavoriteSessionsDocument, options);
        }
export type GetMyFavoriteSessionsQueryHookResult = ReturnType<typeof useGetMyFavoriteSessionsQuery>;
export type GetMyFavoriteSessionsLazyQueryHookResult = ReturnType<typeof useGetMyFavoriteSessionsLazyQuery>;
export type GetMyFavoriteSessionsSuspenseQueryHookResult = ReturnType<typeof useGetMyFavoriteSessionsSuspenseQuery>;
export type GetMyFavoriteSessionsQueryResult = Apollo.QueryResult<GetMyFavoriteSessionsQuery, GetMyFavoriteSessionsQueryVariables>;
export const GetSessionFavoriteUsersDocument = gql`
    query GetSessionFavoriteUsers($sessionId: ID!) {
  getSessionFavoriteUsers(sessionId: $sessionId) {
    user_id
    name
    email
    company
  }
}
    `;

/**
 * __useGetSessionFavoriteUsersQuery__
 *
 * To run a query within a React component, call `useGetSessionFavoriteUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSessionFavoriteUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetSessionFavoriteUsersQuery({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useGetSessionFavoriteUsersQuery(baseOptions: Apollo.QueryHookOptions<GetSessionFavoriteUsersQuery, GetSessionFavoriteUsersQueryVariables> & ({ variables: GetSessionFavoriteUsersQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetSessionFavoriteUsersQuery, GetSessionFavoriteUsersQueryVariables>(GetSessionFavoriteUsersDocument, options);
      }
export function useGetSessionFavoriteUsersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetSessionFavoriteUsersQuery, GetSessionFavoriteUsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetSessionFavoriteUsersQuery, GetSessionFavoriteUsersQueryVariables>(GetSessionFavoriteUsersDocument, options);
        }
export function useGetSessionFavoriteUsersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetSessionFavoriteUsersQuery, GetSessionFavoriteUsersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetSessionFavoriteUsersQuery, GetSessionFavoriteUsersQueryVariables>(GetSessionFavoriteUsersDocument, options);
        }
export type GetSessionFavoriteUsersQueryHookResult = ReturnType<typeof useGetSessionFavoriteUsersQuery>;
export type GetSessionFavoriteUsersLazyQueryHookResult = ReturnType<typeof useGetSessionFavoriteUsersLazyQuery>;
export type GetSessionFavoriteUsersSuspenseQueryHookResult = ReturnType<typeof useGetSessionFavoriteUsersSuspenseQuery>;
export type GetSessionFavoriteUsersQueryResult = Apollo.QueryResult<GetSessionFavoriteUsersQuery, GetSessionFavoriteUsersQueryVariables>;