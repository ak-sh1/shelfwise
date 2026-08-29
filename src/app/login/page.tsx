"use client";

import { FormEvent, useState } from "react";
import { Boxes } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("owner@shelfwise.demo");
  const [password, setPassword] = useState("owner123");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      const msg =
        err instanceof Error
          ? /abort|timeout/i.test(err.message)
            ? "Sign-in timed out. The server may be waking up — wait 30s and try again."
            : err.message
          : "Login failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-signal/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card/80 p-8 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-signal text-signal-foreground">
            <Boxes className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Shelfwise
            </h1>
            <p className="text-sm text-mist">Inventory & orders for your shop</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 space-y-1 rounded-xl border border-border/70 bg-background/50 p-3 text-xs text-mist">
          <p className="font-medium text-foreground">Demo accounts</p>
          <p>Owner: owner@shelfwise.demo / owner123</p>
          <p>Staff: staff@shelfwise.demo / staff123</p>
        </div>
      </div>
    </div>
  );
}
