import { useCallback, useEffect, useState } from 'react';
import { PurchasesOffering } from 'react-native-purchases';
import { getOfferings } from '../../../services/revenuecat/purchases';

export function useOfferings() {
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const current = await getOfferings();
      setOffering(current);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load offerings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    refresh();
  }, [refresh]);

  return { offering, isLoading, error, refresh };
}
