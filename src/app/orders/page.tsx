"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, money } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await api.orders());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirm(id: number) {
    try {
      await api.confirmOrder(id);
      setMessage(`Order #${id} confirmed — stock updated`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed");
    }
  }

  async function cancel(id: number) {
    try {
      await api.cancelOrder(id);
      setMessage(`Order #${id} cancelled`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-mist">Purchases & sales</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Orders
          </h1>
        </div>
        <Button nativeButton={false} render={<Link href="/orders/new" />}>
          <Plus className="size-3.5" />
          New order
        </Button>
      </div>

      {message ? (
        <p className="mb-3 rounded-lg border border-signal/30 bg-signal/10 px-3 py-2 text-sm text-signal">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Counterparty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-mist">
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell className="capitalize">{o.order_type}</TableCell>
                  <TableCell>
                    <div>{o.counterparty}</div>
                    <div className="text-xs text-mist">
                      {o.lines.length} line{o.lines.length === 1 ? "" : "s"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right">{money(o.total)}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    {o.status === "draft" ? (
                      <>
                        <Button size="sm" onClick={() => void confirm(o.id)}>
                          Confirm
                        </Button>
                        {user?.role === "owner" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void cancel(o.id)}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-xs text-mist">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  if (status === "confirmed") return <Badge className="bg-signal/20 text-signal">Confirmed</Badge>;
  if (status === "cancelled") return <Badge variant="secondary">Cancelled</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}
