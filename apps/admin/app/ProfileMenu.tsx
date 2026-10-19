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

  return <div className="profile-menu">
    <button className="admin-profile profile-menu-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <span className="avatar">SN</span>
      <span className="profile-menu-details"><strong>Sydney N.</strong><small>Super Administrator</small></span>
      <span className="profile-kebab">⋮</span>
    </button>
    {open && <div className="profile-menu-popover" role="menu">
      <button className="profile-menu-action" type="button" onClick={signOut}>Sign out</button>
    </div>}
  </div>;
}
