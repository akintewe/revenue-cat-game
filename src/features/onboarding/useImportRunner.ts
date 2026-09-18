import { useCallback, useEffect, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { scanAndImportAndroidGames } from '../../services/social/android';
import { setPlatformLinkHandler, type PlatformLinkEvent } from '../../services/social/platformLink';
import { importPsnLibrary, PsnNotFoundError, PsnProfilePrivateError } from '../../services/social/psn';
import { finishSteamLink, importSteamLibrary, startSteamLink, SteamProfilePrivateError } from '../../services/social/steam';
import { finishXboxLink, importXboxLibrary, startXboxLink } from '../../services/social/xbox';
import { useLibraryStore } from '../library/store/useLibraryStore';
import type { ImportSourceId } from './importSources';

export type ImportRun =
  | { stage: 'idle' }
  /** The sign-in sheet is open. */
  | { stage: 'connecting' }
  | { stage: 'importing' }
  | { stage: 'done'; matched: number; total: number }
  | { stage: 'private'; message: string; fixUrl: string }
  | { stage: 'notFound'; message: string }
  | { stage: 'error'; message: string };

type Runs = Record<ImportSourceId, ImportRun>;
const CONNECT_TIMEOUT_MS = 180_000;
const IDLE: Runs = { steam: { stage: 'idle' }, xbox: { stage: 'idle' }, psn: { stage: 'idle' }, android: { stage: 'idle' } };

function failure(err: unknown): ImportRun {
  if (err instanceof SteamProfilePrivateError || err instanceof PsnProfilePrivateError) {
    return { stage: 'private', message: err.message, fixUrl: err.fixUrl };
  }
  if (err instanceof PsnNotFoundError) return { stage: 'notFound', message: err.message };
  return { stage: 'error', message: err instanceof Error ? err.message : 'Something went wrong. Try again.' };
}

/**
 * Runs the imports for the onboarding step. Each source has its own state, so one can run while
 * another waits, and a failure in one never blocks the rest or the Continue button.
 * While mounted it takes the sign-in redirects, so the navigator does not open its own screen.
 */
export function useImportRunner() {
  const [runs, setRuns] = useState<Runs>(IDLE);
  const mounted = useRef(true);
  const runsRef = useRef(runs);
  useEffect(() => {
    runsRef.current = runs;
  }, [runs]);

  const set = useCallback((id: ImportSourceId, run: ImportRun) => {
    if (mounted.current) setRuns((previous) => ({ ...previous, [id]: run }));
  }, []);

  const runImport = useCallback(
    async (id: ImportSourceId, work: () => Promise<{ matched: number; total: number }>) => {
      set(id, { stage: 'importing' });
      try {
        const result = await work();
        await useLibraryStore.getState().hydrate();
        set(id, { stage: 'done', matched: result.matched, total: result.total });
      } catch (err) {
        set(id, failure(err));
      }
    },
    [set],
  );

  useEffect(() => {
    mounted.current = true;
    const remove = setPlatformLinkHandler((event: PlatformLinkEvent) => {
      // iOS keeps the sheet open after the redirect. Android closes it, and this call is a no-op there.
      try {
        WebBrowser.dismissBrowser();
      } catch {}
      if (event.status !== 'ok') {
        set(event.platform, {
          stage: 'error',
          message: event.status === 'expired' ? 'That sign-in took too long. Try again.' : 'The sign-in did not go through. Try again.',
        });
        return;
      }
      void runImport(event.platform, async () => {
        if (event.platform === 'steam') {
          await finishSteamLink(event.nonce);
          return importSteamLibrary();
        }
        await finishXboxLink(event.nonce);
        return importXboxLibrary();
      });
    });
    return () => {
      mounted.current = false;
      remove();
    };
  }, [runImport, set]);

  /** Steam and Xbox: open the sign-in sheet. The redirect above does the rest. */
  const connect = useCallback(
    async (id: 'steam' | 'xbox') => {
      set(id, { stage: 'connecting' });
      try {
        const { redirectUrl } = await (id === 'steam' ? startSteamLink() : startXboxLink());
        const result = await WebBrowser.openBrowserAsync(redirectUrl);
        const stillWaiting = () => mounted.current && runsRef.current[id].stage === 'connecting';
        if (result.type === 'opened') {
          // Android: the promise resolves as soon as the tab opens. If no redirect ever comes
          // back (the sign-in page failed before it could redirect), stop waiting.
          setTimeout(() => {
            if (stillWaiting()) set(id, { stage: 'error', message: 'The sign-in did not finish. Try again.' });
          }, CONNECT_TIMEOUT_MS);
        } else if (stillWaiting()) {
          // iOS: the sheet was closed by hand before any redirect arrived.
          set(id, { stage: 'idle' });
        }
      } catch (err) {
        set(id, failure(err));
      }
    },
    [set],
  );

  /** A linked account whose import failed (a private profile, now fixed) does not need a new sign-in. */
  const retry = useCallback(
    (id: 'steam' | 'xbox') => runImport(id, id === 'steam' ? importSteamLibrary : importXboxLibrary),
    [runImport],
  );

  const importPsn = useCallback((onlineId: string) => runImport('psn', () => importPsnLibrary(onlineId)), [runImport]);
  const scanPhone = useCallback(() => runImport('android', scanAndImportAndroidGames), [runImport]);

  return { runs, connect, retry, importPsn, scanPhone };
}
