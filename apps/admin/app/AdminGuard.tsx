"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

export function AdminGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(pathname === "/login");

  useEffect(() => {
    if (pathname === "/login") {
      setReady(true);
      return;
    }

    const token = localStorage.getItem("juris.accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session expired");
        const payload = await response.json() as { data?: { role?: string } };
        if (!payload.data?.role || !["CONTENT_EDITOR", "MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(payload.data.role)) throw new Error("Not an administrator");
        setReady(true);
      })
      .catch(() => {
        localStorage.removeItem("juris.accessToken");
        localStorage.removeItem("juris.refreshToken");
        router.replace("/login");
      });
  }, [pathname, router]);

  if (pathname !== "/login" && !ready) return <main style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>Checking secure access…</main>;
  return children;
}
