// import { useState, useEffect, useMemo } from "react";

// const defaultCustomKeys = [
//   { key: "propertyType", label: "Property Type" },
//   { key: "budget", label: "Budget" },
//   { key: "location", label: "Location" },
//   { key: "timeline", label: "Timeline" },
// ];

// type Lead = {
//   id?: number | string;
//   name: string;
//   contact: string;
//   email: string;
//   source: string;
//   status: string;
//   assignedTo: string;
//   followUp: string;
//   tags?: string[];
//   customFields?: { [key: string]: any };
//   duplicateInfo?: { isDuplicate: boolean; duplicateCount: number };
//   metaData?: any;
//   createdAt?: string;
// };

// type Props = {
//   onClose: () => void;
//   onSubmit: (lead: any) => void;
//   existingLead?: Lead | null;
//   error?: string | null;
//   existingLeads?: Lead[]; // passed from parent for duplicate checking
// };

// const statusOptions = ["new", "contacted", "site-visit", "negotiation", "converted", "lost"];

// export default function AddLeadModal({ onClose, onSubmit, existingLead, error, existingLeads = [] }: Props) {
//   const [form, setForm] = useState<Lead>(
//     existingLead || {
//       name: "",
//       contact: "",
//       email: "",
//       source: "",
//       status: "new",
//       assignedTo: "",
//       followUp: "",
//       tags: [],
//       customFields: {},
//     }
//   );
//   const [localError, setLocalError] = useState<string | null>(null);
//   const [tagInput, setTagInput] = useState("");

//   useEffect(() => { setLocalError(error || null); }, [error]);

//   // Real-time duplicate detection
//   const duplicateWarning = useMemo(() => {
//     const newContact = (form.contact || "").trim().toLowerCase();
//     const newName = (form.name || "").trim().toLowerCase();
//     const isEditing = !!existingLead;

//     if (newContact !== "") {
//       const contactMatch = existingLeads.find((l) => {
//         // Skip self when editing
//         if (isEditing && l.id === existingLead?.id) return false;
//         const ec = (l.contact || "").trim().toLowerCase();
//         return ec !== "" && ec === newContact;
//       });
//       if (contactMatch) {
//         return `⚠️ Duplicate: Contact "${form.contact}" already exists for lead "${contactMatch.name}".`;
//       }
//     }

//     if (newName !== "") {
//       const nameMatch = existingLeads.find((l) => {
//         if (isEditing && l.id === existingLead?.id) return false;
//         const en = (l.name || "").trim().toLowerCase();
//         return en !== "" && en === newName;
//       });
//       if (nameMatch) {
//         return `⚠️ Duplicate: Name "${form.name}" already exists.`;
//       }
//     }

//     return null;
//   }, [form.contact, form.name, existingLeads, existingLead]);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
//     setForm({ ...form, [e.target.name]: e.target.value });

//   const handleCustomFieldChange = (key: string, value: any) =>
//     setForm({ ...form, customFields: { ...form.customFields, [key]: value } });

//   const handleTagAdd = () => {
//     if (tagInput && !form.tags?.includes(tagInput)) {
//       setForm({ ...form, tags: [...(form.tags || []), tagInput] });
//       setTagInput("");
//     }
//   };

//   const handleTagRemove = (tag: string) => {
//     setForm({ ...form, tags: (form.tags || []).filter((t) => t !== tag) });
//   };

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!form.name || !form.contact || !form.email || !form.source) {
//       setLocalError("Name, Contact, Email, and Source are required!");
//       return;
//     }

//     // Hard block on duplicate contact
//     if (duplicateWarning) {
//       setLocalError("Cannot save: duplicate lead detected. Please check the contact or name.");
//       return;
//     }

//     setLocalError(null);
//     onSubmit(form);
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
//       <div className="bg-white p-6 rounded shadow-lg w-[390px] max-h-[90vh] overflow-y-auto">
//         <h2 className="text-xl font-semibold mb-4">{existingLead ? "Edit Lead" : "Add New Lead"}</h2>

//         {/* Hard error */}
//         {localError && (
//           <div className="bg-red-50 border border-red-300 text-red-700 rounded px-3 py-2 mb-3 text-sm">
//             {localError}
//           </div>
//         )}

//         {/* Real-time duplicate warning (soft, shown while typing) */}
//         {!localError && duplicateWarning && (
//           <div className="bg-yellow-50 border border-yellow-400 text-yellow-800 rounded px-3 py-2 mb-3 text-sm flex items-start gap-2">
//             <span className="mt-0.5">⚠️</span>
//             <span>{duplicateWarning}</span>
//           </div>
//         )}

//         <form onSubmit={handleSubmit}>
//           <label className="block text-xs font-medium text-gray-600 mb-0.5">Name *</label>
//           <input
//             name="name"
//             placeholder="Full name"
//             value={form.name}
//             onChange={handleChange}
//             className={`border px-2 py-1.5 mb-3 w-full rounded text-sm ${
//               duplicateWarning?.includes("Name") ? "border-yellow-400 bg-yellow-50" : ""
//             }`}
//           />

//           <label className="block text-xs font-medium text-gray-600 mb-0.5">Contact * (Phone)</label>
//           <input
//             name="contact"
//             placeholder="Phone number"
//             value={form.contact}
//             onChange={handleChange}
//             className={`border px-2 py-1.5 mb-3 w-full rounded text-sm ${
//               duplicateWarning?.includes("Contact") ? "border-yellow-400 bg-yellow-50" : ""
//             }`}
//           />

//           <label className="block text-xs font-medium text-gray-600 mb-0.5">Email *</label>
//           <input
//             name="email"
//             placeholder="Email address"
//             value={form.email}
//             onChange={handleChange}
//             className="border px-2 py-1.5 mb-3 w-full rounded text-sm"
//           />

//           <label className="block text-xs font-medium text-gray-600 mb-0.5">Source *</label>
//           <input
//             name="source"
//             placeholder="e.g. Website, Referral, Meta Ad"
//             value={form.source}
//             onChange={handleChange}
//             className="border px-2 py-1.5 mb-3 w-full rounded text-sm"
//           />

//           <label className="block text-xs font-medium text-gray-600 mb-0.5">Status</label>
//           <select
//             name="status"
//             value={form.status}
//             onChange={handleChange}
//             className="border px-2 py-1.5 mb-3 w-full rounded text-sm"
//           >
//             {statusOptions.map((opt) => (
//               <option key={opt} value={opt}>{opt}</option>
//             ))}
//           </select>

//           <label className="block text-xs font-medium text-gray-600 mb-0.5">Follow-up Date</label>
//           <input
//             name="followUp"
//             type="date"
//             value={form.followUp || ""}
//             onChange={handleChange}
//             className="border px-2 py-1.5 mb-3 w-full rounded text-sm"
//           />

//           {/* Custom fields */}
//           {defaultCustomKeys.map((field) => (
//             <div key={field.key}>
//               <label className="block text-xs font-medium text-gray-600 mb-0.5">{field.label}</label>
//               <input
//                 placeholder={field.label}
//                 value={form.customFields?.[field.key] || ""}
//                 onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
//                 className="border px-2 py-1.5 mb-3 w-full rounded text-sm"
//               />
//             </div>
//           ))}

//           {/* Tags */}
//           <label className="block text-xs font-medium text-gray-600 mb-1">Tags</label>
//           <div className="mb-3 flex gap-2 flex-wrap items-center border rounded px-2 py-1.5 min-h-[38px]">
//             {(form.tags || []).map((tag) => (
//               <span key={tag} className="bg-blue-100 text-blue-800 rounded px-2 py-0.5 text-xs flex items-center">
//                 {tag}
//                 <button type="button" onClick={() => handleTagRemove(tag)} className="ml-1 text-blue-500 hover:text-red-600 font-bold">
//                   &times;
//                 </button>
//               </span>
//             ))}
//             <input
//               placeholder="Add tag…"
//               value={tagInput}
//               onChange={(e) => setTagInput(e.target.value)}
//               className="outline-none text-sm flex-1 min-w-[80px]"
//               onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleTagAdd(); } }}
//             />
//             <button
//               type="button"
//               onClick={handleTagAdd}
//               className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded"
//             >
//               Add
//             </button>
//           </div>

//           <div className="mt-4 flex gap-3">
//             <button
//               type="submit"
//               disabled={!!duplicateWarning}
//               className={`px-4 py-2 rounded text-white text-sm font-medium transition ${
//                 duplicateWarning
//                   ? "bg-gray-400 cursor-not-allowed"
//                   : "bg-blue-600 hover:bg-blue-700"
//               }`}
//             >
//               {existingLead ? "Update" : "Add Lead"}
//             </button>
//             <button
//               type="button"
//               onClick={onClose}
//               className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm"
//             >
//               Cancel
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }



//testing
import { useState, useEffect, useMemo } from "react";

const defaultCustomKeys = [
  { key: "propertyType", label: "Property Type" },
  { key: "budget", label: "Budget" },
  { key: "location", label: "Location" },
  { key: "timeline", label: "Timeline" },
];

type Lead = {
  id?: number | string;
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

type Props = {
  onClose: () => void;
  onSubmit: (lead: any) => void;
  existingLead?: Lead | null;
  error?: string | null;
  existingLeads?: Lead[];
};

const statusOptions = ["new", "contacted", "site-visit", "negotiation", "converted", "lost"];

// ✅ FIX: Extract just the date part "YYYY-MM-DD" from any followUp string
// This handles: "2026-02-28", "2026-02-28T09:00:00", "2026-02-27T18:30:00.000Z"
function extractDateOnly(followUp: string | undefined | null): string {
  if (!followUp || followUp.trim() === "") return "";
  const s = followUp.trim();
  // Already just a date
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Has T separator — take first 10 chars
  if (s.includes("T")) return s.slice(0, 10);
  // MySQL space format "YYYY-MM-DD HH:mm:ss"
  if (s.includes(" ")) return s.slice(0, 10);
  return s.slice(0, 10);
}

export default function AddLeadModal({ onClose, onSubmit, existingLead, error, existingLeads = [] }: Props) {
  const [form, setForm] = useState<Lead>(
    existingLead
      ? {
          ...existingLead,
          // ✅ FIX: Always store just date in the form for the date input
          followUp: extractDateOnly(existingLead.followUp),
        }
      : {
          name: "",
          contact: "",
          email: "",
          source: "",
          status: "new",
          assignedTo: "",
          followUp: "",
          tags: [],
          customFields: {},
        }
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => { setLocalError(error || null); }, [error]);

  const duplicateWarning = useMemo(() => {
    const newContact = (form.contact || "").trim().toLowerCase();
    const newName = (form.name || "").trim().toLowerCase();
    const isEditing = !!existingLead;

    if (newContact !== "") {
      const contactMatch = existingLeads.find((l) => {
        if (isEditing && l.id === existingLead?.id) return false;
        const ec = (l.contact || "").trim().toLowerCase();
        return ec !== "" && ec === newContact;
      });
      if (contactMatch) {
        return `⚠️ Duplicate: Contact "${form.contact}" already exists for lead "${contactMatch.name}".`;
      }
    }

    if (newName !== "") {
      const nameMatch = existingLeads.find((l) => {
        if (isEditing && l.id === existingLead?.id) return false;
        const en = (l.name || "").trim().toLowerCase();
        return en !== "" && en === newName;
      });
      if (nameMatch) {
        return `⚠️ Duplicate: Name "${form.name}" already exists.`;
      }
    }
    return null;
  }, [form.contact, form.name, existingLeads, existingLead]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleCustomFieldChange = (key: string, value: any) =>
    setForm({ ...form, customFields: { ...form.customFields, [key]: value } });

  const handleTagAdd = () => {
    if (tagInput && !form.tags?.includes(tagInput)) {
      setForm({ ...form, tags: [...(form.tags || []), tagInput] });
      setTagInput("");
    }
  };

  const handleTagRemove = (tag: string) =>
    setForm({ ...form, tags: (form.tags || []).filter((t) => t !== tag) });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.contact || !form.email || !form.source) {
      setLocalError("Name, Contact, Email, and Source are required!");
      return;
    }
    if (duplicateWarning) {
      setLocalError("Cannot save: duplicate lead detected.");
      return;
    }
    setLocalError(null);
    // ✅ FIX: Send date-only string "YYYY-MM-DD" to backend
    // Backend stores it in DATE or DATETIME column — no timezone shift on date-only values
    onSubmit({ ...form, followUp: form.followUp || "" });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-4">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-[420px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{existingLead ? "Edit Lead" : "Add New Lead"}</h2>

        {localError && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded px-3 py-2 mb-3 text-sm">
            {localError}
          </div>
        )}
        {!localError && duplicateWarning && (
          <div className="bg-yellow-50 border border-yellow-400 text-yellow-800 rounded px-3 py-2 mb-3 text-sm flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{duplicateWarning}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Name *</label>
          <input name="name" placeholder="Full name" value={form.name} onChange={handleChange}
            className={`border px-2 py-1.5 mb-3 w-full rounded text-sm ${duplicateWarning?.includes("Name") ? "border-yellow-400 bg-yellow-50" : ""}`}
          />

          <label className="block text-xs font-medium text-gray-600 mb-0.5">Contact * (Phone)</label>
          <input name="contact" placeholder="Phone number" value={form.contact} onChange={handleChange}
            className={`border px-2 py-1.5 mb-3 w-full rounded text-sm ${duplicateWarning?.includes("Contact") ? "border-yellow-400 bg-yellow-50" : ""}`}
          />

          <label className="block text-xs font-medium text-gray-600 mb-0.5">Email *</label>
          <input name="email" placeholder="Email address" value={form.email} onChange={handleChange}
            className="border px-2 py-1.5 mb-3 w-full rounded text-sm"
          />

          <label className="block text-xs font-medium text-gray-600 mb-0.5">Source *</label>
          <input name="source" placeholder="e.g. Website, Referral, Meta Ad" value={form.source} onChange={handleChange}
            className="border px-2 py-1.5 mb-3 w-full rounded text-sm"
          />

          <label className="block text-xs font-medium text-gray-600 mb-0.5">Status</label>
          <select name="status" value={form.status} onChange={handleChange}
            className="border px-2 py-1.5 mb-3 w-full rounded text-sm">
            {statusOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>

          <label className="block text-xs font-medium text-gray-600 mb-0.5">Follow-up Date</label>
          <input
            name="followUp"
            type="date"
            value={form.followUp || ""}
            onChange={handleChange}
            className="border px-2 py-1.5 mb-1 w-full rounded text-sm"
          />
          {/* ✅ Show currently saved follow-up if editing */}
          {existingLead?.followUp && (
            <p className="text-xs text-blue-600 mb-3">
              Currently saved: {extractDateOnly(existingLead.followUp)}
            </p>
          )}
          {!existingLead?.followUp && <div className="mb-3" />}

          {defaultCustomKeys.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">{field.label}</label>
              <input placeholder={field.label} value={form.customFields?.[field.key] || ""}
                onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                className="border px-2 py-1.5 mb-3 w-full rounded text-sm"
              />
            </div>
          ))}

          <label className="block text-xs font-medium text-gray-600 mb-1">Tags</label>
          <div className="mb-3 flex gap-2 flex-wrap items-center border rounded px-2 py-1.5 min-h-[38px]">
            {(form.tags || []).map((tag) => (
              <span key={tag} className="bg-blue-100 text-blue-800 rounded px-2 py-0.5 text-xs flex items-center">
                {tag}
                <button type="button" onClick={() => handleTagRemove(tag)} className="ml-1 text-blue-500 hover:text-red-600 font-bold">&times;</button>
              </span>
            ))}
            <input placeholder="Add tag…" value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="outline-none text-sm flex-1 min-w-[80px]"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleTagAdd(); } }}
            />
            <button type="button" onClick={handleTagAdd}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded">Add</button>
          </div>

          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={!!duplicateWarning}
              className={`px-4 py-2 rounded text-white text-sm font-medium transition ${duplicateWarning ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {existingLead ? "Update" : "Add Lead"}
            </button>
            <button type="button" onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}