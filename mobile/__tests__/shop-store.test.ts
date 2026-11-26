import { ApiError, ConnectionError, type StoreApi } from '../src/lib/api';
import { ShopStore, type SessionStorage } from '../src/state/shop-store';
import type { Cart, Order, Product, Session, ShippingAddress } from '../src/types';

const product: Product = {
  _id: 'p1', name: 'Tai nghe', price: 150000, stock: 5, category: 'Điện tử', description: 'Mô tả', images: [],
};
const session: Session = { token: 'token-a', user: { id: 'u1', name: 'Khách hàng', email: 'a@example.com', role: 'customer' } };
const address: ShippingAddress = { fullName: ' Nguyễn An ', phoneNumber: '090 123 4567', streetAddress: ' 12 Nguyễn Trãi ', city: ' TP.HCM ' };
const order: Order = { _id: 'o1', createdAt: new Date().toISOString(), status: 'pending', totalPrice: 300000, shippingAddress: address, orderItems: [{ name: product.name, price: product.price, quantity: 2 }] };

function setup(savedSession: Session | null = null) {
  let serverCart: Cart = { items: [] };
  const storage: jest.Mocked<SessionStorage> = {
    read: jest.fn(async () => savedSession), write: jest.fn<Promise<void>, [Session]>(async () => {}), clear: jest.fn(async () => {}),
  };
  const api: jest.Mocked<StoreApi> = {
    products: jest.fn(async () => [product]), product: jest.fn<Promise<Product>, [string]>(async () => product),
    login: jest.fn<Promise<Session>, [string, string]>(async () => session),
    cart: jest.fn<Promise<Cart>, [string]>(async () => structuredClone(serverCart)),
    saveCart: jest.fn(async (_token, items) => {
      if (items.some((item) => item.quantity > product.stock)) throw new ApiError('Không đủ tồn kho', 400);
      serverCart = { items: items.map((item) => ({ product, quantity: item.quantity })) };
      return structuredClone(serverCart);
    }),
    orders: jest.fn<Promise<Order[]>, [string]>(async () => [order]),
    addresses: jest.fn(async (_token: string) => []),
    saveAddress: jest.fn(async (_token, address, _id) => ({ ...address, _id: 'address-1' })),
    sellerDashboard: jest.fn(async (_token: string) => ({ shop: { name: 'Shop', location: 'HCM', owner: 'Seller' }, stats: { revenue: 0, orders: 0, products: 1, lowStock: 1 }, chart: [], products: [product], orders: [] })),
    saveSellerProduct: jest.fn(async (_token, _product, _id) => ({ product })),
    deleteSellerProduct: jest.fn(async (_token: string, _id: string) => ({})),
    updateSellerOrder: jest.fn(async (_token, _id, _status) => ({})),
    saveSellerProfile: jest.fn(async (_token: string, _name: string, _location: string) => ({})),
    uploadSellerImage: jest.fn(async (_token, _image) => ({ url: 'https://cdn.test/image.png', publicId: 'products/image' })),
    orderStatus: jest.fn(async (_token: string, _id: string) => ({ paymentStatus: 'unpaid', orderStatus: 'pending' })),
    startPayment: jest.fn(async (_token: string, _id: string) => ({ url: 'https://example.test/pay' })),
    checkout: jest.fn<Promise<Order>, [string, ShippingAddress]>(async () => { serverCart = { items: [] }; return order; }),
  };
  return { api, storage, store: new ShopStore(api, storage),
    setServerCart: (cart: Cart) => { serverCart = cart; } };
}

test('restores the session and server cart; initialize is safe to call twice', async () => {
  const { store, storage, api, setServerCart } = setup(session);
  setServerCart({ items: [{ product, quantity: 2 }] });
  await Promise.all([store.initialize(), store.initialize()]);
  expect(storage.read).toHaveBeenCalledTimes(1);
  expect(api.cart).toHaveBeenCalledWith(session.token);
  expect(store.getSnapshot()).toMatchObject({ ready: true, cartLoaded: true, cart: [{ quantity: 2 }] });
});

test('saved delivery details are trimmed, sent with the current token and an old session response is discarded', async () => {
  const { store, api } = setup(session);
  await store.initialize();
  await store.saveDefaultAddress({ ...address, label: ' Nhà riêng ', state: ' HCM ', isDefault: false }, 'a1');
  expect(api.saveAddress).toHaveBeenCalledWith(session.token, expect.objectContaining({ fullName: 'Nguyễn An', phoneNumber: '0901234567', state: 'HCM', city: 'TP.HCM', streetAddress: '12 Nguyễn Trãi', isDefault: true }), 'a1');
  let resolve!: (value: []) => void;
  api.addresses.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const pending = store.addresses();
  const rejected = expect(pending).rejects.toThrow('Phiên đăng nhập đã thay đổi');
  await store.logout(); resolve([]);
  await rejected;
  expect(store.getSnapshot().session).toBeNull();
});

test('wrong password does not save a session or load private cart data', async () => {
  const { store, storage, api } = setup();
  await store.initialize();
  api.login.mockRejectedValueOnce(new ApiError('Sai mật khẩu', 401));
  await expect(store.login('a@example.com', 'wrong')).rejects.toThrow('Sai mật khẩu');
  expect(storage.write).not.toHaveBeenCalled();
  expect(api.cart).not.toHaveBeenCalled();
  expect(store.getSnapshot().session).toBeNull();
});

test('uses the website customer account and encrypted session adapter on login/logout', async () => {
  const { store, storage } = setup();
  await store.initialize();
  await store.login('a@example.com', 'password');
  expect(storage.write).toHaveBeenCalledWith(session);
  await store.changeQuantity(product._id, 1);
  await store.logout();
  expect(storage.clear).toHaveBeenCalledTimes(1);
  expect(store.getSnapshot()).toMatchObject({ session: null, cart: [] });
});

test('seller sessions enter their own workspace without loading a customer cart; admins remain on web', async () => {
  const { store, api, storage } = setup();
  await store.initialize();
  api.login.mockResolvedValueOnce({ ...session, user: { ...session.user, role: 'seller' } });
  await store.login('seller@example.com', 'password');
  expect(store.getSnapshot().session?.user.role).toBe('seller');
  expect(api.cart).not.toHaveBeenCalled();
  await store.sellerDashboard();
  expect(api.sellerDashboard).toHaveBeenCalledWith(session.token);
  await expect(store.changeQuantity('p1', 1)).rejects.toThrow('khách mua hàng');
  await store.logout();
  api.login.mockResolvedValueOnce({ ...session, user: { ...session.user, role: 'admin' } });
  await expect(store.login('admin@example.com', 'password')).rejects.toThrow('quản trị');
  expect(storage.write).toHaveBeenCalledTimes(1);
});

test('re-reads the server cart before updates, preserving changes made on the web', async () => {
  const { store, api, setServerCart } = setup(session);
  await store.initialize();
  setServerCart({ items: [{ product, quantity: 2 }] });
  await store.changeQuantity(product._id, 1);
  expect(api.saveCart).toHaveBeenLastCalledWith(session.token, [{ productId: 'p1', quantity: 3 }]);
  expect(store.getSnapshot().cart[0].quantity).toBe(3);
  await store.changeQuantity(product._id, -1);
  expect(store.getSnapshot().cart[0].quantity).toBe(2);
  await store.changeQuantity(product._id, 'remove');
  expect(store.getSnapshot().cart).toEqual([]);
});

test('stock validation failure preserves the last confirmed cart and releases the busy lock', async () => {
  const { store, setServerCart } = setup(session);
  setServerCart({ items: [{ product, quantity: 5 }] });
  await store.initialize();
  await expect(store.changeQuantity(product._id, 1)).rejects.toThrow('Không đủ tồn kho');
  expect(store.getSnapshot()).toMatchObject({ cartBusy: false, cart: [{ quantity: 5 }], cartError: 'Không đủ tồn kho' });
});

test('401 clears the session and private cart, including if storage deletion fails', async () => {
  const { store, api, storage, setServerCart } = setup(session);
  setServerCart({ items: [{ product, quantity: 1 }] });
  await store.initialize();
  storage.clear.mockRejectedValueOnce(new Error('Storage unavailable'));
  api.orders.mockRejectedValueOnce(new ApiError('Hết phiên', 401));
  await expect(store.orders()).rejects.toThrow('Hết phiên');
  expect(store.getSnapshot()).toMatchObject({ session: null, cart: [], sessionMessage: 'Hết phiên' });
});

test('does not clear a saved session on a transient connection failure', async () => {
  const { store, api, storage } = setup(session);
  api.cart.mockRejectedValueOnce(new ConnectionError());
  await store.initialize();
  expect(store.getSnapshot()).toMatchObject({ session, ready: true, cartLoaded: false, cartBusy: false });
  expect(storage.clear).not.toHaveBeenCalled();
  await store.refreshCart();
  expect(store.getSnapshot().cartLoaded).toBe(true);
});

test('invalid address and empty cart cannot create an order', async () => {
  const { store, api } = setup(session);
  await store.initialize();
  await expect(store.checkout({ ...address, phoneNumber: 'abc' })).rejects.toThrow('điện thoại');
  await expect(store.checkout(address)).rejects.toThrow('trống');
  expect(api.checkout).not.toHaveBeenCalled();
  expect(store.getSnapshot().cartBusy).toBe(false);
});

test('successful checkout sends only normalized shipping data, then clears the cart', async () => {
  const { store, api, setServerCart } = setup(session);
  setServerCart({ items: [{ product, quantity: 2 }] });
  await store.initialize();
  await expect(store.checkout(address)).resolves.toEqual(order);
  expect(api.checkout).toHaveBeenCalledWith(session.token, {
    fullName: 'Nguyễn An', phoneNumber: '0901234567', streetAddress: '12 Nguyễn Trãi', city: 'TP.HCM',
  });
  expect(store.getSnapshot()).toMatchObject({ cart: [], cartLoaded: true, cartBusy: false });
  expect(api.saveCart).not.toHaveBeenCalled();
});

test('double taps cannot create concurrent cart writes or duplicate orders', async () => {
  const { store, api, setServerCart } = setup(session);
  setServerCart({ items: [{ product, quantity: 1 }] });
  await store.initialize();
  let resolveOrder!: (value: Order) => void;
  api.checkout.mockImplementationOnce(() => new Promise((resolve) => { resolveOrder = resolve; }));
  const first = store.checkout(address);
  await expect(store.checkout(address)).rejects.toThrow('chờ');
  await expect(store.changeQuantity('p1', 1)).rejects.toThrow('chờ');
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(api.checkout).toHaveBeenCalledTimes(1);
  resolveOrder(order);
  await first;
});

test('a network error during checkout never auto-retries POST or clears the confirmed cart', async () => {
  const { store, api, setServerCart } = setup(session);
  setServerCart({ items: [{ product, quantity: 1 }] });
  await store.initialize();
  api.checkout.mockRejectedValueOnce(new ConnectionError());
  await expect(store.checkout(address)).rejects.toBeInstanceOf(ConnectionError);
  expect(api.checkout).toHaveBeenCalledTimes(1);
  expect(store.getSnapshot()).toMatchObject({ cartBusy: false, cart: [{ quantity: 1 }] });
});
