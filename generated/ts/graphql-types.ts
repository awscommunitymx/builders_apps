import { GraphQLResolveInfo } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
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
  checkInAttendee: CheckInResponse;
  registerSponsorVisit?: Maybe<SponsorUser>;
  reservePhotoSession: PhotoReservationResponse;
  submitSessionCSAT: SessionCsatResponse;
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


export type MutationReservePhotoSessionArgs = {
  input: ReservePhotoSessionInput;
};


export type MutationSubmitSessionCsatArgs = {
  input: SessionCsatInput;
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
  getMyProfile?: Maybe<User>;
  getPhotoSessionReservations: Array<PhotoReservation>;
  getRoomAgenda?: Maybe<RoomAgendaData>;
  getRoomAgendaHash: Scalars['String']['output'];
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



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AgendaData: ResolverTypeWrapper<AgendaData>;
  AgendaDataInput: AgendaDataInput;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CheckInResponse: ResolverTypeWrapper<CheckInResponse>;
  CheckInStatus: CheckInStatus;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  PhotoReservation: ResolverTypeWrapper<PhotoReservation>;
  PhotoReservationResponse: ResolverTypeWrapper<PhotoReservationResponse>;
  PhotoSession: ResolverTypeWrapper<PhotoSession>;
  ProfileAccess: ResolverTypeWrapper<ProfileAccess>;
  Query: ResolverTypeWrapper<{}>;
  RegisterSponsorVisitInput: RegisterSponsorVisitInput;
  ReservePhotoSessionInput: ReservePhotoSessionInput;
  RoomAgendaData: ResolverTypeWrapper<RoomAgendaData>;
  Session: ResolverTypeWrapper<Session>;
  SessionCSATInput: SessionCsatInput;
  SessionCSATResponse: ResolverTypeWrapper<SessionCsatResponse>;
  SessionInput: SessionInput;
  SocialMedia: ResolverTypeWrapper<SocialMedia>;
  SocialMediaInput: SocialMediaInput;
  Speaker: ResolverTypeWrapper<Speaker>;
  SpeakerInput: SpeakerInput;
  SponsorDashboard: ResolverTypeWrapper<SponsorDashboard>;
  SponsorUser: ResolverTypeWrapper<SponsorUser>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<{}>;
  UpdateUserInput: UpdateUserInput;
  User: ResolverTypeWrapper<User>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AgendaData: AgendaData;
  AgendaDataInput: AgendaDataInput;
  Boolean: Scalars['Boolean']['output'];
  CheckInResponse: CheckInResponse;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Mutation: {};
  PhotoReservation: PhotoReservation;
  PhotoReservationResponse: PhotoReservationResponse;
  PhotoSession: PhotoSession;
  ProfileAccess: ProfileAccess;
  Query: {};
  RegisterSponsorVisitInput: RegisterSponsorVisitInput;
  ReservePhotoSessionInput: ReservePhotoSessionInput;
  RoomAgendaData: RoomAgendaData;
  Session: Session;
  SessionCSATInput: SessionCsatInput;
  SessionCSATResponse: SessionCsatResponse;
  SessionInput: SessionInput;
  SocialMedia: SocialMedia;
  SocialMediaInput: SocialMediaInput;
  Speaker: Speaker;
  SpeakerInput: SpeakerInput;
  SponsorDashboard: SponsorDashboard;
  SponsorUser: SponsorUser;
  String: Scalars['String']['output'];
  Subscription: {};
  UpdateUserInput: UpdateUserInput;
  User: User;
};

export type AgendaDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['AgendaData'] = ResolversParentTypes['AgendaData']> = {
  sessions?: Resolver<Array<ResolversTypes['Session']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CheckInResponseResolvers<ContextType = any, ParentType extends ResolversParentTypes['CheckInResponse'] = ResolversParentTypes['CheckInResponse']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  missingFields?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CheckInStatus'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  cancelPhotoReservation?: Resolver<ResolversTypes['PhotoReservationResponse'], ParentType, ContextType>;
  checkInAttendee?: Resolver<ResolversTypes['CheckInResponse'], ParentType, ContextType, Partial<MutationCheckInAttendeeArgs>>;
  registerSponsorVisit?: Resolver<Maybe<ResolversTypes['SponsorUser']>, ParentType, ContextType, RequireFields<MutationRegisterSponsorVisitArgs, 'input'>>;
  reservePhotoSession?: Resolver<ResolversTypes['PhotoReservationResponse'], ParentType, ContextType, RequireFields<MutationReservePhotoSessionArgs, 'input'>>;
  submitSessionCSAT?: Resolver<ResolversTypes['SessionCSATResponse'], ParentType, ContextType, RequireFields<MutationSubmitSessionCsatArgs, 'input'>>;
  updateAgenda?: Resolver<Maybe<ResolversTypes['AgendaData']>, ParentType, ContextType, RequireFields<MutationUpdateAgendaArgs, 'sessions'>>;
  updateRoomAgenda?: Resolver<Maybe<ResolversTypes['RoomAgendaData']>, ParentType, ContextType, RequireFields<MutationUpdateRoomAgendaArgs, 'location' | 'sessions'>>;
  updateUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationUpdateUserArgs, 'input'>>;
  viewProfile?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationViewProfileArgs, 'id' | 'pin'>>;
};

export type PhotoReservationResolvers<ContextType = any, ParentType extends ResolversParentTypes['PhotoReservation'] = ResolversParentTypes['PhotoReservation']> = {
  cell_phone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  date?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reservedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timeSlot?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PhotoReservationResponseResolvers<ContextType = any, ParentType extends ResolversParentTypes['PhotoReservationResponse'] = ResolversParentTypes['PhotoReservationResponse']> = {
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reservation?: Resolver<Maybe<ResolversTypes['PhotoReservation']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PhotoSessionResolvers<ContextType = any, ParentType extends ResolversParentTypes['PhotoSession'] = ResolversParentTypes['PhotoSession']> = {
  availableSpots?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  date?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reservations?: Resolver<Array<ResolversTypes['PhotoReservation']>, ParentType, ContextType>;
  timeSlot?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalSpots?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProfileAccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['ProfileAccess'] = ResolversParentTypes['ProfileAccess']> = {
  PK?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  SK?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  getAgenda?: Resolver<Maybe<ResolversTypes['AgendaData']>, ParentType, ContextType>;
  getAgendaHash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  getAvailablePhotoSessions?: Resolver<Array<ResolversTypes['PhotoSession']>, ParentType, ContextType, RequireFields<QueryGetAvailablePhotoSessionsArgs, 'date'>>;
  getMyPhotoReservation?: Resolver<Maybe<ResolversTypes['PhotoReservation']>, ParentType, ContextType>;
  getMyProfile?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  getPhotoSessionReservations?: Resolver<Array<ResolversTypes['PhotoReservation']>, ParentType, ContextType, RequireFields<QueryGetPhotoSessionReservationsArgs, 'date' | 'timeSlot'>>;
  getRoomAgenda?: Resolver<Maybe<ResolversTypes['RoomAgendaData']>, ParentType, ContextType, RequireFields<QueryGetRoomAgendaArgs, 'location'>>;
  getRoomAgendaHash?: Resolver<ResolversTypes['String'], ParentType, ContextType, RequireFields<QueryGetRoomAgendaHashArgs, 'location'>>;
  getSponsorDashboard?: Resolver<ResolversTypes['SponsorDashboard'], ParentType, ContextType>;
  getSponsorVisit?: Resolver<Maybe<ResolversTypes['SponsorUser']>, ParentType, ContextType, RequireFields<QueryGetSponsorVisitArgs, 'short_id'>>;
};

export type RoomAgendaDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['RoomAgendaData'] = ResolversParentTypes['RoomAgendaData']> = {
  location?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sessions?: Resolver<Array<ResolversTypes['Session']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SessionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Session'] = ResolversParentTypes['Session']> = {
  capacity?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  category?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dateEnd?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dateStart?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  duration?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  extendedDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  language?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  level?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  liveUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nationality?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  recordingUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  speakers?: Resolver<Maybe<Array<Maybe<ResolversTypes['Speaker']>>>, ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  time?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SessionCsatResponseResolvers<ContextType = any, ParentType extends ResolversParentTypes['SessionCSATResponse'] = ResolversParentTypes['SessionCSATResponse']> = {
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SocialMediaResolvers<ContextType = any, ParentType extends ResolversParentTypes['SocialMedia'] = ResolversParentTypes['SocialMedia']> = {
  company?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  linkedin?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  twitter?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SpeakerResolvers<ContextType = any, ParentType extends ResolversParentTypes['Speaker'] = ResolversParentTypes['Speaker']> = {
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  bio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  company?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nationality?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  socialMedia?: Resolver<Maybe<ResolversTypes['SocialMedia']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SponsorDashboardResolvers<ContextType = any, ParentType extends ResolversParentTypes['SponsorDashboard'] = ResolversParentTypes['SponsorDashboard']> = {
  sponsor_name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  total_visits?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  visits?: Resolver<Array<ResolversTypes['SponsorUser']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SponsorUserResolvers<ContextType = any, ParentType extends ResolversParentTypes['SponsorUser'] = ResolversParentTypes['SponsorUser']> = {
  cell_phone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  company?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  job_title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  last_visit?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  short_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  user_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  onAgendaUpdate?: SubscriptionResolver<Maybe<ResolversTypes['AgendaData']>, "onAgendaUpdate", ParentType, ContextType>;
  onRoomAgendaUpdate?: SubscriptionResolver<Maybe<ResolversTypes['RoomAgendaData']>, "onRoomAgendaUpdate", ParentType, ContextType, RequireFields<SubscriptionOnRoomAgendaUpdateArgs, 'location'>>;
};

export type UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  cell_phone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  company?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  initialized?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  job_title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pin?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  share_email?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  share_phone?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  short_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sponsor_visits?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  ticket_class_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  user_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  AgendaData?: AgendaDataResolvers<ContextType>;
  CheckInResponse?: CheckInResponseResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  PhotoReservation?: PhotoReservationResolvers<ContextType>;
  PhotoReservationResponse?: PhotoReservationResponseResolvers<ContextType>;
  PhotoSession?: PhotoSessionResolvers<ContextType>;
  ProfileAccess?: ProfileAccessResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RoomAgendaData?: RoomAgendaDataResolvers<ContextType>;
  Session?: SessionResolvers<ContextType>;
  SessionCSATResponse?: SessionCsatResponseResolvers<ContextType>;
  SocialMedia?: SocialMediaResolvers<ContextType>;
  Speaker?: SpeakerResolvers<ContextType>;
  SponsorDashboard?: SponsorDashboardResolvers<ContextType>;
  SponsorUser?: SponsorUserResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

