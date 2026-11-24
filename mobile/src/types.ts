export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  brand?: string;
  sellerName?: string;
  images: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
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
}

export type PaymentMethod = 'cod' | 'vnpay';

export interface Order {
  paymentMethod?: PaymentMethod;
  paymentChannel?: string;
  orderStatus?: string;
  paymentStatus?: string;
  expiresAt?: string;
  paymentResult?: { status?: string };
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
  }[];
}
