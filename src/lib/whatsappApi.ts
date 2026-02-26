import axios from "axios";
const API_URL = "https://barphani-backend.vasifytech.com/api/whatsapp";
// const API_URL = "http://localhost:4000/api/whatsapp";

export const getTemplates = () => axios.get(`${API_URL}/templates`);
export const sendTemplate = (payload: any) => axios.post(`${API_URL}/send`, payload);

export async function sendWhatsAppMessage({ to, message }: { to: string; message: string }) {
  // Later use official WhatsApp Cloud API

  console.log("SENDING WHATSAPP MSG →", to, message);

  return new Promise((resolve) => setTimeout(resolve, 500));
}


