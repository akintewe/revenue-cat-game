import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { PurchasesPackage } from 'react-native-purchases';
import { colors, radii, spacing, typography } from '../../../shared/theme/theme';
import { ScreenBackground } from '../../../shared/components/ScreenBackground';
import { APP_NAME } from '../../../shared/constants/app';
import { purchasePackage, restorePurchases } from '../../../services/revenuecat/purchases';
import { useOfferings } from '../hooks/useOfferings';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'Paywall'>;

type PlanId = 'annual' | 'monthly';

const FEATURES = [
  {
    icon: 'library-outline' as const,
    title: 'Unlimited shelves',
    description: 'The free tier stops at 50 games. Plus never does.',
  },
  {
    icon: 'stats-chart-outline' as const,
    title: 'Backlog stats',
    description: 'Hours owed, completion rate, what you always pause.',
  },
  {
    icon: 'sync-outline' as const,
    title: 'Sync everywhere',
    description: 'Phone, tablet, the foldable. Same library.',
  },
];

const FALLBACK_ANNUAL_PRICE = '£19.99/yr';
const FALLBACK_MONTHLY_PRICE = '£2.99/mo';

export function PaywallScreen({ navigation }: Props) {
  const { offering } = useOfferings();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('annual');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const annualPackage = offering?.annual ?? null;
  const monthlyPackage = offering?.monthly ?? null;

  const annualPrice = annualPackage?.product.priceString ?? FALLBACK_ANNUAL_PRICE;
  const monthlyPrice = monthlyPackage?.product.priceString ?? FALLBACK_MONTHLY_PRICE;

  const selectedPackage: PurchasesPackage | null =
    selectedPlan === 'annual' ? annualPackage : monthlyPackage;

  async function handleStart() {
    if (!selectedPackage) {
      Alert.alert(
        'Not configured yet',
        'Connect a RevenueCat offering with annual/monthly packages to enable purchases.',
      );
      return;
    }
    setIsPurchasing(true);
    try {
      await purchasePackage(selectedPackage);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Purchase failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  }

  async function handleRestore() {
    try {
      await restorePurchases();
      Alert.alert('Restored', 'Your purchases have been restored.');
    } catch (err) {
      Alert.alert('Restore failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBackground />
      <Pressable onPress={() => navigation.goBack()} style={styles.closeButton} hitSlop={12}>
        <Ionicons name="close" size={22} color={colors.textMuted} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{APP_NAME} Plus</Text>
        <Text style={styles.title}>Finish more{'\n'}of what you start</Text>

        <View style={styles.features}>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={18} color={colors.accent} />
              </View>
              <View style={styles.featureText}>
                <Text style={typography.subheading}>{feature.title}</Text>
                <Text style={typography.body}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          <Pressable
            onPress={() => setSelectedPlan('annual')}
            style={[styles.planRow, selectedPlan === 'annual' && styles.planRowActive]}
          >
            <View style={styles.radio}>
              {selectedPlan === 'annual' && <View style={styles.radioDot} />}
            </View>
            <View style={styles.planText}>
              <Text style={typography.subheading}>Annual</Text>
              <Text style={typography.body}>{annualPrice} billed yearly</Text>
            </View>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>SAVE 44%</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setSelectedPlan('monthly')}
            style={[styles.planRow, selectedPlan === 'monthly' && styles.planRowActive]}
          >
            <View style={styles.radio}>
              {selectedPlan === 'monthly' && <View style={styles.radioDot} />}
            </View>
            <View style={styles.planText}>
              <Text style={typography.subheading}>Monthly</Text>
              <Text style={typography.body}>Cancel any time</Text>
            </View>
            <Text style={styles.planPrice}>{monthlyPrice}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleStart}
          disabled={isPurchasing}
          style={[styles.cta, isPurchasing && styles.ctaDisabled]}
        >
          <Text style={styles.ctaLabel}>
            {isPurchasing
              ? 'Starting…'
              : `Start · ${selectedPlan === 'annual' ? annualPrice : monthlyPrice}`}
          </Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Cancel anytime in your App Store or Play Store account settings.
        </Text>

        <View style={styles.footerLinks}>
          <Pressable onPress={handleRestore}>
            <Text style={styles.footerLink}>Restore purchases</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('https://example.com/terms')}>
            <Text style={styles.footerLink}>Terms</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('https://example.com/privacy')}>
            <Text style={styles.footerLink}>Privacy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  eyebrow: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.heading,
    fontSize: 30,
    lineHeight: 36,
  },
  features: {
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  plans: {
    gap: spacing.sm,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  planRowActive: {
    borderColor: colors.accent,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  planText: {
    flex: 1,
    gap: 2,
  },
  planPrice: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  saveBadge: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  saveBadgeText: {
    color: colors.onAccent,
    fontSize: 11,
    fontWeight: '800',
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaLabel: {
    color: colors.onAccent,
    fontWeight: '800',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  disclaimer: {
    color: colors.textFaint,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  footerLink: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
