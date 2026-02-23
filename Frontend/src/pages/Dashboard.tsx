

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, Users, AlertCircle, RefreshCw, Download,
  CheckCircle, Clock, XCircle, MessageCircle, Phone,
} from "lucide-react";
import { getLeads, getWhatsappLeads } from "@/lib/leadsApi";

const COLORS = [
  "#3b82f6", "#6366f1", "#f59e0b", "#eab308", "#22c55e", "#ef4444",
];

const STATUS_ORDER = ["new", "contacted", "negotiation", "converted", "lost"];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-indigo-100 text-indigo-800",
  negotiation: "bg-yellow-100 text-yellow-800",
  converted: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchAllLeads(); }, []);

  async function fetchAllLeads() {
    setLoading(true);
    setError(null);
    try {
      const res = await getLeads({ params: {} });
      let regularLeads = Array.isArray(res.data) ? res.data : [];

      let whatsappLeads: any[] = [];
      try {
        const wa = await getWhatsappLeads();
        if (Array.isArray(wa)) {
          whatsappLeads = wa.map((c) => ({
            id: c.id, name: c.name, contact: c.whatsappId, email: "",
            source: "WhatsApp", status: "new", assignedTo: "",
            followUp: "", tags: [], createdAt: c.createdAt,
          }));
        }
      } catch {}

      setLeads([...regularLeads, ...whatsappLeads]);
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  // ── Derived Metrics ──────────────────────────────────────────────────────

  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l) => l.status === "converted");
  const lostLeads = leads.filter((l) => l.status === "lost");
  const activeLeads = leads.filter((l) => !["converted", "lost"].includes(l.status));
  const conversionRate = totalLeads > 0
    ? ((convertedLeads.length / totalLeads) * 100).toFixed(1)
    : "0.0";

  // Overdue follow-ups
  const today = new Date(new Date().toISOString().slice(0, 10));
  const overdueLeads = leads.filter((l) => {
    if (!l.followUp) return false;
    return new Date(l.followUp) < today && !["converted", "lost"].includes(l.status);
  });

  // Today's follow-ups
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayFollowUps = leads.filter((l) => {
    if (!l.followUp) return false;
    return l.followUp.slice(0, 10) === todayStr;
  });

  // Funnel data
  const funnelData = STATUS_ORDER.map((status) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: leads.filter((l) => l.status === status).length,
  }));

  // Leads by source
  const sourceMap: Record<string, number> = {};
  leads.forEach((l) => {
    const src = l.source || "Unknown";
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });
  const sourceData = Object.entries(sourceMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Agent leaderboard (all leads assigned)
  const agentMap: Record<string, { total: number; converted: number }> = {};
  leads.forEach((l) => {
    if (!l.assignedTo) return;
    if (!agentMap[l.assignedTo]) agentMap[l.assignedTo] = { total: 0, converted: 0 };
    agentMap[l.assignedTo].total++;
    if (l.status === "converted") agentMap[l.assignedTo].converted++;
  });
  const agentData = Object.entries(agentMap)
    .map(([name, { total, converted }]) => ({ name, total, converted }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Leads added last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString("default", { weekday: "short", day: "numeric" });
    const dateStr = d.toISOString().slice(0, 10);
    return {
      day: label,
      count: leads.filter((l) => l.createdAt && l.createdAt.slice(0, 10) === dateStr).length,
    };
  });

  // Duplicate detection
  const duplicateCount = leads.filter((lead) =>
    leads.some((l) => {
      const validName = (l.name || "").trim() !== "" && (lead.name || "").trim() !== "";
      const validContact = (l.contact || "").trim() !== "" && (lead.contact || "").trim() !== "";
      const sameName = validName && l.name.toLowerCase().trim() === lead.name.toLowerCase().trim();
      const sameContact = validContact && l.contact.toLowerCase().trim() === lead.contact.toLowerCase().trim();
      return (sameName || sameContact) && l.id !== lead.id;
    })
  ).length;

  // Recent 5 leads
  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  // CSV download
  function downloadCSV() {
    const csv = [
      ["Name", "Contact", "Email", "Source", "Status", "Assigned To", "Follow Up", "Created At"],
      ...leads.map((l) => [
        l.name, l.contact, l.email, l.source, l.status,
        l.assignedTo, l.followUp,
        l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "",
      ]),
    ]
      .map((row) => row.map((v) => `"${v ?? ""}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "leads_export.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Live leads overview and pipeline metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAllLeads} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="default" size="sm" onClick={downloadCSV} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded">{error}</div>}
      {loading && <div className="text-muted-foreground text-sm">Loading...</div>}

      {/* ── Alert Banners ─────────────────────────────────────── */}
      {overdueLeads.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600 h-5 w-5 shrink-0" />
              <span className="text-red-800 font-semibold text-sm">
                🚨 {overdueLeads.length} overdue follow-up{overdueLeads.length > 1 ? "s" : ""} — immediate action needed!
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {overdueLeads.slice(0, 5).map((l) => (
                <span key={l.id} className="text-xs bg-red-100 text-red-700 rounded px-2 py-0.5">
                  {l.name} ({l.followUp})
                </span>
              ))}
              {overdueLeads.length > 5 && (
                <span className="text-xs text-red-500">+{overdueLeads.length - 5} more</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {todayFollowUps.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="text-amber-600 h-5 w-5 shrink-0" />
              <span className="text-amber-800 font-semibold text-sm">
                📅 {todayFollowUps.length} follow-up{todayFollowUps.length > 1 ? "s" : ""} scheduled for today
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {todayFollowUps.map((l) => (
                <span key={l.id} className="text-xs bg-amber-100 text-amber-700 rounded px-2 py-0.5">
                  {l.name} — {l.assignedTo || "Unassigned"}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {duplicateCount > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-yellow-600 h-5 w-5 shrink-0" />
              <span className="text-yellow-800 font-semibold text-sm">
                ⚠️ {duplicateCount} potential duplicate lead{duplicateCount > 1 ? "s" : ""} detected — go to Leads page to merge
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">{activeLeads.length} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{convertedLeads.length}</div>
            <p className="text-xs text-muted-foreground">{conversionRate}% conversion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Follow-ups</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueLeads.length}</div>
            <p className="text-xs text-muted-foreground">{todayFollowUps.length} due today</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row ────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Leads added last 7 days */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads Added — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="New Leads" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status breakdown pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={funnelData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, percent, value }) =>
                    value > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                  }
                >
                  {funnelData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row ────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* Pipeline status counts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {STATUS_ORDER.map((status) => {
              const count = leads.filter((l) => l.status === status).length;
              const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-0.5">
                    <span className="capitalize">{status.replace("-", " ")}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: COLORS[STATUS_ORDER.indexOf(status) % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Leads by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sourceData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              sourceData.map(({ name, value }) => {
                const pct = totalLeads > 0 ? Math.round((value / totalLeads) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-0.5">
                      <span>{name}</span>
                      <span className="font-semibold">{value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads yet</p>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{lead.contact || "-"}</span>
                      {lead.source === "WhatsApp" && <MessageCircle className="h-3 w-3 text-green-500" />}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-700"}`}>
                    {(lead.status || "-").replace("-", " ")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
