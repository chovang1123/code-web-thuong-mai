import { ApiError, ConnectionError, createApi } from '../src/lib/api';

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

test('public catalog requests do not send credentials or bearer tokens', async () => {
  const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>(async () => response([]));
  const api = createApi('http://10.0.2.2:3000/api/', fetcher);
  await api.products();
  expect(fetcher).toHaveBeenCalledWith('http://10.0.2.2:3000/api/products', expect.objectContaining({
    method: 'GET', headers: { Accept: 'application/json' },
  }));
});

test('login normalizes email but preserves the exact password', async () => {
  const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>(async () => response({ token: 'token', user: {} }));
  const api = createApi('http://server/api', fetcher);
  await api.login(' A@Example.COM ', ' pass word ');
  expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({ email: 'a@example.com', password: ' pass word ' });
});

test('cart PUT uses the existing backend payload and bearer auth', async () => {
  const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>(async () => response({ cart: { items: [] } }));
  const api = createApi('http://server/api', fetcher);
  await api.saveCart('secret', [{ productId: 'p1', quantity: 2 }]);
  expect(fetcher).toHaveBeenCalledWith('http://server/api/cart/web', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ items: [{ productId: 'p1', quantity: 2 }] }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer secret' },
  }));
});

test('seller photo sends multipart bytes to the backend without a JSON content type', async () => {
  const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>(async () => response({ url: 'https://cdn.test/photo.png', publicId: 'products/photo' }));
  await createApi('http://server/api', fetcher).uploadSellerImage('seller-token', { uri: 'file:///phone/photo.png', name: 'photo.png', type: 'image/png' });
  expect(fetcher).toHaveBeenCalledWith('http://server/api/seller/uploads', expect.objectContaining({ method: 'POST', body: expect.any(FormData), headers: { Accept: 'application/json', Authorization: 'Bearer seller-token' } }));
});

test('saved delivery addresses use the authenticated web address API for both reading and updating', async () => {
  const address = { label: 'Nhà riêng', fullName: 'An', phoneNumber: '0912345678', streetAddress: '12 ABC', state: 'TP.HCM', city: 'Quận 1', isDefault: true };
  const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>()
    .mockResolvedValueOnce(response({ addresses: [{ ...address, _id: 'a1' }] }))
    .mockResolvedValueOnce(response({ address: { ...address, _id: 'a1' } }));
  const api = createApi('http://server/api', fetcher);
  expect(await api.addresses('token')).toEqual([{ ...address, _id: 'a1' }]);
  await api.saveAddress('token', address, 'a1');
  expect(fetcher).toHaveBeenLastCalledWith('http://server/api/auth/addresses/a1', expect.objectContaining({ method: 'PUT', body: JSON.stringify(address), headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer token' } }));
});

test('surfaces stock errors from the server and translates an expired session', async () => {
  const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>()
    .mockResolvedValueOnce(response({ error: 'Insufficient stock' }, 400))
    .mockResolvedValueOnce(response({ message: 'Expired' }, 401));
  const api = createApi('http://server/api', fetcher);
  await expect(api.saveCart('token', [])).rejects.toThrow('Insufficient stock');
  await expect(api.orders('token')).rejects.toMatchObject({ status: 401, message: expect.stringContaining('hết hạn') });
});

test('network errors and invalid JSON are handled without leaking low-level exceptions', async () => {
  const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>()
    .mockRejectedValueOnce(new TypeError('fetch failed'))
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new Error('Invalid JSON'); } } as unknown as Response);
  const api = createApi('http://server/api', fetcher);
  await expect(api.products()).rejects.toBeInstanceOf(ConnectionError);
  await expect(api.products()).rejects.toBeInstanceOf(ApiError);
});

test('a stalled request is aborted after the timeout', async () => {
  jest.useFakeTimers();
  try {
    const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const promise = createApi('http://server/api', fetcher).products();
    const expectation = expect(promise).rejects.toBeInstanceOf(ConnectionError);
    await jest.advanceTimersByTimeAsync(15000);
    await expectation;
  } finally { jest.useRealTimers(); }
});
