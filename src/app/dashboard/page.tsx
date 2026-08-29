"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Package, ShoppingCart, Warehouse } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, formatWhen, money } from "@/lib/api";
import type { ActivityItem, DashboardStats, Product } from "@/lib/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.dashboard(), api.lowStock(), api.activity()])
      .then(([s, low, act]) => {
        setStats(s);
        setLowStock(low);
        setActivity(act);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-mist">Overview</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/products" />}
          >
            Manage products
          </Button>
          <Button nativeButton={false} render={<Link href="/orders/new" />}>
            New order
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="SKUs"
          value={loading || !stats ? "—" : String(stats.product_count)}
          icon={Package}
          hint="Active products"
        />
        <StatCard
          title="Low stock"
          value={loading || !stats ? "—" : String(stats.low_stock_count)}
          icon={AlertTriangle}
          hint="At or below reorder"
          warn={!!stats && stats.low_stock_count > 0}
        />
        <StatCard
          title="Inventory value"
          value={loading || !stats ? "—" : money(stats.inventory_value)}
          icon={Warehouse}
          hint="At unit cost"
        />
        <StatCard
          title="Open drafts"
          value={loading || !stats ? "—" : String(stats.open_orders)}
          icon={ShoppingCart}
          hint="Orders awaiting confirm"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
            <CardDescription>Confirmed order totals</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/70 bg-background/40 p-4">
              <p className="text-xs text-mist">Sales</p>
              <p className="mt-1 font-display text-2xl font-semibold text-signal">
                {loading || !stats ? "—" : money(stats.sales_this_month)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/40 p-4">
              <p className="text-xs text-mist">Purchases</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {loading || !stats ? "—" : money(stats.purchases_this_month)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low stock alerts</CardTitle>
            <CardDescription>Reorder before you sell out</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-mist">Loading alerts…</p>
            ) : lowStock.length === 0 ? (
              <p className="text-sm text-mist">
                All products above reorder level.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">
                          {p.quantity_on_hand} / {p.reorder_level}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Stock movements across the shop</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-mist">Loading activity…</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-mist">
              No movements yet. Adjust stock or confirm an order to see history.
            </p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-2 border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{item.summary}</p>
                    {item.detail ? (
                      <p className="text-xs text-mist">{item.detail}</p>
                    ) : null}
                  </div>
                  <time className="text-xs text-mist whitespace-nowrap">
                    {formatWhen(item.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  warn,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  warn?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-mist">{title}</CardTitle>
        <Icon className={`size-4 ${warn ? "text-destructive" : "text-signal"}`} />
      </CardHeader>
      <CardContent>
        <div className="font-display text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-mist">{hint}</p>
      </CardContent>
    </Card>
  );
}
