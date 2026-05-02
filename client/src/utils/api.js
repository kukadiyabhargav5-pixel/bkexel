import axios from 'axios';

const API_BASE_URL = import.meta.env.PROD 
  ? 'https://bkexel.onrender.com/api' 
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Sheet API functions
export const saveSheet = async (sheetData) => {
  const response = await api.post('/sheets', sheetData);
  return response.data;
};

export const getAllSheets = async () => {
  const response = await api.get('/sheets');
  return response.data;
};

export const getSheet = async (id) => {
  const response = await api.get(`/sheets/${id}`);
  return response.data;
};

export const deleteSheet = async (id) => {
  const response = await api.delete(`/sheets/${id}`);
  return response.data;
};

export const downloadSheetFromServer = async (id) => {
  const response = await api.post(`/sheets/download/${id}`, null, {
    responseType: 'blob',
  });
  return response.data;
};

// Generate Excel with bold headers via server (no save)
export const generateExcelFromServer = async (data) => {
  const response = await api.post('/sheets/generate', data, {
    responseType: 'blob',
  });
  return response.data;
};

export default api;
