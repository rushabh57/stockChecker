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

// Attach Session Cookie to every request
api.interceptors.request.use(async (config) => {
  const sessionCookie = await SecureStore.getItemAsync('frappe_session');
  if (sessionCookie) {
    config.headers.Cookie = sessionCookie;
  }
  return config;
});

/**
 * LOGIN FUNCTION
 * Call this from your login.tsx
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
      await SecureStore.setItemAsync('frappe_session', cookie[0]);
    }

    // 2. Capture and save the full name for the Dashboard Avatar
    // Frappe returns 'full_name' in the response body on success
    const fullName = response.data.full_name || username;
    await SecureStore.setItemAsync('user_name', fullName);

    return response.data;
  } catch (error) {
    console.error("Login API Error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * FETCH INVENTORY DATA
 */
export const getLiveInventory = async () => {
  try {
    const [binRes, itemRes, posRes] = await Promise.all([
      api.get('/api/resource/Bin', { 
        params: { 
          fields: JSON.stringify(["item_code", "warehouse", "actual_qty", "reserved_qty", "stock_value", "valuation_rate"]),
          limit: 2000 
        }
      }),
      api.get('/api/resource/Item', { 
        params: { 
          fields: JSON.stringify(["name", "item_name", "standard_rate", "brand", "item_group"]),
          limit: 2000 
        }
      }),
      api.get('/api/resource/POS Invoice', { 
        params: { 
          filters: JSON.stringify([["docstatus", "=", 0]]), 
          fields: JSON.stringify(["name"]) 
        }
      })
    ]);

    const invoiceDetails = await Promise.all(
      (posRes.data.data || []).map(inv => api.get(`/api/resource/POS Invoice/${inv.name}`))
    );

    return {
      bins: binRes.data.data || [],
      items: itemRes.data.data || [],
      draftSales: invoiceDetails.flatMap(res => 
        (res.data.data.items || []).map(i => ({ 
          item_code: i.item_code, 
          warehouse: i.warehouse, 
          qty: i.qty 
        }))
      )
    };
  } catch (error) {
    // AUTO-CLEANUP: If 401/403, session is invalid. Clear storage.
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn("Session expired. Clearing local storage.");
      await SecureStore.deleteItemAsync('frappe_session');
      await SecureStore.deleteItemAsync('user_name');
    }
    console.error("Inventory Fetch Error:", error.message);
    throw error;
  }
};