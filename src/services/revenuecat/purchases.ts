import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { env } from '../../config/env';

let isConfigured = false;

export function configurePurchases(appUserId?: string) {
  if (isConfigured) return;

  const apiKey = Platform.select({
    ios: env.revenueCatApiKeyIos,
    android: env.revenueCatApiKeyAndroid,
    default: '',
  });

  if (!apiKey) {
    console.warn('[RevenueCat] Missing API key for platform', Platform.OS);
    return;
  }

  Purchases.configure({ apiKey, appUserID: appUserId });
  isConfigured = true;
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export function hasActiveEntitlement(customerInfo: CustomerInfo, entitlementId: string): boolean {
  return Boolean(customerInfo.entitlements.active[entitlementId]);
}
