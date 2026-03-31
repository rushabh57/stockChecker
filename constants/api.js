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

api.interceptors.request.use(async (config) => {
  const sessionCookie = await SecureStore.getItemAsync('frappe_session');
  if (sessionCookie) {
    config.headers.Cookie = sessionCookie;
  }
  return config;
});

export const login = async (username, password) => {
  try {
    const response = await api.post('/api/method/login', {
      usr: username,
      pwd: password,
    });
    const cookie = response.headers['set-cookie'];
    if (cookie) await SecureStore.setItemAsync('frappe_session', cookie[0]);
    
    const fullName = response.data.full_name || username;
    await SecureStore.setItemAsync('user_name', fullName);

    return response.data;
  } catch (error) {
    console.error("Login API Error:", error.response?.data || error.message);
    throw error;
  }
};


export const getLiveInventory = async () => {
  try {
    const [reportRes, priceRes, itemRes] = await Promise.all([
      api.get('/api/method/frappe.desk.query_report.run', {
        params: { report_name: 'Stock Projected Qty' }
      }),
      api.get('/api/resource/Item Price', {
        params: { 
          fields: JSON.stringify(["item_code", "price_list", "price_list_rate"]),
          limit_page_length: 5000 
        }
      }),
      api.get('/api/resource/Item', {
        params: { 
          fields: JSON.stringify(["name", "item_name", "has_variants", "disabled"]),
          limit_page_length: 2000 
        }
      })
    ]);

    const stockData = reportRes.data.message?.result || [];
    const priceListData = priceRes.data.data || [];
    const itemMasterData = itemRes.data.data || [];

    // 1. Create a Price Map that handles multiple prices per item
    const priceMap = new Map();
    priceListData.forEach(p => {
      if (!priceMap.has(p.item_code)) {
        priceMap.set(p.item_code, { buying: 0, selling: 0 });
      }
      const entry = priceMap.get(p.item_code);
      if (p.price_list === "Standard Buying") entry.buying = p.price_list_rate;
      if (p.price_list === "Standard Selling") entry.selling = p.price_list_rate;
    });

    const itemMap = new Map(itemMasterData.map(i => [i.name, i]));

    const cleanData = stockData
      .filter(row => row && row.item_code)
      .map(row => {
        const master = itemMap.get(row.item_code) || {};
        const prices = priceMap.get(row.item_code) || { buying: 0, selling: 0 };
        
        return {
          ...row,
          item_name: master.item_name || row.item_name, 
          buying_rate: prices.buying,
          selling_rate: prices.selling
        };
      });

    return cleanData;
  } catch (error) {
    console.error("API Fetch Error:", error);
    throw error;
  }
};

// export const getLiveInventory = async () => {
//   try {
//     const [reportRes, priceRes, itemRes] = await Promise.all([
//       api.get('/api/method/frappe.desk.query_report.run', {
//         params: { report_name: 'Stock Projected Qty' }
//       }),
//       api.get('/api/resource/Item Price', {
//         params: { 
//           fields: JSON.stringify(["item_code", ,"price_list","price_list_rate"]),
//           limit_page_length: 500 
//         }
//       }),
//       api.get('/api/resource/Item', {
//         params: { 
//           fields: JSON.stringify(["name", "item_name", "has_variants", "disabled", "standard_rate", "valuation_rate"]),
//           limit: 2000 
//         }
//       })
//     ]);

//     const stockData = reportRes.data.message?.result || [];
//     const priceListData = priceRes.data.data || [];
//     const itemMasterData = itemRes.data.data || [];

//     // Create lookup maps for performance
//     // Create a nested Map: item_code -> { "Standard Buying": 20, "Standard Selling": 100 }
//     const priceMap = new Map();
//     priceListData.forEach(p => {
//       if (!priceMap.has(p.item_code)) priceMap.set(p.item_code, {});
//       const itemPrices = priceMap.get(p.item_code);
//       itemPrices[p.price_list] = p.price_list_rate;
//     });
//     // const priceMap = new Map(priceListData.map(p => [p.item_code, p.price_list_rate]));
//     const itemMap = new Map(itemMasterData.map(i => [i.name, i]));

//     const cleanData = stockData
//       .filter(row => row && row.item_code)
//       .map(row => {
//         const master = itemMap.get(row.item_code) || {};
//         return {
//           ...row,
//           // Inject master data for frontend filtering
//           item_name: master.item_name || row.item_name, 
//           has_variants: master.has_variants, // 1 = Template, 0 = Variant
//           disabled: master.disabled,
//           valuation_rate: priceMap.get(row.item_code) || master.valuation_rate || 0 ,
//           // Extract specific rates from our new nested object
//           buying_rate: prices["Standard Buying"] || 0,
//           selling_rate: prices["Standard Selling"] || 0
//         };
//       });

//     return cleanData;
//   } catch (error) {
//     if (error.response && (error.response.status === 401 || error.response.status === 403)) {
//       await SecureStore.deleteItemAsync('frappe_session');
//       await SecureStore.deleteItemAsync('user_name');
//     }
//     throw error;
//   }
// };