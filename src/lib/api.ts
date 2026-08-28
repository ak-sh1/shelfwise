import type {
  DashboardStats,
  Order,
  OrderType,
  Product,
  User,
} from "@/lib/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8331";

const TOKEN_KEY = "shelfwise_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.detail
        ? typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail)
        : message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false
    ),
  me: () => request<User>("/auth/me"),
  dashboard: () => request<DashboardStats>("/dashboard"),
  lowStock: () => request<Product[]>("/dashboard/low-stock"),
  products: (params?: { q?: string; low_stock?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.low_stock) sp.set("low_stock", "true");
    const qs = sp.toString();
    return request<Product[]>(`/products${qs ? `?${qs}` : ""}`);
  },
  createProduct: (body: Record<string, unknown>) =>
    request<Product>("/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: number, body: Record<string, unknown>) =>
    request<Product>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  adjustStock: (id: number, quantity_delta: number, note?: string) =>
    request<Product>(`/products/${id}/adjust`, {
      method: "POST",
      body: JSON.stringify({ quantity_delta, note }),
    }),
  importCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ created: number; updated: number; errors: string[] }>(
      "/products/import-csv",
      { method: "POST", body: form }
    );
  },
  orders: () => request<Order[]>("/orders"),
  createOrder: (body: {
    order_type: OrderType;
    counterparty: string;
    notes?: string;
    lines: { product_id: number; quantity: number; unit_price?: string }[];
  }) => request<Order>("/orders", { method: "POST", body: JSON.stringify(body) }),
  confirmOrder: (id: number) =>
    request<Order>(`/orders/${id}/confirm`, { method: "POST" }),
  cancelOrder: (id: number) =>
    request<Order>(`/orders/${id}/cancel`, { method: "POST" }),
  categorize: (name: string, description?: string) =>
    request<{ category: string; source: string; detail: string | null }>(
      "/ai/categorize",
      { method: "POST", body: JSON.stringify({ name, description }) }
    ),
};

export function money(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(n) ? n : 0);
}
