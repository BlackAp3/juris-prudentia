"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminFetch } from "./admin-api";

export function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{ fullName: string; role: string } | null>(null);

  useEffect(() => {
    adminFetch<{ fullName: string; role: string }>("/auth/me").then(setProfile).catch(() => setProfile(null));
  }, []);

  const signOut = () => {
    localStorage.removeItem("juris.accessToken");
    localStorage.removeItem("juris.refreshToken");
    router.replace("/login");
  };

  return <div className="profile-menu">
    <button className="admin-profile profile-menu-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <span className="avatar">{profile?.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() ?? "--"}</span>
      <span className="profile-menu-details"><strong>{profile?.fullName ?? "Administrator"}</strong><small>{profile?.role?.replaceAll("_", " ") ?? "Administrator"}</small></span>
      <span className="profile-kebab">⋮</span>
    </button>
    {open && <div className="profile-menu-popover" role="menu">
      <button className="profile-menu-action" type="button" onClick={signOut}>Sign out</button>
    </div>}
  </div>;
}
