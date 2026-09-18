import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { FeedPost } from '../../services/social/feed';
import type { Stamp } from '../../features/passport/types';

export type TabParamList = {
  LibraryTab: { openBrowse?: boolean } | undefined;
  WishlistTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Tabs: { screen: 'LibraryTab'; params?: TabParamList['LibraryTab'] } | undefined;
  AddGame: undefined;
  GameDetail: { catalogId: string };
  Paywall: undefined;
  Passport: undefined;
  AchievementDetail: { stamp: Stamp };
  ShareConfirm: { url: string };
  SteamLink: { status: 'ok' | 'failed' | 'expired'; nonce: string };
  FriendProfile: { handle: string };
  PostDetail: { post: FeedPost; onPostUpdated?: (post: FeedPost) => void; onPostDeleted?: (postId: string) => void };
  ComposePost: { onPostCreated: (post: FeedPost) => void };
  FollowList: { handle: string; mode: 'followers' | 'following' };
  FriendSearch: undefined;
  Notifications: undefined;
  EditProfile: undefined;
  DeleteAccount: undefined;
  Login: undefined;
  Signup: undefined;
  Onboarding: undefined;
};

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
