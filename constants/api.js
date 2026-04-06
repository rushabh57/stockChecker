
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Linking } from 'react-native';


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


// Get Brands for a Category (Cover or Glass)
export const getBrandsByCategory = async (category, warehouse) => {
  try {
    let binFilters = [["actual_qty", ">", 0]];
    if (warehouse && warehouse !== 'All') {
      binFilters.push(["warehouse", "=", warehouse]);
    }

    const binResponse = await api.get(`/api/resource/Bin`, {
      params: {
        fields: '["item_code", "actual_qty", "reserved_qty"]',
        filters: JSON.stringify(binFilters),
        limit_page_length: 1000
      }
    });

    // Only show items where Projected Qty (Actual - Reserved) > 0
    const itemsWithStock = binResponse.data.data
      .filter(b => (b.actual_qty - (b.reserved_qty || 0)) > 0)
      .map(b => b.item_code);
    
    if (itemsWithStock.length === 0) return [];

    const response = await api.get(`/api/resource/Item`, {
      params: {
        fields: '["name", "brand"]',
        filters: JSON.stringify([
          ["item_group", "=", category],
          ["disabled", "=", 0],
          ["name", "in", itemsWithStock]
        ]),
        limit_page_length: 500
      }
    });

    const extractedBrands = response.data.data.map((item) => {
      let brandName = (item.brand && item.brand.trim() !== "") 
        ? item.brand 
        : item.name.split('-')[0]; 
      return brandName.trim(); 
    });

    return [...new Set(extractedBrands)].filter(b => b && b !== "");
  } catch (error) {
    console.error("Error fetching filtered brands:", error);
    return [];
  }
};

// Get Brand Stock Details (ONLY ONE COPY) ---
export const getBrandStockDetails = async (category, brand, search = '') => {
  try {
    const response = await api.get(`/api/method/get_categorized_stock`, {
      params: { category, brand,search_term: search }
    });
    
    let items = response.data.message || [];
    if (items.length === 0) return [];

    // FIX 1: Fetch the report WITHOUT the brand filter 
    // because some items have Brand as 'null' in ERPNext
    const reportResponse = await api.get(`/api/method/frappe.desk.query_report.run`, {
      params: {
        report_name: "Stock Projected Qty",
        filters: JSON.stringify({ 
          "company": "murlidhar-mobiles"
          // Removed "brand": brand here
        })
      }
    });

    const liveStockRows = (reportResponse.data.message.result || []).filter(row => row.item_code);

    return items.map(item => {
        const itemReportRows = liveStockRows.filter(row => row.item_code === item.name);

        return {
            ...item,
            stocks: item.stocks.map(s => {
                const matchingRow = itemReportRows.find(r => r.warehouse === s.warehouse);
                
                // FIX 2: Better matching logic
                if (matchingRow) {
                  const posReserved = matchingRow.reserved_qty_for_pos || 0;
                  const otherReserved = matchingRow.reserved_qty || 0;
                  
                  return {
                      ...s,
                      actual_qty: matchingRow.actual_qty,
                      reserved_qty: otherReserved + posReserved,
                      projected_qty: matchingRow.projected_qty // This MUST be 10 now
                  };
                }

                // Fallback if no report row found
                return { ...s, reserved_qty: 0, projected_qty: s.actual_qty };
            })
        };
    });
  } catch (error) {
    console.error("Fetch Live Stock Error:", error);
    throw error;
  }
};

// Full Data Mapping 
export const getFullItemDetails = async (category, brand, search = '') => {
  try {
    const stockData = await getBrandStockDetails(category, brand, search);
    if (!stockData || stockData.length === 0) return [];

    const itemCodes = stockData.map((i) => i.name);

    const priceResponse = await api.get(`/api/resource/Item Price`, {
      params: {
        filters: JSON.stringify([
          ["item_code", "in", itemCodes],
          ["price_list", "in", ["Standard Selling", "Standard Buying"]]
        ]),
        fields: '["item_code", "price_list", "price_list_rate"]',
        limit_page_length: 1000
      }
    });

    const allPrices = priceResponse.data.data || [];

    return stockData.map((item) => {
      const sell = allPrices.find((p) => p.item_code === item.name && p.price_list === "Standard Selling");
      const buy = allPrices.find((p) => p.item_code === item.name && p.price_list === "Standard Buying");
  
      // 1. Calculate Total Projected Qty safely
      const totalProjected = item.stocks.reduce((sum, s) => {
          return sum + (Number(s.projected_qty) || 0); 
      }, 0);
  
      // console.log(`-----------------------------------------------------`);
      // console.log(`Calculating projected stock for ${item.item_name}:`);
      // // 2. Fixed LOG: Use totalProjected instead of item.projected_qty (which is undefined)
      // console.log(`[STOK] ${item.item_name} | Actual: ${item.stocks.reduce((a,b) => a + (b.actual_qty || 0), 0)} | Real Sellable (Projected): ${totalProjected}`);
      // console.log(`-----------------------------------------------------`);
  
      return {
          ...item,
          selling_price: sell ? sell.price_list_rate : 0,
          buying_price: buy ? buy.price_list_rate : (item.buying_price || 0),
          real_count: totalProjected // This will now correctly show 10
      };
  });
  } catch (error) {
    console.error("Mapping Error:", error);
    return [];
  }
};


// for direct erp serach
export const searchInventory = async (query, page = 0) => {
  try {
    const response = await api.get(`/api/method/search_items_paged`, {
      params: { 
        search_term: query,
        page_start: page * 20,
        page_length: 20
      }
    });
    return response.data.message;
  } catch (error) {
    console.error("Search API Error:", error);
    throw error;
  }
};

// get brand logos
const logoCache = {};

export const getBrandLogo = async (brandName) => {
  if (logoCache[brandName]) return logoCache[brandName]; // Return cached version

  try {
    const response = await api.get(`/api/resource/Brand/${encodeURIComponent(brandName)}`, {
      params: { fields: '["image"]' }
    });
    const image = response.data.data.image;
    logoCache[brandName] = image; // Save to cache
    return image;
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error(`Error fetching logo for ${brandName}:`, error.message);
    }
    return null;
  }
};
// get warehouses
export const getWarehouses = async () => {
  try {
      const response = await axios.get(`${BASE_URL}/api/resource/Warehouse`, {
          params: {
              fields: '["name"]',
              filters: '[["is_group", "=", 0]]'
          }
      });
      return response.data.data.map((w) => w.name);
  } catch (error) {
      return [];
  }
};


// get or create reports
export const getCustomInventoryReport = async (startDate, endDate) => {
  try {
    // 1. Get the Core Ledger
    const response = await api.get(`/api/method/frappe.desk.query_report.run`, {
      params: {
        report_name: "Stock Ledger",
        filters: JSON.stringify({
          company: "murlidhar-mobiles",
          from_date: startDate,
          to_date: endDate,
          include_item_description: 1
        })
      }
    });

    const rows = response.data.message.result || [];
    const validRows = rows.filter(row => row.voucher_no);
    const uniqueItemCodes = [...new Set(validRows.map(r => r.item_code))];

    // 2. Fetch Item Details (Group, Brand) and Prices in parallel for performance
    const [itemDetails, itemPrices] = await Promise.all([
      api.get(`/api/resource/Item`, {
        params: {
          fields: '["name", "brand", "item_group", "item_name"]',
          filters: JSON.stringify([["name", "in", uniqueItemCodes]]),
          limit_page_length: 1000
        }
      }),
      api.get(`/api/resource/Item Price`, {
        params: {
          fields: '["item_code", "price_list", "price_list_rate"]',
          filters: JSON.stringify([
            ["item_code", "in", uniqueItemCodes],
            ["price_list", "in", ["Standard Selling", "Standard Buying"]]
          ]),
          limit_page_length: 1000
        }
      })
    ]);

    const itemsMap = itemDetails.data.data.reduce((acc, i) => ({ ...acc, [i.name]: i }), {});
    const priceMap = itemPrices.data.data.reduce((acc, p) => {
      if (!acc[p.item_code]) acc[p.item_code] = {};
      acc[p.item_code][p.price_list] = p.price_list_rate;
      return acc;
    }, {});

    // 3. Final Mapping into your requested Column Format
    return validRows.map(row => {
      const itemInfo = itemsMap[row.item_code] || {};
      const name = row.item_code || "";
      
      // Dynamic logic for Cover Type / Glass Side
      const isGlass = itemInfo.item_group?.toLowerCase().includes('glass');
      const side = name.toLowerCase().includes('front') ? 'Front' : 
                   name.toLowerCase().includes('back') ? 'Back' : 'Side';

      return {
        date: row.posting_date,
        time: row.posting_time,
        id: row.voucher_no,
        itemName: row.item_code,
        itemGroup: itemInfo.item_group || "General",
        brand: itemInfo.brand || name.split('-')[0] || "Generic",
        model: name.split('-').slice(1, 3).join(' ') || "N/A",
        variantInfo: isGlass ? `${side} Glass` : "Cover/Case",
        warehouse: row.warehouse?.split(' - ')[0] || "Main",
        qty: row.actual_qty,
        projected_qty: row.qty_after_transaction,
        selling_price: priceMap[row.item_code]?.["Standard Selling"] || 0,
        buying_price: priceMap[row.item_code]?.["Standard Buying"] || 0,
        vendor: row.voucher_type === "Purchase Receipt" ? (row.party || "Supplier") : "Customer Sale"
      };
    });
  } catch (error) {
    console.error("Report Bundling Error:", error);
    return [];
  }
};
// 

// constants/api.js
export const downloadInventoryReport = (startDate, endDate) => {
  const baseUrl = "https://erpnext-209450-0.cloudclusters.net";
  const filters = encodeURIComponent(JSON.stringify({
    from_date: startDate,
    to_date: endDate,
    company: "murlidhar-mobiles"
  }));
  
  // Direct link to ERPNext's CSV export engine
  const url = `${baseUrl}/api/method/frappe.desk.query_report.export_query?report_name=Stock%20Ledger&filters=${filters}&file_format=CSV`;
  Linking.openURL(url);
};