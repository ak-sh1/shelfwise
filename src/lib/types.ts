export type UserRole = "owner" | "staff";
export type OrderType = "purchase" | "sale";
export type OrderStatus = "draft" | "confirmed" | "cancelled";
export type MovementType = "adjust" | "purchase" | "sale";

export type User = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  shop_id: number;
  shop_name: string;
};

export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unit_cost: string;
  unit_price: string;
  quantity_on_hand: number;
  reorder_level: number;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderLine = {
  id: number;
  product_id: number;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
};

export type Order = {
  id: number;
  order_type: OrderType;
  status: OrderStatus;
  counterparty: string;
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  lines: OrderLine[];
  total: string;
};

export type DashboardStats = {
  product_count: number;
  low_stock_count: number;
  inventory_value: string;
  open_orders: number;
  sales_this_month: string;
  purchases_this_month: string;
};

export type StockMovement = {
  id: number;
  product_id: number;
  product_sku: string;
  product_name: string;
  movement_type: MovementType;
  quantity_delta: number;
  note: string | null;
  order_id: number | null;
  created_by_name: string | null;
  created_at: string;
};

export type ActivityItem = {
  id: number;
  kind: "movement";
  summary: string;
  detail: string | null;
  created_at: string;
  product_id: number | null;
  order_id: number | null;
};
