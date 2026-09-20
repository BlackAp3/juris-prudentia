"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json() as { data?: { accessToken: string; refreshToken: string; user: { role: string } }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Invalid email or password");
      if (!["CONTENT_EDITOR", "MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(payload.data.user.role)) throw new Error("This account does not have administrator access");
      localStorage.setItem("juris.accessToken", payload.data.accessToken);
      localStorage.setItem("juris.refreshToken", payload.data.refreshToken);
      router.push("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="login-page"><section className="login-brand"><div className="login-logo">⚖</div><h1>Juris Prudentia</h1><p>Administration Portal</p><blockquote>“The law must be stable, but it must not stand still.”</blockquote><small>Secure access for authorized platform administrators.</small></section><section className="login-panel"><form className="login-card" onSubmit={submit}><p className="eyebrow">ADMINISTRATION</p><h2>Welcome back</h2><p>Sign in to manage the Juris Prudentia platform.</p><label>Email address<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="admin@jurisprudentia.app" required /></label><label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Enter your password" required /></label><div className="login-options"><label><input type="checkbox" /> Keep me signed in</label><a>Forgot password?</a></div>{error && <p role="alert" className="login-error">{error}</p>}<button className="login-submit" type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in securely"}</button><div className="login-security">◉ Protected administrative area · Activity is logged</div></form></section></main>;
}
