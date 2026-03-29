import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://erpnext-209450-0.cloudclusters.net';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Attach Session Cookie to every request automatically
api.interceptors.request.use(async (config) => {
  const sessionCookie = await SecureStore.getItemAsync('frappe_session');
  if (sessionCookie) {
    config.headers.Cookie = sessionCookie;
  }
  return config;
});

/**
 * LOGIN FUNCTION
 */
export const login = async (username, password) => {
  try {
    const response = await api.post('/api/method/login', {
      usr: username,
      pwd: password,
    });

    // 1. Capture the session cookie from headers
    const cookie = response.headers['set-cookie'];
    if (cookie) {
      // In Axios, set-cookie is an array; we take the first element
      await SecureStore.setItemAsync('frappe_session', cookie[0]);
    }

    // 2. Capture and save the full name for the Dashboard Avatar
    const fullName = response.data.full_name || username;
    await SecureStore.setItemAsync('user_name', fullName);

    return response.data;
  } catch (error) {
    console.error("Login API Error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * FETCH LIVE INVENTORY DATA
 * Uses the "Stock Projected Qty" Query Report for maximum accuracy.
 */
export const getLiveInventory = async () => {
  try {
    const response = await api.get('/api/method/frappe.desk.query_report.run', {
      params: {
        report_name: 'Stock Projected Qty',
        // If your ERP has multiple companies, uncomment the line below:
        // filters: JSON.stringify({ company: "Your Company Name" })
      }
    });

    const rawData = response.data.message?.result || [];

    /**
     * CLEANUP LOGIC:
     * 1. Remove the "Total" row (which is an array at the end of the results).
     * 2. Only return actual item objects.
     */
    const cleanData = rawData.filter(row => 
      row && 
      typeof row === 'object' && 
      !Array.isArray(row) && 
      row.item_code
    );

    return cleanData;
  } catch (error) {
    // Session Management: If 401 (Unauthorized), clear the session.
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn("Session expired or invalid. Clearing storage.");
      await SecureStore.deleteItemAsync('frappe_session');
      await SecureStore.deleteItemAsync('user_name');
    }
    
    console.error("Inventory Fetch Error:", error.message);
    throw error;
  }
};