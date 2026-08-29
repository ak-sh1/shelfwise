"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, formatWhen, money } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function OrdersPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pending, setPending] = useState<{
    id: number;
    action: "confirm" | "cancel";
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await api.orders());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.action === "confirm") {
        await api.confirmOrder(pending.id);
        push(`Order #${pending.id} confirmed — stock updated`);
      } else {
        await api.cancelOrder(pending.id);
        push(`Order #${pending.id} cancelled`, "info");
      }
      setPending(null);
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setBusy(false);
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

      {error ? (
        <p className="mb-3 rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>#</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Counterparty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-mist">
                  Loading orders…
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-mist">
                  No orders yet. Create a purchase or sale draft.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => {
                const open = expanded === o.id;
                return (
                  <Fragment key={o.id}>
                    <TableRow className={cn(open && "bg-accent/30")}>
                      <TableCell>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() =>
                            setExpanded((id) => (id === o.id ? null : o.id))
                          }
                          aria-label={open ? "Collapse" : "Expand"}
                        >
                          {open ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </Button>
                      </TableCell>
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
                      <TableCell className="text-xs text-mist">
                        {formatWhen(o.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {money(o.total)}
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        {o.status === "draft" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                setPending({ id: o.id, action: "confirm" })
                              }
                            >
                              Confirm
                            </Button>
                            {user?.role === "owner" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPending({ id: o.id, action: "cancel" })
                                }
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
                    {open ? (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-background/40">
                          <div className="space-y-2 px-2 py-2">
                            {o.notes ? (
                              <p className="text-xs text-mist">
                                Notes: {o.notes}
                              </p>
                            ) : null}
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Product</TableHead>
                                  <TableHead className="text-right">
                                    Qty
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Unit
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Line
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {o.lines.map((line) => (
                                  <TableRow key={line.id}>
                                    <TableCell className="font-mono text-xs">
                                      {line.product_sku}
                                    </TableCell>
                                    <TableCell>{line.product_name}</TableCell>
                                    <TableCell className="text-right">
                                      {line.quantity}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {money(line.unit_price)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {money(line.line_total)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.action === "confirm" ? "Confirm order?" : "Cancel draft?"}
            </DialogTitle>
            <DialogDescription>
              {pending?.action === "confirm"
                ? `Confirming order #${pending.id} will update on-hand stock for every line.`
                : `Cancel draft order #${pending?.id}. This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Back
            </Button>
            <Button
              variant={pending?.action === "cancel" ? "destructive" : "default"}
              disabled={busy}
              onClick={() => void runAction()}
            >
              {busy
                ? "Working…"
                : pending?.action === "confirm"
                  ? "Confirm & update stock"
                  : "Cancel order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  if (status === "confirmed")
    return <Badge className="bg-signal/20 text-signal">Confirmed</Badge>;
  if (status === "cancelled") return <Badge variant="secondary">Cancelled</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}
