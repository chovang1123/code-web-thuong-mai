import type { AddressInput, SavedAddress, Cart, LocalImage, Order, PaymentMethod, Product, SellerDashboard, SellerProductInput, Session, ShippingAddress, UploadedImage } from '../types';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ConnectionError extends Error {
  constructor() {
    super('Không kết nối được máy chủ. Kiểm tra backend, địa chỉ API và kết nối mạng.');
    this.name = 'ConnectionError';
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
}

export function createApi(baseUrl: string, fetcher: (url: string, init?: RequestInit) => Promise<Response> = fetch) {
  const base = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, token?: string, method = 'GET', body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), path.includes('/uploads') || path.startsWith('/payments/') ? 40000 : 15000);
    const multipart = body instanceof FormData;
    try {
      const response = await fetcher(`${base}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: multipart ? body : JSON.stringify(body) } : {}),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = response.status === 401
          ? (path === '/auth/login' ? 'Email hoặc mật khẩu không đúng.' : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
          : data?.message || data?.error || `Máy chủ trả về lỗi ${response.status}.`;
        throw new ApiError(message, response.status);
      }
      if (data === null) throw new ApiError('Phản hồi API không hợp lệ.', response.status);
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ConnectionError();
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    products: () => request<Product[]>('/products'),
    product: (id: string) => request<Product>(`/products/${encodeURIComponent(id)}`),
    login: (email: string, password: string) => request<Session>('/auth/login', undefined, 'POST', {
      email: email.trim().toLowerCase(), password,
    }),
    cart: async (token: string) => (await request<{ cart: Cart }>('/cart/web', token)).cart,
    saveCart: async (token: string, items: { productId: string; quantity: number }[]) =>
      (await request<{ cart: Cart }>('/cart/web', token, 'PUT', { items })).cart,
    orders: async (token: string) => (await request<{ orders: Order[] }>('/orders/web', token)).orders,
    addresses: async (token: string) => (await request<{ addresses: SavedAddress[] }>('/auth/addresses', token)).addresses,
    saveAddress: async (token: string, address: AddressInput, id?: string) => (await request<{ address: SavedAddress }>(`/auth/addresses${id ? `/${encodeURIComponent(id)}` : ''}`, token, id ? 'PUT' : 'POST', address)).address,
    sellerDashboard: (token: string) => request<SellerDashboard>('/seller/dashboard', token),
    saveSellerProduct: (token: string, product: SellerProductInput, id?: string) => request<{ product: Product }>(`/seller/products${id ? `/${encodeURIComponent(id)}` : ''}`, token, id ? 'PUT' : 'POST', product),
    deleteSellerProduct: (token: string, id: string) => request(`/seller/products/${encodeURIComponent(id)}`, token, 'DELETE'),
    updateSellerOrder: (token: string, id: string, status: 'shipped' | 'delivered') => request(`/seller/orders/${encodeURIComponent(id)}/status`, token, 'PATCH', { status }),
    saveSellerProfile: (token: string, shopName: string, shopLocation: string) => request('/seller/profile', token, 'PUT', { shopName, shopLocation }),
    uploadSellerImage: (token: string, image: LocalImage) => {
      const form = new FormData();
      form.append('image', image as unknown as Blob);
      return request<UploadedImage>('/seller/uploads', token, 'POST', form);
    },
    orderStatus: (token: string, id: string) => request<Pick<Order, 'paymentStatus' | 'orderStatus' | 'paymentMethod' | 'expiresAt'>>(`/orders/${encodeURIComponent(id)}/status`, token),
    startPayment: (token: string, id: string, appReturnUrl?: string) => request<{ url: string }>('/vnpay/create', token, 'POST', { orderId: id, ...(appReturnUrl ? { appReturnUrl } : {}) }),
    checkout: async (token: string, shippingAddress: ShippingAddress, paymentMethod?: PaymentMethod, expectedTotal?: number, bankCode?: string) =>
      (await request<{ order: Order }>('/orders/web', token, 'POST', { shippingAddress, paymentMethod, expectedTotal, bankCode })).order,
  };
}

export type StoreApi = ReturnType<typeof createApi>;
