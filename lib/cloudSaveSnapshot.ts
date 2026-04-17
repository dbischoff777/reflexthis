type SnapshotV1 = Readonly<{
  v: 1;
  savedAt: number;
  localStorage: Record<string, string | null>;
  error?: string;
}>;

function getElectronApi() {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
}

export async function exportSaveSnapshotToDisk(): Promise<void> {
  const api = getElectronApi();
  if (!api?.saveSnapshot) return;
  try {
    await api.saveSnapshot();
  } catch {
    // ignore
  }
}

export async function importSaveSnapshotFromDisk(): Promise<boolean> {
  const api = getElectronApi();
  if (!api?.readSnapshot) return false;
  try {
    const res = await api.readSnapshot();
    if (!res?.ok || typeof res.content !== 'string' || res.content.length === 0) return false;
    const parsed = JSON.parse(res.content) as SnapshotV1;
    if (!parsed || parsed.v !== 1 || typeof parsed.localStorage !== 'object' || !parsed.localStorage) return false;

    // Import only our keys.
    for (const [k, v] of Object.entries(parsed.localStorage)) {
      if (!k.startsWith('reflexthis_')) continue;
      if (v === null || v === undefined) {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      } else {
        try {
          localStorage.setItem(k, String(v));
        } catch {
          // ignore
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

