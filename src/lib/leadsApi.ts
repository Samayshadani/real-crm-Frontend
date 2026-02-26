import axios from "axios";

// Auto-detect environment (true in dev/localhost)
// const isLocal = import.meta.env.DEV || 
//                 process.env.NODE_ENV === 'development' || 
//                 window.location.hostname === 'localhost' ||
//                 window.location.hostname === '127.0.0.1';

// const API_BASE = isLocal 
//   ? "http://localhost:4000/api/leads"
//   : "https://barphani-backend.vasifytech.com/api/leads";

// const CONTACTS_BASE = isLocal 
//   ? "http://localhost:4000/api/contacts"
//   : "https://barphani-backend.vasifytech.com/api/contacts";


const  API_BASE = "https://barphani-backend.vasifytech.com/api/leads";
const  CONTACTS_BASE = "https://barphani-backend.vasifytech.com/api/contacts";

console.log(`🌐 Using API_BASE: ${API_BASE}`);  // Debug: check browser console

export const getLeads = (config?: any) => axios.get(API_BASE, config);
export const getLead = (id: number) => axios.get(`${API_BASE}/${id}`);
export const addLead = (data: any) => axios.post(API_BASE, data);
export const updateLead = (id: number, data: any) => axios.put(`${API_BASE}/${id}`, data);
export const deleteLead = (id: number) => axios.delete(`${API_BASE}/${id}`);

export async function addBulkLeads(formData: FormData) {
  const res = await fetch(`${API_BASE}/import`, {
    method: "POST",
    body: formData,
  }); 
  if (!res.ok) throw new Error("Bulk import failed");
  return res.json();  // Return data for better UX
}

// --- Get WhatsApp Leads (Mongo/Meta) ---
export async function getWhatsappLeads(): Promise<any[]> {
  const res = await fetch(CONTACTS_BASE);
  if (!res.ok) throw new Error("Failed to fetch WhatsApp leads");
  return res.json();
}
