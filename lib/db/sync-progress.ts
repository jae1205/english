import {
  exportProgressSnapshot,
  importProgressSnapshot,
  type ProgressSnapshot,
} from './repositories/progress';

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

interface SyncResponse {
  ok?: boolean;
  snapshot?: ProgressSnapshot | null;
}

const DEFAULT_SYNC_ENDPOINT = '/api/progress';

let pullPromise: Promise<boolean> | null = null;

function getEnv(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env?.[name] : undefined;
}

function getSyncEndpoint(): string | null {
  const configuredEndpoint = getEnv('EXPO_PUBLIC_PROGRESS_SYNC_URL');
  if (configuredEndpoint) return configuredEndpoint;

  return typeof window !== 'undefined' ? DEFAULT_SYNC_ENDPOINT : null;
}

function getSyncToken(): string | undefined {
  return getEnv('EXPO_PUBLIC_PROGRESS_SYNC_TOKEN');
}

async function requestSyncApi(method: 'GET' | 'PUT' | 'DELETE', body?: unknown): Promise<SyncResponse | null> {
  const endpoint = getSyncEndpoint();
  if (!endpoint || typeof fetch === 'undefined') return null;

  const token = getSyncToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['x-progress-sync-token'] = token;
  }

  try {
    const response = await fetch(endpoint, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    const data = (await response.json()) as SyncResponse;
    if (!response.ok) {
      console.warn('[ProgressSync] Remote sync unavailable:', data);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[ProgressSync] Remote sync failed:', error);
    return null;
  }
}

export async function pullProgressFromServer(): Promise<boolean> {
  if (pullPromise) return pullPromise;

  pullPromise = (async () => {
    const data = await requestSyncApi('GET');
    if (!data?.snapshot) return false;

    await importProgressSnapshot(data.snapshot);
    return true;
  })();

  try {
    return await pullPromise;
  } finally {
    pullPromise = null;
  }
}

export async function pushProgressToServer(): Promise<boolean> {
  const snapshot = await exportProgressSnapshot();
  const data = await requestSyncApi('PUT', { snapshot });
  return Boolean(data?.ok);
}

export async function deleteProgressFromServer(): Promise<boolean> {
  const data = await requestSyncApi('DELETE');
  return Boolean(data?.ok);
}
