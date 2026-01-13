import { createMMKV, type MMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

let storage: MMKV | null = null;

try {
  storage = createMMKV({ id: 'athenaeum-storage' });
} catch {
}

export { storage };

export const mmkvStorage: StateStorage = {
  setItem: (key, value) => {
    storage?.set(key, value);
  },
  getItem: (key) => {
    return storage?.getString(key) ?? null;
  },
  removeItem: (key) => {
    storage?.remove(key);
  },
};
