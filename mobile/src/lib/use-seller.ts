import { useCallback } from 'react';
import { useShop } from '../state/shop';
import { useRemote } from './use-remote';

export function useSeller() {
  const { store, session } = useShop();
  const token = session?.token;
  const role = session?.user.role;
  const loader = useCallback(() => {
    if (!token || role !== 'seller') throw new Error('Đăng nhập tài khoản người bán');
    return store.sellerDashboard();
  }, [store, token, role]);
  return { ...useRemote(loader), store, session };
}
