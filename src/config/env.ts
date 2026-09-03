import Constants from 'expo-constants';

type Extra = {
  revenueCatApiKeyIos?: string;
  revenueCatApiKeyAndroid?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  revenueCatApiKeyIos: extra.revenueCatApiKeyIos ?? '',
  revenueCatApiKeyAndroid: extra.revenueCatApiKeyAndroid ?? '',
};
