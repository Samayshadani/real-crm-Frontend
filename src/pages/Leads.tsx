import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Upload, Search, Filter, Phone, AlertCircle,
  MessageCircle, Copy, Calendar, CheckCircle, XCircle,
} from "lucide-react";
import { getLeads, addLead, updateLead, deleteLead, getWhatsappLeads } from "@/lib/leadsApi";
import AddLeadModal from "@/components/AddLeadModal";
import WhatsAppTemplateModal from "@/components/WhatsAppTemplateModal";
import DuplicateAlert from "@/components/DuplicateAlert";
import MergeDuplicatesModal from "@/components/MergeDuplicatesModal";
import BulkImportModal from "@/components/BulkImportModal";
import { useUser } from "../lib/UserContext";

const statusOptions = ["new", "contacted", "site-visit", "negotiation", "converted", "lost"];
const tagOptions = ["hot", "priority", "followup", "test"];

export type Lead = {
  id: string | number;
  name: string;
  contact: string;
  email: string;
  source: string;
  status: string;
  assignedTo: string;
  followUp: string;
  tags?: string[];
  customFields?: { [key: string]: any };
  duplicateInfo?: { isDuplicate: boolean; duplicateCount: number };
  metaData?: any;
  createdAt?: string;
};

/* ================================================================
   normalizeFollowUp
   The backend now sends "YYYY-MM-DD" (date-only, no time, no Z).
   This function handles that cleanly, plus any legacy data that
   might still have a time component or UTC Z suffix.
================================================================ */
function normalizeFollowUp(raw: any): string {
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  if (s === "" || s === "null" || s === "undefined") return "";

  // ✅ Perfect format — date only, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Has time but no Z — extract date part only
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !s.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(s)) {
    return s.slice(0, 10);
  }

  // MySQL space format "YYYY-MM-DD HH:mm:ss"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return s.slice(0, 10);

  // UTC string with Z — convert to LOCAL date (handles IST shift)
  if (s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  }

  // Last resort
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  return "";
}

function normalizeLead(lead: any): Lead {
  let tagsArray: string[] = [];
  if (Array.isArray(lead.tags)) tagsArray = lead.tags;
  else if (typeof lead.tags === "string" && lead.tags.length > 0) {
    try { tagsArray = JSON.parse(lead.tags); } catch { tagsArray = []; }
  }
  const rawFollowUp = lead.followUp ?? lead.follow_up ?? lead.followup ?? null;
  return {
    ...lead,
    tags: tagsArray,
    followUp: normalizeFollowUp(rawFollowUp),
    assignedTo: lead.assignedTo ?? lead.assigned_to ?? "",
  };
}

/* Format "YYYY-MM-DD" → "28 Feb 2026" */
function formatFollowUp(followUp?: string): string {
  if (!followUp || followUp.trim() === "") return "-";
  const s = followUp.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [year, month, day] = s.split("-").map(Number);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${String(day).padStart(2,"0")} ${months[month - 1]} ${year}`;
  }
  // Fallback for any remaining datetime strings
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
  } catch {}
  return s;
}

function isOverdue(followUp?: string): boolean {
  if (!followUp || followUp.trim() === "") return false;
  // Compare date strings directly — "2026-02-27" < "2026-02-28" works lexicographically
  const today = new Date().toISOString().slice(0, 10);
  const fu = followUp.trim().slice(0, 10);
  return fu < today;
}

function statusClass(status: string) {
  switch (status) {
    case "new": return "bg-blue-100 text-blue-800";
    case "contacted": return "bg-indigo-100 text-indigo-800";
    case "site-visit": return "bg-amber-100 text-amber-800";
    case "negotiation": return "bg-yellow-100 text-yellow-800";
    case "converted": return "bg-green-100 text-green-800";
    case "lost": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function addDuplicateInfo(leadsData: any[]): Lead[] {
  if (!Array.isArray(leadsData)) return [];
  const normalized = leadsData.map(normalizeLead);
  return normalized.map((lead) => {
    const dupes = normalized.filter((l) => {
      const sameName = (l.name||"").trim() !== "" && l.name.toLowerCase().trim() === lead.name.toLowerCase().trim();
      const sameContact = (l.contact||"").trim() !== "" && l.contact.toLowerCase().trim() === lead.contact.toLowerCase().trim();
      return (sameName || sameContact) && l.id !== lead.id;
    });
    return { ...lead, duplicateInfo: { isDuplicate: dupes.length > 0, duplicateCount: dupes.length } };
  });
}

/* FollowUp modal — uses inline (not the separate FollowupModal) */
function FollowUpInlineModal({ lead, onClose, onSchedule }: {
  lead: Lead; onClose: () => void; onSchedule: (l: Lead) => void;
}) {
  // ✅ Always slice to 10 chars to get "YYYY-MM-DD" for the date input
  const [date, setDate] = useState(lead.followUp ? lead.followUp.slice(0, 10) : "");
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!date) { setError("Please select a date."); return; }
    // ✅ Send just "YYYY-MM-DD" — no time, no timezone issues
    onSchedule({ ...lead, followUp: date });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-[340px]">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" /> Schedule Follow-up
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Lead: <span className="font-medium text-gray-800">{lead.name}</span>
        </p>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date *</label>
        <input type="date" value={date}
          onChange={(e) => { setDate(e.target.value); setError(null); }}
          className="border rounded px-3 py-2 w-full text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          min={new Date().toISOString().slice(0, 10)}
        />
        {date && (
          <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-4 text-sm text-blue-700">
            📅 Scheduled for: <span className="font-semibold">{formatFollowUp(date)}</span>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition">
            Save Follow-up
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadCard({ lead, loading, onEdit, onDelete, onWhatsApp, onCopy, onFollowUp, onClose, onDuplicateAlert, onMerge }: {
  lead: Lead; loading: boolean;
  onEdit: (l: Lead) => void; onDelete: (id: string | number) => void;
  onWhatsApp: (l: Lead) => void; onCopy: (t?: string) => void;
  onFollowUp: (l: Lead) => void; onClose: (l: Lead) => void;
  onDuplicateAlert: (l: Lead) => void; onMerge: (l: Lead) => void;
}) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm space-y-3 ${lead.duplicateInfo?.isDuplicate ? "bg-yellow-50 border-yellow-300" : "bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">{lead.name}</div>
          {lead.email && <div className="text-xs text-muted-foreground truncate">{lead.email}</div>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge className={`${statusClass(lead.status)} text-xs`}>
            {lead.status ? lead.status.replace("-", " ") : "-"}
          </Badge>
          {lead.duplicateInfo?.isDuplicate && (
            <button onClick={() => onDuplicateAlert(lead)} disabled={loading}
              className="text-xs text-yellow-700 font-semibold bg-yellow-100 rounded px-1.5 py-0.5 border border-yellow-300">
              ⚠️ {lead.duplicateInfo.duplicateCount} dup
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {lead.contact && (
          <div className="flex items-center gap-1 text-gray-700 col-span-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{lead.contact}</span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Source: </span>
          <Badge variant={lead.source === "Meta Ad" ? "destructive" : lead.source === "WhatsApp" ? "secondary" : "outline"}
            className={`text-xs ${lead.source === "WhatsApp" ? "bg-green-100 text-green-900" : ""}`}>
            {lead.source || "-"}
          </Badge>
        </div>
        <div>
          <span className="text-muted-foreground">Follow-up: </span>
          <span className={isOverdue(lead.followUp) ? "text-red-600 font-bold" : "text-gray-800"}>
            {formatFollowUp(lead.followUp)}
            {isOverdue(lead.followUp) && <AlertCircle className="inline ml-0.5 text-red-600" size={12} />}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Created: </span>
          <span className="text-gray-700">
            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString()
              : lead.metaData?.createdAt ? new Date(lead.metaData.createdAt).toLocaleDateString() : "-"}
          </span>
        </div>
        {lead.source === "WhatsApp" && lead.metaData?.lastMessage && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Last msg: </span>
            <span className="text-blue-700">{lead.metaData.lastMessage}</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
        {[
          { label: "Edit", icon: <CheckCircle className="h-3.5 w-3.5" />, fn: () => onEdit(lead), cls: "bg-gray-100 hover:bg-gray-200 text-gray-700" },
          { label: "Follow-up", icon: <Calendar className="h-3.5 w-3.5" />, fn: () => onFollowUp(lead), cls: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
          { label: "WA", icon: <MessageCircle className="h-3.5 w-3.5" />, fn: () => onWhatsApp(lead), cls: "bg-green-50 hover:bg-green-100 text-green-700" },
          { label: "Copy", icon: <Copy className="h-3.5 w-3.5" />, fn: () => onCopy(lead.contact), cls: "bg-gray-100 hover:bg-gray-200 text-gray-700" },
          { label: "Close", icon: <CheckCircle className="h-3.5 w-3.5" />, fn: () => onClose(lead), cls: "bg-gray-100 hover:bg-gray-200 text-gray-700" },
          { label: "Delete", icon: <XCircle className="h-3.5 w-3.5" />, fn: () => onDelete(lead.id), cls: "bg-red-50 hover:bg-red-100 text-red-600" },
        ].map(({ label, icon, fn, cls }) => (
          <button key={label} onClick={fn} disabled={loading}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md ${cls} transition`}>
            {icon} {label}
          </button>
        ))}
        {lead.duplicateInfo?.isDuplicate && (
          <button onClick={() => onMerge(lead)} disabled={loading}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300 transition">
            Merge
          </button>
        )}
      </div>
    </div>
  );
}

export default function Leads() {
  const { user, logout } = useUser();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [modalLead, setModalLead] = useState<Lead | null>(null);
  const [waModalLead, setWAModalLead] = useState<Lead | null>(null);
  const [showDuplicateFilter, setShowDuplicateFilter] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [duplicateAlertLead, setDuplicateAlertLead] = useState<Lead | null>(null);
  const [mergeModal, setMergeModal] = useState<{ primary: Lead | null; duplicates: Lead[] }>({ primary: null, duplicates: [] });
  const [showWhatsappOnly, setShowWhatsappOnly] = useState(false);

  useEffect(() => { fetchLeads(); }, [statusFilter, search, selectedTag, user]);

  async function fetchLeads() {
    setLoading(true);
    const params: any = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (search.trim().length > 0) params.search = search;
    if (selectedTag !== "all") params.tag = selectedTag;
    try {
      const res = await getLeads({ params });
      let regularLeads = Array.isArray(res.data) ? addDuplicateInfo(res.data) : [];
      let whatsappLeads: Lead[] = [];
      try {
        const wa = await getWhatsappLeads();
        if (Array.isArray(wa)) {
          whatsappLeads = wa.map((c: any) => ({
            id: c.id, name: c.name, contact: c.whatsappId,
            email: "", source: "WhatsApp", status: "new",
            assignedTo: "", followUp: "", tags: [], customFields: {},
            metaData: { lastMessage: c.lastMessage, createdAt: c.createdAt },
            createdAt: c.createdAt,
          }));
        }
      } catch {}
      const merged = [...regularLeads, ...whatsappLeads].sort((a, b) =>
        (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );
      setLeads(addDuplicateInfo(merged));
      setError(null);
    } catch {
      setError("Failed to load leads!");
    } finally {
      setLoading(false);
    }
  }

  function handleAddLead(lead: Omit<Lead, "id">) {
    const nc = (lead.contact || "").trim().toLowerCase();
    if (nc && leads.some((l) => (l.contact || "").trim().toLowerCase() === nc)) {
      setError("Duplicate lead: this contact already exists.");
      setShowModal(false); setQuickAdd(false); return;
    }
    setLoading(true);
    addLead(lead)
      .then((res) => { setLeads((prev) => addDuplicateInfo([normalizeLead(res.data), ...prev])); setShowModal(false); setQuickAdd(false); setError(null); })
      .catch((err) => setError(err?.response?.data?.error || "Failed to add lead!"))
      .finally(() => setLoading(false));
  }

  function handleUpdateLead(lead: Lead) {
    setLeads((prev) => addDuplicateInfo(prev.map((l) => l.id === lead.id ? { ...l, ...lead } : l)));
    setShowModal(false);
    setFollowUpLead(null);
    setLoading(true);
    updateLead(lead.id as number, lead)
      .then((res) => {
        if (res?.data) {
          const n = normalizeLead(res.data);
          setLeads((prev) => addDuplicateInfo(prev.map((l) => l.id === lead.id ? { ...lead, ...n } : l)));
        }
        setError(null);
      })
      .catch((err) => { setError(err?.response?.data?.error || "Failed to update lead!"); fetchLeads(); })
      .finally(() => setLoading(false));
  }

  function handleDeleteLead(id: string | number) {
    if (!window.confirm("Delete this lead?")) return;
    setLoading(true);
    deleteLead(id as number)
      .then(() => setLeads((prev) => addDuplicateInfo(prev.filter((l) => l.id !== id))))
      .catch(() => setError("Failed to delete lead!"))
      .finally(() => setLoading(false));
  }

  function openAddModal() { setModalLead(null); setShowModal(true); setError(null); }
  function openEditModal(lead: Lead) { setModalLead(lead); setShowModal(true); setError(null); }
  function handleCloseLead(lead: Lead) { handleUpdateLead({ ...lead, status: "closed" }); }
  function handleBulkImportSuccess() { setShowBulkImport(false); fetchLeads(); }

  function openMergeModal(lead: Lead) {
    const dupes = leads.filter((l) => {
      const sameName = (l.name||"").toLowerCase().trim() === (lead.name||"").toLowerCase().trim() && (l.name||"").trim() !== "";
      const sameContact = (l.contact||"").toLowerCase().trim() === (lead.contact||"").toLowerCase().trim() && (l.contact||"").trim() !== "";
      return (sameName || sameContact) && l.id !== lead.id;
    });
    if (!dupes.length) { setError("No duplicates found"); return; }
    setMergeModal({ primary: lead, duplicates: dupes });
  }

  function handleMergeComplete() { fetchLeads(); setMergeModal({ primary: null, duplicates: [] }); setError(null); }

  function copyToClipboard(text?: string) {
    if (!text) return;
    navigator?.clipboard?.writeText(text).catch(() => {
      const inp = document.createElement("input"); document.body.appendChild(inp);
      inp.value = text; inp.select(); document.execCommand("copy"); document.body.removeChild(inp);
    });
  }

  let filteredLeads = showDuplicateFilter ? leads.filter((l) => l.duplicateInfo?.isDuplicate) : leads;
  if (showWhatsappOnly) filteredLeads = filteredLeads.filter((l) => l.source === "WhatsApp");
  const duplicateCount = leads.filter((l) => l.duplicateInfo?.isDuplicate).length;

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Lead Management</h1>
          <p className="text-muted-foreground text-sm">Track and manage your sales leads</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openAddModal} disabled={loading} size="sm"><Plus className="mr-1.5 h-4 w-4" />Add Lead</Button>
          <Button onClick={() => setQuickAdd(true)} variant="outline" disabled={loading} size="sm"><Calendar className="mr-1.5 h-4 w-4" />Quick Add</Button>
          <Button onClick={() => setShowBulkImport(true)} variant="outline" disabled={loading} size="sm"><Upload className="mr-1.5 h-4 w-4" />Import CSV</Button>
          <Button variant={showWhatsappOnly ? "default" : "outline"} onClick={() => setShowWhatsappOnly(v => !v)} disabled={loading} size="sm">
            <MessageCircle className="mr-1.5 h-4 w-4" />{showWhatsappOnly ? "All Leads" : "WhatsApp Only"}
          </Button>
          <Button variant="outline" onClick={logout} disabled={loading} size="sm">Logout</Button>
        </div>
      </div>

      {/* Duplicate Alert */}
      {duplicateCount > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-yellow-600 shrink-0" size={18} />
                <span className="text-yellow-800 font-semibold text-sm">⚠️ {duplicateCount} potential duplicate lead(s) found</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={showDuplicateFilter ? "default" : "outline"} onClick={() => setShowDuplicateFilter(!showDuplicateFilter)} disabled={loading}>
                  {showDuplicateFilter ? "Show All" : "View Duplicates"}
                </Button>
                <Button size="sm" variant="ghost" onClick={fetchLeads} disabled={loading}>Refresh</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search leads..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} disabled={loading} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
                <SelectTrigger className="flex-1 min-w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedTag} onValueChange={setSelectedTag} disabled={loading}>
                <SelectTrigger className="flex-1 min-w-[120px]"><SelectValue placeholder="Tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {tagOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchLeads} disabled={loading} size="sm" className="shrink-0">
                <Filter className="mr-1.5 h-4 w-4" />Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap gap-2 items-center text-base sm:text-lg">
            Leads ({filteredLeads.length})
            {showDuplicateFilter && <span className="text-sm text-yellow-600">(Duplicates Only)</span>}
            {showWhatsappOnly && <span className="text-blue-600 text-sm">[WhatsApp Only]</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No leads found</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm min-w-[650px]">
                  <thead>
                    <tr className="border-b">
                      {["Name","Contact","Email","Source","Status","Follow-up","Created","Last Msg","Dup","Actions"].map(h => (
                        <th key={h} className="text-left py-2 px-2 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className={`border-b hover:bg-muted/50 transition ${lead.duplicateInfo?.isDuplicate ? "bg-yellow-50" : ""}`}>
                        <td className="py-2 px-2">
                          <div className="font-medium truncate max-w-[130px]">{lead.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{lead.email}</div>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs">{lead.contact || "-"}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{lead.email || "-"}</td>
                        <td className="py-2 px-2">
                          <Badge variant={lead.source === "Meta Ad" ? "destructive" : lead.source === "WhatsApp" ? "secondary" : "outline"}
                            className={lead.source === "WhatsApp" ? "bg-green-100 text-green-900" : ""}>
                            {lead.source || "-"}
                          </Badge>
                        </td>
                        <td className="py-2 px-2">
                          <Badge className={statusClass(lead.status)}>
                            {lead.status ? lead.status.replace("-", " ") : "-"}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-xs">
                          <span className={isOverdue(lead.followUp) ? "text-red-600 font-bold" : ""}>
                            {formatFollowUp(lead.followUp)}
                          </span>
                          {isOverdue(lead.followUp) && <AlertCircle className="inline ml-1 text-red-600" size={16} />}
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground max-w-[120px] truncate">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleString()
                            : lead.metaData?.createdAt ? new Date(lead.metaData.createdAt).toLocaleString() : "-"}
                        </td>
                        <td className="py-2 px-2 text-xs text-blue-700 max-w-[110px] truncate">
                          {lead.source === "WhatsApp" && lead.metaData?.lastMessage ? lead.metaData.lastMessage : "-"}
                        </td>
                        <td className="py-2 px-2 text-xs">
                          {lead.duplicateInfo?.isDuplicate ? (
                            <Button size="icon" variant="ghost" onClick={() => setDuplicateAlertLead(lead)} disabled={loading} className="p-1">
                              <span className="font-semibold text-yellow-700">{lead.duplicateInfo.duplicateCount}</span>
                            </Button>
                          ) : "-"}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex flex-row flex-wrap gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEditModal(lead)} disabled={loading} title="Edit" className="p-1"><CheckCircle className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteLead(lead.id)} disabled={loading} title="Delete" className="p-1"><XCircle className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setWAModalLead(lead)} disabled={loading} title="WhatsApp" className="p-1"><MessageCircle className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => copyToClipboard(lead.contact)} disabled={loading} title="Copy" className="p-1"><Copy className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setFollowUpLead(lead)} disabled={loading} title="Follow-Up" className="p-1"><Calendar className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleCloseLead(lead)} disabled={loading} title="Close" className="p-1"><CheckCircle className="h-4 w-4" /></Button>
                            {lead.duplicateInfo?.isDuplicate && (
                              <Button size="icon" variant="outline" onClick={() => openMergeModal(lead)} disabled={loading} title="Merge" className="p-1 text-xs">Merge</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} loading={loading}
                    onEdit={openEditModal} onDelete={handleDeleteLead}
                    onWhatsApp={(l) => setWAModalLead(l)} onCopy={copyToClipboard}
                    onFollowUp={(l) => setFollowUpLead(l)} onClose={handleCloseLead}
                    onDuplicateAlert={(l) => setDuplicateAlertLead(l)} onMerge={openMergeModal}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showModal && (
        <AddLeadModal onClose={() => setShowModal(false)} onSubmit={modalLead ? handleUpdateLead : handleAddLead}
          existingLead={modalLead} error={error} existingLeads={leads} />
      )}
      {quickAdd && (
        <AddLeadModal onClose={() => setQuickAdd(false)} onSubmit={handleAddLead}
          existingLead={null} error={error} existingLeads={leads} />
      )}
      {showBulkImport && <BulkImportModal onClose={() => setShowBulkImport(false)} onImport={handleBulkImportSuccess} />}
      {followUpLead && <FollowUpInlineModal lead={followUpLead} onClose={() => setFollowUpLead(null)} onSchedule={handleUpdateLead} />}
      {waModalLead && <WhatsAppTemplateModal lead={waModalLead} onClose={() => setWAModalLead(null)} />}
      {duplicateAlertLead && <DuplicateAlert lead={duplicateAlertLead} onClose={() => setDuplicateAlertLead(null)} />}
      {mergeModal.primary && mergeModal.duplicates.length > 0 && (
        <MergeDuplicatesModal primary={mergeModal.primary} duplicates={mergeModal.duplicates}
          onClose={() => setMergeModal({ primary: null, duplicates: [] })} onMergeComplete={handleMergeComplete} />
      )}
      {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
    </div>
  );
}
