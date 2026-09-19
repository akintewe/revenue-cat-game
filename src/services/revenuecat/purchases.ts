import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { env } from '../../config/env';

let isConfigured = false;

/**
 * Call once at app boot, before any auth state is known — this configures the SDK
 * anonymously. Identify the signed-in user afterwards with `loginPurchases`, never
 * by passing an id here (see prysm-pro-for-sola.md §2.5).
 */
export function configurePurchases() {
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

  Purchases.configure({ apiKey });
  isConfigured = true;
}

/**
 * Ties the RevenueCat subscriber to our own Supabase user id. Without this, a
 * purchase is keyed to an anonymous device id and is invisible on any other
 * device or after a reinstall — call on every launch where a session exists, not
 * just from the sign-in screen.
 */
export async function loginPurchases(supabaseUserId: string): Promise<void> {
  if (!isConfigured) return;
  await Purchases.logIn(supabaseUserId);
}

export async function logoutPurchases(): Promise<void> {
  if (!isConfigured) return;
  await Purchases.logOut();
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
