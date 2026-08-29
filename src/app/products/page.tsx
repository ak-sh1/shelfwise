"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { History, Pencil, Plus, Search, Sparkles, Upload } from "lucide-react";

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
import { api, formatWhen, money } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import type { Product, StockMovement } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const { push } = useToast();
  const isOwner = user?.role === "owner";
  const fileRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "",
    unit_cost: "0",
    unit_price: "0",
    reorder_level: "5",
  });
  const [delta, setDelta] = useState("0");
  const [note, setNote] = useState("");
  const [categorizeInfo, setCategorizeInfo] = useState<string | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.products({
        q: q || undefined,
        low_stock: lowOnly || undefined,
      });
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [q, lowOnly]);

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
      setCreateOpen(false);
      setForm(emptyForm);
      push("Product created");
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Create failed", "error");
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      await api.updateProduct(selected.id, {
        name: editForm.name,
        description: editForm.description || null,
        category: editForm.category,
        unit_cost: editForm.unit_cost,
        unit_price: editForm.unit_price,
        reorder_level: Number(editForm.reorder_level),
      });
      setEditOpen(false);
      push("Product updated");
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Update failed", "error");
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
      push("Stock adjusted");
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Adjust failed", "error");
    }
  }

  async function openHistory(product: Product) {
    setSelected(product);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      setMovements(await api.movements(product.id));
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not load history", "error");
      setMovements([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function onImport(file: File | null) {
    if (!file) return;
    try {
      const res = await api.importCsv(file);
      push(
        `CSV import: ${res.created} created, ${res.updated} updated` +
          (res.errors.length ? ` (${res.errors.length} row errors)` : "")
      );
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
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
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => void onImport(e.target.files?.[0] ?? null)}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="size-3.5" />
                Import CSV
              </Button>
              <Button
                onClick={() => {
                  setForm(emptyForm);
                  setCategorizeInfo(null);
                  setCreateOpen(true);
                }}
              >
                <Plus className="size-3.5" />
                Add product
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[16rem] max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-mist" />
          <Input
            className="pl-9"
            placeholder="Search SKU, name, category…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant={lowOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setLowOnly((v) => !v)}
        >
          Low stock only
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
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-mist">
                  Loading products…
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-mist">
                  {lowOnly
                    ? "No low-stock products."
                    : `No products yet. ${isOwner ? "Add one or import a CSV." : ""}`}
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
                  <TableCell className="text-right text-mist">
                    {p.reorder_level}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="History"
                        onClick={() => void openHistory(p)}
                      >
                        <History className="size-3.5" />
                      </Button>
                      {isOwner ? (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Edit"
                          onClick={() => {
                            setSelected(p);
                            setEditForm({
                              name: p.name,
                              description: p.description || "",
                              category: p.category,
                              unit_cost: String(p.unit_cost),
                              unit_price: String(p.unit_price),
                              reorder_level: String(p.reorder_level),
                            });
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      ) : null}
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
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
            <DialogDescription>
              Create a SKU. Optional category suggest uses AI or local rules.
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.sku} · stock stays unchanged here` : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-cost">Cost</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  step="0.01"
                  value={editForm.unit_cost}
                  onChange={(e) =>
                    setEditForm({ ...editForm, unit_cost: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-price">Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={editForm.unit_price}
                  onChange={(e) =>
                    setEditForm({ ...editForm, unit_price: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-reorder">Reorder</Label>
                <Input
                  id="edit-reorder"
                  type="number"
                  value={editForm.reorder_level}
                  onChange={(e) =>
                    setEditForm({ ...editForm, reorder_level: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save changes</Button>
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

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Stock history</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.sku} — ${selected.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <p className="text-sm text-mist">Loading movements…</p>
          ) : movements.length === 0 ? (
            <p className="text-sm text-mist">No movements recorded yet.</p>
          ) : (
            <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {movements.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize">
                      {m.movement_type}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-sm",
                        m.quantity_delta >= 0 ? "text-signal" : "text-destructive"
                      )}
                    >
                      {m.quantity_delta > 0 ? "+" : ""}
                      {m.quantity_delta}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-mist">
                    {m.created_by_name || "System"}
                    {m.order_id ? ` · Order #${m.order_id}` : ""}
                    {m.note ? ` · ${m.note}` : ""}
                  </p>
                  <p className="text-xs text-mist">{formatWhen(m.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
