import type { Cart, Order, Product, Session, ShippingAddress } from '../types';

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
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetcher(`${base}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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
    checkout: async (token: string, shippingAddress: ShippingAddress) =>
      (await request<{ order: Order }>('/orders/web', token, 'POST', { shippingAddress })).order,
  };
}

export type StoreApi = ReturnType<typeof createApi>;
