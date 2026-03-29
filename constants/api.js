import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://erpnext-209450-0.cloudclusters.net';

// Create the axios instance WITHOUT a hardcoded Authorization header
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Use an Interceptor to attach the Cookie before every request
api.interceptors.request.use(async (config) => {
  const sessionCookie = await SecureStore.getItemAsync('frappe_session');
  if (sessionCookie) {
    config.headers.Cookie = sessionCookie;
  }
  return config;
});

export const getLiveInventory = async () => {
  try {
    const [binRes, itemRes, posRes] = await Promise.all([
      // 1. Fetching live stock levels from Bins
      api.get('/api/resource/Bin', { 
        params: { 
          fields: JSON.stringify(["item_code", "warehouse", "actual_qty", "reserved_qty", "stock_value", "valuation_rate"]),
          limit: 2000 
        }
      }),
      // 2. Fetching actual item details
      api.get('/api/resource/Item', { 
        params: { 
          fields: JSON.stringify(["name", "item_name", "standard_rate", "brand", "item_group"]),
          limit: 2000 
        }
      }),
      // 3. Fetching draft invoices (Pending sales)
      api.get('/api/resource/POS Invoice', { 
        params: { 
          filters: JSON.stringify([["docstatus", "=", 0]]), 
          fields: JSON.stringify(["name"]) 
        }
      })
    ]);

    // Fetch individual invoice details for draft sales
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
    // If Frappe returns 401 or 403, the session is likely dead
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error("Session Expired or Unauthorized");
      // Optionally clear the storage here:
      // await SecureStore.deleteItemAsync('frappe_session');
    }
    console.error("API Fetch Error:", error.message);
    throw error;
  }
};