import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { Button } from '../../../shared/components/Button';
import { Screen } from '../../../shared/components/Screen';
import { colors, spacing, typography } from '../../../shared/theme/theme';
import { purchasePackage, restorePurchases } from '../../../services/revenuecat/purchases';
import { useOfferings } from '../hooks/useOfferings';
import { useGameStore } from '../../game/store/useGameStore';

const EXTRA_LIVES_GRANTED = 3;

export function StoreScreen() {
  const { offering, isLoading, error, refresh } = useOfferings();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const addExtraLife = useGameStore((state) => state.addExtraLife);

  async function handlePurchase(pkg: PurchasesPackage) {
    setPurchasingId(pkg.identifier);
    try {
      await purchasePackage(pkg);
      addExtraLife(EXTRA_LIVES_GRANTED);
      Alert.alert('Purchase complete', `You received ${EXTRA_LIVES_GRANTED} extra lives.`);
    } catch (err) {
      Alert.alert('Purchase failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setPurchasingId(null);
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
    <Screen>
      <Text style={typography.heading}>Store</Text>
      <Text style={[typography.body, styles.subtitle]}>
        Buy extra lives to keep the run going.
      </Text>

      {isLoading && <ActivityIndicator color={colors.primary} style={styles.spacerTop} />}

      {error && (
        <View style={styles.spacerTop}>
          <Text style={styles.error}>{error.message}</Text>
          <Button label="Retry" onPress={refresh} variant="secondary" />
        </View>
      )}

      {!isLoading && !error && (
        <FlatList
          data={offering?.availablePackages ?? []}
          keyExtractor={(item) => item.identifier}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={typography.body}>No packages available right now.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.packageRow}>
              <View style={styles.packageInfo}>
                <Text style={typography.subheading}>{item.product.title}</Text>
                <Text style={typography.body}>{item.product.priceString}</Text>
              </View>
              <Button
                label={purchasingId === item.identifier ? 'Purchasing…' : 'Buy'}
                onPress={() => handlePurchase(item)}
                disabled={purchasingId !== null}
              />
            </View>
          )}
        />
      )}

      <Button label="Restore purchases" onPress={handleRestore} variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginBottom: spacing.lg,
  },
  spacerTop: {
    marginTop: spacing.lg,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  packageInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
