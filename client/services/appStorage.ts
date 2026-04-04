import AsyncStorage from '@react-native-async-storage/async-storage';

type StorageValue = string | null;
type AsyncStorageWithMultiRemove = typeof AsyncStorage & {
  multiRemove?: (keys: string[]) => Promise<void>;
};

const memoryStore = new Map<string, string>();
let shouldUseMemoryFallback = false;
let hasLoggedFallback = false;

function isStorageUnavailableError(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  return (
    message.includes('Native module is null') ||
    message.includes('native module is null') ||
    message.includes('legacy storage') ||
    message.includes('AsyncStorage')
  );
}

function activateMemoryFallback(error: unknown) {
  shouldUseMemoryFallback = true;

  if (!hasLoggedFallback) {
    hasLoggedFallback = true;
    console.warn(
      '[storage] AsyncStorage unavailable, using in-memory fallback for this session.',
      error,
    );
  }
}

async function withFallback(
  operation: () => Promise<StorageValue>,
  fallback: () => StorageValue | Promise<StorageValue>,
): Promise<StorageValue> {
  if (shouldUseMemoryFallback) {
    return fallback();
  }

  try {
    return await operation();
  } catch (error) {
    if (isStorageUnavailableError(error)) {
      activateMemoryFallback(error);
      return fallback();
    }

    throw error;
  }
}

const appStorage = {
  async getItem(key: string): Promise<StorageValue> {
    return withFallback(
      () => AsyncStorage.getItem(key),
      () => memoryStore.get(key) ?? null,
    );
  },

  async setItem(key: string, value: string): Promise<void> {
    await withFallback(
      async () => {
        await AsyncStorage.setItem(key, value);
        return null;
      },
      () => {
        memoryStore.set(key, value);
        return null;
      },
    );
  },

  async removeItem(key: string): Promise<void> {
    await withFallback(
      async () => {
        await AsyncStorage.removeItem(key);
        return null;
      },
      () => {
        memoryStore.delete(key);
        return null;
      },
    );
  },

  async multiRemove(keys: string[]): Promise<void> {
    await withFallback(
      async () => {
        const asyncStorageWithMultiRemove =
          AsyncStorage as AsyncStorageWithMultiRemove;

        if (typeof asyncStorageWithMultiRemove.multiRemove === 'function') {
          await asyncStorageWithMultiRemove.multiRemove(keys);
        } else {
          await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
        }

        return null;
      },
      () => {
        keys.forEach(key => memoryStore.delete(key));
        return null;
      },
    );
  },
};

export default appStorage;
