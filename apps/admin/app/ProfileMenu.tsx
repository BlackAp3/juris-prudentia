"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const signOut = () => {
    localStorage.removeItem("juris.accessToken");
    localStorage.removeItem("juris.refreshToken");
    router.replace("/login");
  };

  return <div className="profile-menu" style={{ position: "relative", marginTop: "auto" }}>
    <button className="admin-profile" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <span className="avatar">SN</span>
      <span style={{ flex: 1 }}><strong>Sydney N.</strong><small>Super Administrator</small></span>
      <span className="profile-kebab">⋮</span>
    </button>
    {open && <div role="menu" style={{ position: "absolute", bottom: 64, right: 0, minWidth: 145, padding: 6, border: "1px solid #d8dee8", borderRadius: 8, background: "#fff", boxShadow: "0 10px 28px rgba(15,30,55,.22)", zIndex: 5 }}>
      <button type="button" onClick={signOut} style={{ width: "100%", padding: "9px 10px", border: 0, borderRadius: 5, background: "transparent", color: "#0b1b36", fontSize: 11, fontWeight: 800, textAlign: "left", cursor: "pointer" }}>Sign out</button>
    </div>}
  </div>;
}
