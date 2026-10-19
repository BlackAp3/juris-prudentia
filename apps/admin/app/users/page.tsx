"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../admin-api";
import { AdminShell, Badge, Card, Metric } from "../components";

type User = { id: string; fullName: string; email: string; role: string; isActive: boolean; createdAt: string };
type UserData = { users: User[]; counts: { total: number; active: number; newUsers: number; pendingVerification: number } };

export default function Users() {
  const [data, setData] = useState<UserData | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [error, setError] = useState("");
  useEffect(() => { adminFetch<UserData>("/admin/users").then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load users")); }, []);
  const users = data?.users.filter((user) => `${user.fullName} ${user.email}`.toLowerCase().includes(query.toLowerCase()) && (role === "all" || user.role === role)) ?? [];
  const roles = [...new Set(data?.users.map((user) => user.role) ?? [])];
  return <AdminShell active="Users" title="Users" description="User accounts currently stored in the database."><>{error && <p className="error-banner">{error}</p>}<div className="metrics compact"><Metric label="Total users" value={data ? String(data.counts.total) : "—"} detail={data ? `${data.counts.active} active` : "Loading database records"} icon="◎" /><Metric label="New this month" value={data ? String(data.counts.newUsers) : "—"} detail="Created this month" icon="＋" /><Metric label="Pending verification" value="0" detail="No verification field stored" icon="◌" /></div><div className="toolbar"><div className="search-box"><span className="search-icon">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users…" /></div><select value={role} onChange={(event) => setRole(event.target.value)}><option value="all">All roles</option>{roles.map((item) => <option value={item} key={item}>{item}</option>)}</select></div><Card className="table-card"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead><tbody>{users.length ? users.map((user) => <tr key={user.id}><td><div className="user-cell"><span>{user.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{user.fullName}</strong><small>{user.email}</small></div></div></td><td><Badge tone={user.role === "STUDENT" ? "blue" : "gold"}>{user.role.replaceAll("_", " ")}</Badge></td><td><Badge tone={user.isActive ? "green" : "gray"}>{user.isActive ? "Active" : "Inactive"}</Badge></td><td>{new Date(user.createdAt).toLocaleDateString()}</td></tr>) : <tr><td colSpan={4} className="empty-table">No users are stored in the database.</td></tr>}</tbody></table></Card></></AdminShell>;
}
