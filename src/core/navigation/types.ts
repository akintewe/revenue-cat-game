import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

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
  ShareConfirm: { url: string };
  SteamLink: { status: 'ok' | 'failed' | 'expired'; nonce: string };
  FriendProfile: { handle: string };
  Login: undefined;
  Signup: undefined;
};

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
