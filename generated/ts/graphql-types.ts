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

export type Mutation = {
  __typename?: 'Mutation';
  updateAgenda?: Maybe<AgendaData>;
  updateRoomAgenda?: Maybe<Session>;
  updateUser?: Maybe<User>;
  viewProfile?: Maybe<User>;
};


export type MutationUpdateAgendaArgs = {
  data: AgendaDataInput;
};


export type MutationUpdateRoomAgendaArgs = {
  roomId: Scalars['ID']['input'];
  session: SessionInput;
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
  getAgenda?: Maybe<AgendaData>;
  getMyProfile?: Maybe<User>;
};

export type Room = {
  __typename?: 'Room';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
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
  roomId: Scalars['ID']['output'];
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
  Accepted = 'Accepted'
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

export type Subscription = {
  __typename?: 'Subscription';
  onAgendaUpdate?: Maybe<AgendaData>;
  onRoomAgendaUpdate?: Maybe<Session>;
};


export type SubscriptionOnRoomAgendaUpdateArgs = {
  roomId: Scalars['ID']['input'];
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
  Category: ResolverTypeWrapper<Category>;
  CategoryInput: CategoryInput;
  CategoryItem: ResolverTypeWrapper<CategoryItem>;
  CategoryItemInput: CategoryItemInput;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  ProfileAccess: ResolverTypeWrapper<ProfileAccess>;
  Query: ResolverTypeWrapper<{}>;
  Room: ResolverTypeWrapper<Room>;
  RoomInput: RoomInput;
  Session: ResolverTypeWrapper<Session>;
  SessionInput: SessionInput;
  SessionStatus: SessionStatus;
  Speaker: ResolverTypeWrapper<Speaker>;
  SpeakerInput: SpeakerInput;
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
  Category: Category;
  CategoryInput: CategoryInput;
  CategoryItem: CategoryItem;
  CategoryItemInput: CategoryItemInput;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Mutation: {};
  ProfileAccess: ProfileAccess;
  Query: {};
  Room: Room;
  RoomInput: RoomInput;
  Session: Session;
  SessionInput: SessionInput;
  Speaker: Speaker;
  SpeakerInput: SpeakerInput;
  String: Scalars['String']['output'];
  Subscription: {};
  UpdateUserInput: UpdateUserInput;
  User: User;
};

export type AgendaDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['AgendaData'] = ResolversParentTypes['AgendaData']> = {
  sessions?: Resolver<Array<ResolversTypes['Session']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CategoryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = {
  categoryItems?: Resolver<Array<ResolversTypes['CategoryItem']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sort?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CategoryItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['CategoryItem'] = ResolversParentTypes['CategoryItem']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  updateAgenda?: Resolver<Maybe<ResolversTypes['AgendaData']>, ParentType, ContextType, RequireFields<MutationUpdateAgendaArgs, 'data'>>;
  updateRoomAgenda?: Resolver<Maybe<ResolversTypes['Session']>, ParentType, ContextType, RequireFields<MutationUpdateRoomAgendaArgs, 'roomId' | 'session'>>;
  updateUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationUpdateUserArgs, 'input'>>;
  viewProfile?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationViewProfileArgs, 'id' | 'pin'>>;
};

export type ProfileAccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['ProfileAccess'] = ResolversParentTypes['ProfileAccess']> = {
  PK?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  SK?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  getAgenda?: Resolver<Maybe<ResolversTypes['AgendaData']>, ParentType, ContextType>;
  getMyProfile?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
};

export type RoomResolvers<ContextType = any, ParentType extends ResolversParentTypes['Room'] = ResolversParentTypes['Room']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SessionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Session'] = ResolversParentTypes['Session']> = {
  categories?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  endsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isConfirmed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isInformed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isPlenumSession?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isServiceSession?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  liveUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  recordingUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  room?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  roomId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  speakers?: Resolver<Array<ResolversTypes['Speaker']>, ParentType, ContextType>;
  startsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['SessionStatus'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SpeakerResolvers<ContextType = any, ParentType extends ResolversParentTypes['Speaker'] = ResolversParentTypes['Speaker']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  onAgendaUpdate?: SubscriptionResolver<Maybe<ResolversTypes['AgendaData']>, "onAgendaUpdate", ParentType, ContextType>;
  onRoomAgendaUpdate?: SubscriptionResolver<Maybe<ResolversTypes['Session']>, "onRoomAgendaUpdate", ParentType, ContextType, RequireFields<SubscriptionOnRoomAgendaUpdateArgs, 'roomId'>>;
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
  user_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  AgendaData?: AgendaDataResolvers<ContextType>;
  Category?: CategoryResolvers<ContextType>;
  CategoryItem?: CategoryItemResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  ProfileAccess?: ProfileAccessResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Room?: RoomResolvers<ContextType>;
  Session?: SessionResolvers<ContextType>;
  Speaker?: SpeakerResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

