"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, money } from "@/lib/api";
import type { OrderType, Product } from "@/lib/types";

type LineDraft = {
  key: string;
  product_id: string;
  quantity: string;
};

export default function NewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("sale");
  const [counterparty, setCounterparty] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([
    { key: "1", product_id: "", quantity: "1" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .products()
      .then(setProducts)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load products")
      );
  }, []);

  const productMap = useMemo(
    () => new Map(products.map((p) => [String(p.id), p])),
    [products]
  );

  const estimated = useMemo(() => {
    return lines.reduce((sum, line) => {
      const p = productMap.get(line.product_id);
      if (!p) return sum;
      const qty = Number(line.quantity) || 0;
      const unit = Number(orderType === "purchase" ? p.unit_cost : p.unit_price);
      return sum + qty * unit;
    }, 0);
  }, [lines, productMap, orderType]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        order_type: orderType,
        counterparty,
        notes: notes || undefined,
        lines: lines
          .filter((l) => l.product_id)
          .map((l) => ({
            product_id: Number(l.product_id),
            quantity: Number(l.quantity),
          })),
      };
      if (payload.lines.length === 0) {
        throw new Error("Add at least one product line");
      }
      const order = await api.createOrder(payload);
      router.push("/orders");
      // keep message via query would be nice; list will show the draft
      void order;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-mist">
            <Link href="/orders" className="hover:text-foreground">
              Orders
            </Link>{" "}
            / New
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Create order
          </h1>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="max-w-3xl space-y-6 rounded-2xl border border-border bg-card/60 p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Order type</Label>
            <Select
              value={orderType}
              onValueChange={(v) => setOrderType(v as OrderType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">Sale (decreases stock)</SelectItem>
                <SelectItem value="purchase">Purchase (increases stock)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="counterparty">
              {orderType === "sale" ? "Customer" : "Supplier"}
            </Label>
            <Input
              id="counterparty"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              required
              placeholder={
                orderType === "sale" ? "Walk-in / Cafe North" : "Paper Co."
              }
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Lines</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  { key: String(Date.now()), product_id: "", quantity: "1" },
                ])
              }
            >
              <Plus className="size-3.5" />
              Add line
            </Button>
          </div>
          {lines.map((line, idx) => (
            <div
              key={line.key}
              className="grid gap-3 rounded-xl border border-border/70 bg-background/40 p-3 sm:grid-cols-[1fr_120px_40px]"
            >
              <div className="space-y-1.5">
                <Label>Product</Label>
                <Select
                  value={line.product_id || undefined}
                  onValueChange={(v) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, product_id: v ?? "" } : l
                      )
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.sku} — {p.name} (qty {p.quantity_on_hand})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, quantity: e.target.value } : l
                      )
                    )
                  }
                  required
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-mist">
            Estimated total:{" "}
            <span className="font-medium text-foreground">{money(estimated)}</span>
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link href="/orders" />}
            >
              Back
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save as draft"}
            </Button>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <p className="text-xs text-mist">
          Confirming a draft applies stock changes. Sales fail if inventory is
          insufficient.
        </p>
      </form>
    </AppShell>
  );
}
