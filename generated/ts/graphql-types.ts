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
  getMyProfile?: Maybe<User>;
  getRoomAgenda?: Maybe<RoomAgendaData>;
  getRoomAgendaHash: Scalars['String']['output'];
  getSponsorDashboard: SponsorDashboard;
  getSponsorVisit?: Maybe<SponsorUser>;
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
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  ProfileAccess: ResolverTypeWrapper<ProfileAccess>;
  Query: ResolverTypeWrapper<{}>;
  RoomAgendaData: ResolverTypeWrapper<RoomAgendaData>;
  Session: ResolverTypeWrapper<Session>;
  SessionInput: SessionInput;
  SocialMedia: ResolverTypeWrapper<SocialMedia>;
  SocialMediaInput: SocialMediaInput;
  Speaker: ResolverTypeWrapper<Speaker>;
  SpeakerInput: SpeakerInput;
  SponsorDashboard: ResolverTypeWrapper<SponsorDashboard>;
  SponsorUser: ResolverTypeWrapper<SponsorUser>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  UpdateUserInput: UpdateUserInput;
  User: ResolverTypeWrapper<User>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AgendaData: AgendaData;
  AgendaDataInput: AgendaDataInput;
  Boolean: Scalars['Boolean']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  ProfileAccess: ProfileAccess;
  Query: {};
  RoomAgendaData: RoomAgendaData;
  Session: Session;
  SessionInput: SessionInput;
  SocialMedia: SocialMedia;
  SocialMediaInput: SocialMediaInput;
  Speaker: Speaker;
  SpeakerInput: SpeakerInput;
  SponsorDashboard: SponsorDashboard;
  SponsorUser: SponsorUser;
  String: Scalars['String']['output'];
  UpdateUserInput: UpdateUserInput;
  User: User;
};

export type AgendaDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['AgendaData'] = ResolversParentTypes['AgendaData']> = {
  sessions?: Resolver<Array<ResolversTypes['Session']>, ParentType, ContextType>;
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
  getMyProfile?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
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
  user_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  AgendaData?: AgendaDataResolvers<ContextType>;
  ProfileAccess?: ProfileAccessResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RoomAgendaData?: RoomAgendaDataResolvers<ContextType>;
  Session?: SessionResolvers<ContextType>;
  SocialMedia?: SocialMediaResolvers<ContextType>;
  Speaker?: SpeakerResolvers<ContextType>;
  SponsorDashboard?: SponsorDashboardResolvers<ContextType>;
  SponsorUser?: SponsorUserResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

