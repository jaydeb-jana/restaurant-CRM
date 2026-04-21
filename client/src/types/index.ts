export type UserRole = "admin" | "manager" | "employee" | "user";

export interface Customer {
  id: string; // The uid
  name: string;
  phone: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  image: string;
  isAvailable: boolean;
  isPopular: boolean;
}

export type OrderStatus = "pending" | "accepted" | "rejected" | "preparing" | "ready" | "served" | "completed" | "cancelled";

export interface Order {
  id: string;
  tableId: string;
  userId?: string;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: OrderStatus;
  paymentStatus: "pending" | "paid" | "failed";
  createdAt: string;
}

export interface Table {
  id: string;
  number: string;
  zone?: string;
  status: "available" | "occupied" | "reserved";
}

export interface GlobalSettings {
  isOpen: boolean;
  whatsappConnected: boolean;
}
