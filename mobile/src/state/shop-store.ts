import { ApiError, errorMessage, type StoreApi } from '../lib/api';
import { validateAddress } from '../lib/format';
import type { CartItem, Session, ShippingAddress } from '../types';

export interface SessionStorage {
  read(): Promise<Session | null>;
  write(session: Session): Promise<void>;
  clear(): Promise<void>;
}

export interface ShopState {
  ready: boolean;
  session: Session | null;
  sessionMessage: string;
  cart: CartItem[];
  cartLoaded: boolean;
  cartBusy: boolean;
  cartError: string;
}

// All writes are serialized, since PUT /cart/web replaces the complete server cart.
export class ShopStore {
  private state: ShopState = {
    ready: false, session: null, sessionMessage: '', cart: [],
    cartLoaded: false, cartBusy: false, cartError: '',
  };
  private listeners = new Set<() => void>();
  private generation = 0;
  private authBusy = false;
  private initTask?: Promise<void>;

  constructor(private api: StoreApi, private storage: SessionStorage) {}

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private update(patch: Partial<ShopState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private changeSession(session: Session | null, sessionMessage = '') {
    this.generation++;
    this.update({ session, sessionMessage, cart: [], cartLoaded: false, cartBusy: false, cartError: '' });
  }

  initialize = () => {
    this.initTask ??= (async () => {
      try {
        const session = await this.storage.read();
        this.changeSession(session);
      } catch {
        this.update({ sessionMessage: 'Không đọc được phiên đã lưu. Bạn có thể đăng nhập lại.' });
      } finally {
        this.update({ ready: true });
      }
      if (this.state.session) await this.refreshCart().catch(() => {});
    })();
    return this.initTask;
  };

  login = async (email: string, password: string) => {
    if (this.authBusy) return;
    this.authBusy = true;
    try {
      const session = await this.api.login(email, password);
      if (session.user.role !== 'customer') {
        throw new Error('Bản Android này dành cho khách mua hàng. Tài khoản người bán/quản trị dùng trên website.');
      }
      await this.storage.write(session);
      this.changeSession(session);
      await this.refreshCart().catch(() => {});
    } finally {
      this.authBusy = false;
    }
  };

  logout = async () => {
    if (this.state.cartBusy) throw new Error('Vui lòng chờ thao tác hiện tại hoàn tất.');
    await this.storage.clear();
    this.changeSession(null);
  };

  private async protectedRequest<T>(action: (token: string) => Promise<T>): Promise<T> {
    const session = this.state.session;
    if (!session) throw new Error('Vui lòng đăng nhập để tiếp tục.');
    const generation = this.generation;
    try {
      const result = await action(session.token);
      if (generation !== this.generation) throw new Error('Phiên đăng nhập đã thay đổi.');
      return result;
    } catch (error) {
      if (generation === this.generation && error instanceof ApiError && error.status === 401) {
        // Clear in-memory data immediately, even when encrypted storage is unavailable.
        this.changeSession(null, error.message);
        await this.storage.clear().catch(() => {});
      }
      throw error;
    }
  }

  refreshCart = async () => {
    if (!this.state.session || this.state.cartBusy) return;
    this.update({ cartBusy: true, cartError: '' });
    const generation = this.generation;
    try {
      const cart = await this.protectedRequest((token) => this.api.cart(token));
      this.update({ cart: cart.items, cartLoaded: true });
    } catch (error) {
      if (generation === this.generation) this.update({ cartError: errorMessage(error), cartLoaded: false });
      throw error;
    } finally {
      if (generation === this.generation) this.update({ cartBusy: false });
    }
  };

  changeQuantity = async (productId: string, delta: number | 'remove') => {
    if (this.state.cartBusy) throw new Error('Vui lòng chờ giỏ hàng cập nhật.');
    this.update({ cartBusy: true, cartError: '' });
    const generation = this.generation;
    try {
      const cart = await this.protectedRequest(async (token) => {
        // Re-read before replacing, so a cart loaded earlier does not erase web changes.
        const current = await this.api.cart(token);
        if (current.items.some((item) => !item.product)) {
          throw new Error('Giỏ có sản phẩm đã bị xóa. Hãy xóa sản phẩm đó trên website rồi tải lại.');
        }
        const items = current.items.map((item) => ({ productId: item.product!._id, quantity: item.quantity }));
        const index = items.findIndex((item) => item.productId === productId);
        const quantity = delta === 'remove' ? 0 : (items[index]?.quantity ?? 0) + delta;
        if (index >= 0) items.splice(index, 1);
        if (quantity > 0) items.push({ productId, quantity });
        return this.api.saveCart(token, items);
      });
      this.update({ cart: cart.items, cartLoaded: true });
    } catch (error) {
      if (generation === this.generation) this.update({ cartError: errorMessage(error) });
      throw error;
    } finally {
      if (generation === this.generation) this.update({ cartBusy: false });
    }
  };

  orders = () => this.protectedRequest((token) => this.api.orders(token));

  checkout = async (address: ShippingAddress) => {
    const validation = validateAddress(address);
    if (validation) throw new Error(validation);
    if (this.state.cartBusy) throw new Error('Vui lòng chờ thao tác hiện tại hoàn tất.');
    this.update({ cartBusy: true, cartError: '' });
    const generation = this.generation;
    try {
      const order = await this.protectedRequest(async (token) => {
        const cart = await this.api.cart(token);
        if (!cart.items.length) throw new Error('Giỏ hàng đang trống. Hãy tải lại giỏ hàng.');
        if (cart.items.some((item) => !item.product)) throw new Error('Giỏ có sản phẩm không còn bán. Hãy kiểm tra lại trên website.');
        return this.api.checkout(token, {
          fullName: address.fullName.trim(), streetAddress: address.streetAddress.trim(),
          city: address.city.trim(), phoneNumber: address.phoneNumber.replace(/[\s.-]/g, ''),
        });
      });
      this.update({ cart: [], cartLoaded: true });
      return order;
    } finally {
      if (generation === this.generation) this.update({ cartBusy: false });
    }
  };
}
