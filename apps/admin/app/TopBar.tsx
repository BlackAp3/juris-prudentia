"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "./admin-api";

const quickLinks = [
  ["Overview", "/"],
  ["Courses", "/courses"],
  ["Content Manager", "/content"],
  ["Cases & statutes", "/cases"],
  ["News", "/news"],
  ["Community", "/community"],
  ["Users", "/users"],
  ["Reports", "/reports"],
  ["Settings", "/settings"],
] as const;

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 4.2 4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg>;
}

function BellIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M6.7 10.5a5.3 5.3 0 0 1 10.6 0v2.1c0 1.3.5 2.5 1.4 3.4l.6.6H4.7l.6-.6c.9-.9 1.4-2.1 1.4-3.4v-2.1Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" /><path d="M9.8 19a2.4 2.4 0 0 0 4.4 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></svg>;
}

export function TopBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ title: string; detail: string; count: number }>>([]);
  const [profile, setProfile] = useState<{ fullName: string; role: string } | null>(null);
  const matches = quickLinks.filter(([label]) => label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5);

  useEffect(() => {
    adminFetch<{ attention: Array<{ title: string; detail: string; count: number }> }>("/admin/overview").then((data) => setNotifications(data.attention)).catch(() => setNotifications([]));
    adminFetch<{ fullName: string; role: string }>("/auth/me").then(setProfile).catch(() => setProfile(null));
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const match = matches[0];
    if (!match) return;
    router.push(match[1]);
    setQuery("");
    setSearchOpen(false);
  };

  const signOut = () => {
    localStorage.removeItem("juris.accessToken");
    localStorage.removeItem("juris.refreshToken");
    router.replace("/login");
  };

  return <header className="topbar">
    <div className="mobile-brand">JP</div>
    <form className="global-search" onSubmit={submitSearch} role="search">
      <span className="search-icon"><SearchIcon /></span>
      <input value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)} placeholder="Search content, users or cases…" aria-label="Search administration" />
      {searchOpen && query.trim() && <div className="global-search-results" role="listbox">{matches.length > 0 ? matches.map(([label, href]) => <button type="button" key={href} onMouseDown={() => router.push(href)}>{label}<span>Open</span></button>) : <p>No matching section</p>}</div>}
    </form>
    <div className="topbar-actions">
      <div className="topbar-popover-wrap">
        <button className="icon-button notification-button" type="button" onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }} aria-label="Open notifications" aria-expanded={notificationsOpen}>
          <BellIcon />
          {!notificationsRead && notifications.length > 0 && <span className="notification-dot" />}
        </button>
        {notificationsOpen && <div className="notification-popover" role="dialog" aria-label="Notifications"><div className="popover-heading"><strong>Notifications</strong>{notifications.length > 0 && <button type="button" onClick={() => setNotificationsRead(true)}>Mark all read</button>}</div>{notifications.length > 0 ? notifications.map((notification) => <div className="notification-item" key={notification.title}><span className="notification-status">!</span><div><strong>{notification.title}</strong><small>{notification.detail}</small></div><time>{notification.count}</time></div>) : <p className="notification-empty">No new notifications</p>}</div>}
      </div>
      <div className="topbar-popover-wrap">
        <button className="top-avatar top-avatar-button" type="button" onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }} aria-label="Open profile menu" aria-expanded={profileOpen}>{profile?.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() ?? "--"}</button>
        {profileOpen && <div className="top-profile-popover" role="menu"><div className="top-profile-heading"><strong>{profile?.fullName ?? "Administrator"}</strong><small>{profile?.role?.replaceAll("_", " ") ?? "Administrator"}</small></div><button type="button" onClick={signOut}>Sign out</button></div>}
      </div>
    </div>
  </header>;
}
