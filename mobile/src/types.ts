export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  categorySlug?: string;
  tags?: string[];
  gender?: string;
  os?: string;
  originalPrice?: number;
  averageRating?: number;
  totalReviews?: number;
  sold?: number;
  salesLast7Days?: number;
  createdAt?: string;
  isPinned?: boolean;
  brand?: string;
  sellerName?: string;
  sellerId?: string;
  images: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface CartItem {
  product: Product | null;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
}

export interface ShippingAddress {
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  state?: string;
  zipCode?: string;
}

export interface SavedAddress extends ShippingAddress {
  _id: string;
  label: string;
  state: string;
  isDefault: boolean;
}
export type AddressInput = Omit<SavedAddress, '_id'>;

export type PaymentMethod = 'cod' | 'vnpay';

export interface Order {
  paymentMethod?: PaymentMethod;
  paymentChannel?: string;
  orderStatus?: string;
  paymentStatus?: string;
  expiresAt?: string;
  paymentResult?: { status?: string };
  sellerTotal?: number;
  _id: string;
  createdAt: string;
  status: string;
  totalPrice: number;
  shippingAddress: ShippingAddress;
  orderItems: {
    _id?: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    sellerStatus?: string;
  }[];
}

export interface UploadedImage { url: string; publicId: string }
export interface LocalImage { uri: string; name: string; type: string }
export interface SellerProductInput {
  name: string; description: string; category: string; tags: string;
  brand: string; gender: string; os: string; price: number; stock: number; image?: UploadedImage;
}
export interface SellerDashboard {
  shop: { name: string; location: string; owner: string };
  stats: { revenue: number; orders: number; products: number; lowStock: number };
  chart: { label: string; revenue: number }[];
  products: Product[];
  orders: Order[];
}
