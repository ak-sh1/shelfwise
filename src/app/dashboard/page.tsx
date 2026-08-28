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
import { api, money } from "@/lib/api";
import type { DashboardStats, Product } from "@/lib/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.dashboard(), api.lowStock()])
      .then(([s, low]) => {
        setStats(s);
        setLowStock(low);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
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
          value={stats ? String(stats.product_count) : "—"}
          icon={Package}
          hint="Active products"
        />
        <StatCard
          title="Low stock"
          value={stats ? String(stats.low_stock_count) : "—"}
          icon={AlertTriangle}
          hint="At or below reorder"
          warn={!!stats && stats.low_stock_count > 0}
        />
        <StatCard
          title="Inventory value"
          value={stats ? money(stats.inventory_value) : "—"}
          icon={Warehouse}
          hint="At unit cost"
        />
        <StatCard
          title="Open drafts"
          value={stats ? String(stats.open_orders) : "—"}
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
                {stats ? money(stats.sales_this_month) : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/40 p-4">
              <p className="text-xs text-mist">Purchases</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {stats ? money(stats.purchases_this_month) : "—"}
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
            {lowStock.length === 0 ? (
              <p className="text-sm text-mist">All products above reorder level.</p>
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
