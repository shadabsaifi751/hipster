import { useEffect, useState } from 'react';
import { loginWithDefaults } from '../api/bookingApi';
import { logAction } from '../utils/logger';
import { logUiError } from '../utils/logger';

export function useAuthBootstrap() {
  const [ready, setReady] = useState(
    () =>
      Boolean(localStorage.getItem('auth_token')) && Boolean(localStorage.getItem('auth_user')),
  );
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hasToken = Boolean(localStorage.getItem('auth_token'));
        const hasUser = Boolean(localStorage.getItem('auth_user'));
        if (!hasToken || !hasUser) {
          await loginWithDefaults();
          logAction('auth.login', { source: 'bootstrap' });
        }
        if (!cancelled) setReady(true);
      } catch (e) {
        logUiError('auth.bootstrap', { message: e?.message });
        if (!cancelled) {
          setError(e);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, authError: error };
}
