import axios from "axios";
const API_URL = "https://real-crm-backend-4.onrender.com/api/duplicates";

export const getDuplicateGroups = () => axios.get(API_URL);
export const getDuplicateInfo = (leadId: number) => axios.get(`${API_URL}/${leadId}`);
export const mergeDuplicates = (primaryLeadId: number, secondaryLeadId: number) =>
  axios.post(`${API_URL}/merge`, { primaryLeadId, secondaryLeadId });
