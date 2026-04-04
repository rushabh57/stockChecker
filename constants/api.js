
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


// 1. Get Brands for a Category (Cover or Glass)
export const getBrandsByCategory = async (category) => {
  try {
    const response = await api.get(`/api/method/get_categorized_stock`, {
      params: { category: category }
    });
    return response.data.message; // Returns ['Apple', 'Samsung', 'Realme']
  } catch (error) {
    console.error("Fetch Brands Error:", error);
    throw error;
  }
};

// 2. Get Items and Shop Stock for a specific Brand
export const getBrandStockDetails = async (category, brand) => {
  try {
    const response = await api.get(`/api/method/get_categorized_stock`, {
      params: { 
        category: category,
        brand: brand 
      }
    });
    return response.data.message; 
    /* Returns: 
       [{
         "item_name": "Samsung-S22-Silicon",
         "buying_price": 150,
         "stocks": [
           {"warehouse": "Shop 1", "actual_qty": 5},
           {"warehouse": "Shop 2", "actual_qty": 2}
         ]
       }] 
    */
  } catch (error) {
    console.error("Fetch Stock Error:", error);
    throw error;
  }
};

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