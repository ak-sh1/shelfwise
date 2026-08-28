"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, Search, Sparkles, Upload } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api, money } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Product } from "@/lib/types";

const emptyForm = {
  sku: "",
  name: "",
  description: "",
  category: "Uncategorized",
  unit_cost: "0",
  unit_price: "0",
  quantity_on_hand: "0",
  reorder_level: "5",
};

export default function ProductsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [delta, setDelta] = useState("0");
  const [note, setNote] = useState("");
  const [categorizeInfo, setCategorizeInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.products({ q: q || undefined });
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  async function createProduct(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createProduct({
        sku: form.sku,
        name: form.name,
        description: form.description || null,
        category: form.category,
        unit_cost: form.unit_cost,
        unit_price: form.unit_price,
        quantity_on_hand: Number(form.quantity_on_hand),
        reorder_level: Number(form.reorder_level),
      });
      setOpen(false);
      setForm(emptyForm);
      setMessage("Product created");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function suggestCategory() {
    try {
      const res = await api.categorize(form.name, form.description || undefined);
      setForm((f) => ({ ...f, category: res.category }));
      setCategorizeInfo(
        res.source === "ai"
          ? "Suggested by AI"
          : res.detail || "Suggested by local rules"
      );
    } catch (err) {
      setCategorizeInfo(err instanceof Error ? err.message : "Suggest failed");
    }
  }

  async function adjustStock(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      await api.adjustStock(selected.id, Number(delta), note || undefined);
      setAdjustOpen(false);
      setDelta("0");
      setNote("");
      setMessage("Stock adjusted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjust failed");
    }
  }

  async function onImport(file: File | null) {
    if (!file) return;
    try {
      const res = await api.importCsv(file);
      setMessage(
        `CSV import: ${res.created} created, ${res.updated} updated` +
          (res.errors.length ? ` (${res.errors.length} row errors)` : "")
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-mist">Catalog</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Products
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwner ? (
            <>
              <label className="inline-flex">
                <Button variant="outline" render={<span />}>
                  <Upload className="size-3.5" />
                  Import CSV
                </Button>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => void onImport(e.target.files?.[0] ?? null)}
                />
              </label>
              <Button
                onClick={() => {
                  setForm(emptyForm);
                  setCategorizeInfo(null);
                  setOpen(true);
                }}
              >
                <Plus className="size-3.5" />
                Add product
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-mist" />
          <Input
            className="pl-9"
            placeholder="Search SKU, name, category…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
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
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-mist">
                  No products yet. {isOwner ? "Add one or import a CSV." : ""}
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.description ? (
                      <div className="max-w-xs truncate text-xs text-mist">
                        {p.description}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell className="text-right">{money(p.unit_cost)}</TableCell>
                  <TableCell className="text-right">{money(p.unit_price)}</TableCell>
                  <TableCell className="text-right">
                    {p.is_low_stock ? (
                      <Badge variant="destructive">{p.quantity_on_hand}</Badge>
                    ) : (
                      p.quantity_on_hand
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelected(p);
                        setDelta("0");
                        setNote("");
                        setAdjustOpen(true);
                      }}
                    >
                      Adjust
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
            <DialogDescription>
              Owners can create SKUs. Optional AI/heuristic category suggest.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createProduct} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <div className="flex gap-2">
                  <Input
                    id="category"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void suggestCategory()}
                    title="Suggest category"
                  >
                    <Sparkles className="size-4" />
                  </Button>
                </div>
                {categorizeInfo ? (
                  <p className="text-xs text-mist">{categorizeInfo}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unit_cost">Unit cost</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  value={form.unit_cost}
                  onChange={(e) =>
                    setForm({ ...form, unit_cost: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit_price">Unit price</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) =>
                    setForm({ ...form, unit_price: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qty">Starting qty</Label>
                <Input
                  id="qty"
                  type="number"
                  value={form.quantity_on_hand}
                  onChange={(e) =>
                    setForm({ ...form, quantity_on_hand: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reorder">Reorder level</Label>
                <Input
                  id="reorder"
                  type="number"
                  value={form.reorder_level}
                  onChange={(e) =>
                    setForm({ ...form, reorder_level: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create product</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.sku} · on hand ${selected.quantity_on_hand}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={adjustStock} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="delta">Quantity delta (+/-)</Label>
              <Input
                id="delta"
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Cycle count, damage, etc."
              />
            </div>
            <DialogFooter>
              <Button type="submit">Save adjustment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
