import axios from "axios";

const isLocal = import.meta.env.DEV || window.location.hostname === 'localhost';
const API_URL = isLocal ? "http://localhost:4000/api/duplicates" : "https://barphani-backend.vasifytech.com/api/duplicates";
// Then use API_URL in exports

// const API_URL = "https://barphani-backend.vasifytech.com/api/duplicates";
// const API_URL = "http://localhost:4000/api/duplicates";

export const getDuplicateGroups = () => axios.get(API_URL);
export const getDuplicateInfo = (leadId: number) => axios.get(`${API_URL}/${leadId}`);
export const mergeDuplicates = (primaryLeadId: number, secondaryLeadId: number) =>
  axios.post(`${API_URL}/merge`, { primaryLeadId, secondaryLeadId });
