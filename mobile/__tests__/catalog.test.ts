import { categoryDefinitions, categoryTree, emptyFilters, filterCatalog, homeShelves, inCategory, paginate } from '../src/lib/catalog';
import type { Product } from '../src/types';

const products: Product[] = Array.from({ length: 137 }, (_, i) => ({ _id: `p${i}`, name: `Điện thoại ${i}`, category: 'Điện thoại', categorySlug: 'dien-thoai', description: 'Sản phẩm', images: [], stock: i % 3, price: 100000 + i, originalPrice: 200000, brand: 'Apple', os: i % 2 ? 'ios' : 'android', salesLast7Days: i % 5 }));

test('mobile shares the web taxonomy and a primary category never expands from tags', () => {
  expect(categoryDefinitions).toHaveLength(50);
  expect(categoryTree(products)[0]).toMatchObject({ slug: 'cong-nghe', count: 137, children: [{ slug: 'dien-thoai' }] });
  expect(inCategory({ ...products[0], tags: ['thoi-trang'] }, 'thoi-trang')).toBe(false);
  expect(filterCatalog(products, { ...emptyFilters, category: 'dien-thoai', query: 'DIEN THOAI', os: 'ios', stock: true }).every(p => p.os === 'ios' && p.stock > 0)).toBe(true);
});

test('home shelves are bounded and all products remain accessible through finite pages', () => {
  const shelves = homeShelves(products);
  expect(shelves.length).toBeLessThanOrEqual(6);
  expect(shelves.every(shelf => shelf.products.length <= 6)).toBe(true);
  const found = Array.from({ length: paginate(products, 1).pages }, (_, i) => paginate(products, i + 1).items).flat();
  expect(found).toEqual(products);
  expect(paginate(products, 99)).toMatchObject({ page: 12, pages: 12, total: 137, items: products.slice(132) });
  expect(paginate([], 2)).toMatchObject({ page: 1, pages: 1, items: [] });
});

test('see all preserves weekly and discount collection membership', () => {
  expect(filterCatalog(products, { ...emptyFilters, collection: 'weekly' }).every(p => p.salesLast7Days! > 0)).toBe(true);
  expect(filterCatalog([{ ...products[0], originalPrice: products[0].price }, products[1]], { ...emptyFilters, collection: 'discounts' })).toEqual([products[1]]);
});
