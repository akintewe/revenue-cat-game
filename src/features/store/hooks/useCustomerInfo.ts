import { useCallback, useEffect, useState } from 'react';
import { CustomerInfo } from 'react-native-purchases';
import { getCustomerInfo } from '../../../services/revenuecat/purchases';

export function useCustomerInfo() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await getCustomerInfo();
      setCustomerInfo(info);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load customer info'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    refresh();
  }, [refresh]);

  return { customerInfo, isLoading, error, refresh };
}
