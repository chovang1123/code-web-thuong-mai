import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createApi } from '../lib/api';
import { ShopStore, type SessionStorage } from './shop-store';
import type { Session } from '../types';

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || (
  Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api'
);
export const api = createApi(API_URL);
const SESSION_KEY = 'net-store-session-v1';

const storage: SessionStorage = {
  async read() {
    const value = await SecureStore.getItemAsync(SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as Session;
    if (!session.token || !session.user?.id || session.user.role !== 'customer') {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }
    return session;
  },
  write: (session) => SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session)),
  clear: () => SecureStore.deleteItemAsync(SESSION_KEY),
};

const ShopContext = createContext<ShopStore | null>(null);

export function ShopProvider({ children, store: providedStore }: { children: ReactNode; store?: ShopStore }) {
  const [store] = useState(() => providedStore ?? new ShopStore(api, storage));
  useEffect(() => { void store.initialize(); }, [store]);
  return <ShopContext.Provider value={store}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const store = useContext(ShopContext);
  if (!store) throw new Error('ShopProvider is missing.');
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...state, store };
}
