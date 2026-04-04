import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, GlobalStyles } from '@/constants/Styles';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View
} from 'react-native';

export default function CategoryPage() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme as keyof typeof Colors];
  const router = useRouter();
  const [userName, setUserName] = useState('Admin');

  useEffect(() => {
    const fetchUser = async () => {
      const storedName = await SecureStore.getItemAsync('user_name');
      if (storedName) setUserName(storedName);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to exit?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive", onPress: async () => {
          await SecureStore.deleteItemAsync('frappe_session');
          router.replace('/login');
        }
      }
    ]);
  };

  const categories = [
    { id: 'Cover', label: 'MOBILE COVERS', icon: 'square.stack.fill' },
    { id: 'Glass', label: 'TEMPERED GLASS', icon: 'square.stack.fill' },
  ];

  return (
    <ThemedView style={[GlobalStyles.container, { backgroundColor: theme.background }]}>
      {/* Header matching Dashboard */}
      <View style={GlobalStyles.header}>
        <View style={GlobalStyles.titleRow}>
          <ThemedText style={[GlobalStyles.mainTitle, { color: theme.text }]}>
            Live Stock
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={handleLogout} style={[GlobalStyles.iconBtn, { backgroundColor: theme.logoutBg }]}>
              <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={theme.logouttint} />
            </Pressable>
          </View>
        </View>

        {/* User Info Bar */}
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.iconBtn, borderColor: theme.border }]}>
              <Text style={[styles.avatarText, { color: theme.tint }]}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.welcomeText, { color: theme.textMuted }]}>Welcome back,</Text>
              <Text style={[styles.userNameText, { color: theme.text }]}>{userName}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Category List Layout */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.categoryList}>
          {categories.map((cat) => (
            <Pressable 
              key={cat.id} 
              style={[styles.menuCard, { borderBottomColor: theme.border }]} 
              onPress={() => router.push({ pathname: '/brands', params: { category: cat.id } })}
            >
              <View style={[GlobalStyles.iconBtn, { marginRight: 15, backgroundColor: theme.iconBtn }]}>
                <IconSymbol name={cat.icon as any} size={18} color={theme.tint} />
              </View>
              <Text style={[styles.menuText, { color: theme.text }]}>{cat.label}</Text>
              <IconSymbol name="chevron.right" size={14} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  userHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 10, 
    paddingBottom: 15 
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { 
    width: 42, 
    height: 42, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1 
  },
  avatarText: { fontWeight: 'bold', fontSize: 18 },
  welcomeText: { fontSize: 11 },
  userNameText: { fontSize: 15, fontWeight: 'bold' },
  categoryList: { gap: 4 },
  menuCard: { 
    width: '100%', 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    paddingVertical: 18 
  },
  menuText: { 
    fontWeight: '900', 
    fontSize: 14, 
    flex: 1, 
    letterSpacing: 0.5 
  },
});

// import { ThemedText } from '@/components/themed-text';
// import { ThemedView } from '@/components/themed-view';
// import { IconSymbol } from '@/components/ui/icon-symbol';
// import { getLiveInventory } from '@/constants/api';
// import { Colors, GlobalStyles } from '@/constants/Styles';
// import { useRouter } from 'expo-router';
// import * as SecureStore from 'expo-secure-store';
// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   BackHandler,
//   DeviceEventEmitter,
//   Image,
//   Pressable,
//   RefreshControl,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   useColorScheme,
//   View
// } from 'react-native';

// export default function InventoryDashboard() {
//   const colorScheme = useColorScheme() ?? 'light';
//   const theme = Colors[colorScheme as keyof typeof Colors];

//   const router = useRouter();
//   const [rawData, setRawData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [search, setSearch] = useState('');
//   const [activeWarehouse, setActiveWarehouse] = useState('All');
//   const [userName, setUserName] = useState('Admin');

//   const [viewMode, setViewMode] = useState('CATEGORIES');
//   const [selectedCategory, setSelectedCategory] = useState(null);
//   const [selectedBrand, setSelectedBrand] = useState(null);

//   // --- DB SEARCH LOGIC ---

//   const loadData = useCallback(async (isManual = false, term = '') => {
//     if (isManual) setRefreshing(true);
//     try {
//       // If we have a brand selected AND a search term, combine them
//       // Otherwise just use the term or the brand
//       let query = '';
//       if (selectedBrand && term) {
//         query = `${selectedBrand} ${term}`;
//       } else {
//         query = term || selectedBrand || '';
//       }
  
//       const data = await getLiveInventory(query); 
//       setRawData(data);
//     } catch (err) {
//       console.error("Load Error:", err);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, [selectedBrand]);
//   // Handle Search Typing (Debounced)
//   useEffect(() => {
//     const delayDebounceFn = setTimeout(() => {
//       // Only trigger DB search if we are looking at items
//       if (viewMode === 'ITEMS') {
//         loadData(false, search);
//       }
//     }, 500); // 500ms delay

//     return () => clearTimeout(delayDebounceFn);
//   }, [search, viewMode, loadData]);

//   // Initial load when brand is selected
//   useEffect(() => {
//     if (viewMode === 'ITEMS') {
//       setLoading(true);
//       loadData();
//     } else if (viewMode === 'CATEGORIES' || viewMode === 'BRANDS') {
//       // Load all for high-level navigation
//       loadData();
//     }
//   }, [selectedBrand, viewMode, loadData]);

//   // --- END DB SEARCH LOGIC ---

//   useEffect(() => {
//     const subscription = DeviceEventEmitter.addListener('RESET_HOME_VIEW', () => {
//       setViewMode('CATEGORIES');
//       setSelectedCategory(null);
//       setSelectedBrand(null);
//       setSearch('');
//     });
//     return () => subscription.remove();
//   }, []);

//   useEffect(() => {
//     const fetchUser = async () => {
//       const storedName = await SecureStore.getItemAsync('user_name');
//       if (storedName) setUserName(storedName);
//     };
//     fetchUser();
//   }, []);

//   const handleLogout = async () => {
//     Alert.alert("Logout", "Are you sure you want to exit?", [
//       { text: "Cancel", style: "cancel" },
//       {
//         text: "Logout", style: "destructive", onPress: async () => {
//           await SecureStore.deleteItemAsync('frappe_session');
//           router.replace('/login');
//         }
//       }
//     ]);
//   };

//   useEffect(() => {
//     const backAction = () => {
//       if (viewMode !== 'CATEGORIES') {
//         goBack();
//         return true;
//       }
//       return false;
//     };
//     const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
//     return () => backHandler.remove();
//   }, [viewMode]);

//   const dynamicWarehouses = useMemo(() => {
//     const list = new Set(rawData.map(b => b.warehouse).filter(Boolean));
//     return ['All', ...Array.from(list)].sort();
//   }, [rawData]);

//     const processedData = useMemo(() => {
//       // 1. Map everything first
//       const mapped = rawData.map(item => {
//         const fullName = item.item_name || "";
//         const nameParts = fullName.split('-'); 
//         const category = fullName.toLowerCase().includes('glass') ? 'Glass' : 'Cover';
//         const rawBrand = (item.brand || nameParts[0] || "OTHER").trim();
    
//         return {
//           ...item,
//           category,
//           brand: rawBrand,
//           model: (nameParts[1] || "Generic").trim(),
//           displayType: (nameParts[2] || "").trim(),
//           available: Math.round(item.projected_qty || 0),
//           buyingPrice: item.buying_rate || 0,
//           sellingPrice: item.selling_rate || 0
//         };
//       });
    
//       // 2. Apply Filters
//       return mapped.filter(item => {
//         // CATEGORY FILTER: Must match 'Glass' or 'Cover' selected
//         if (selectedCategory && item.category !== selectedCategory) return false;
    
//         // BRAND FILTER: If in ITEMS mode, must match selected brand
//         if (viewMode === 'ITEMS' && selectedBrand && item.brand !== selectedBrand) return false;
    
//         // WAREHOUSE FILTER: Only applies in ITEMS mode
//         if (viewMode === 'ITEMS' && activeWarehouse !== 'All' && item.warehouse !== activeWarehouse) return false;
    
//         // SEARCH FILTER: Only applies in ITEMS mode
//         if (viewMode === 'ITEMS' && search) {
//           const keywords = search.toLowerCase().split(/[\s-]+/).filter(k => k);
//           const match = keywords.every(kw => item.item_name.toLowerCase().includes(kw));
//           if (!match) return false;
//         }
    
//         return true; // Keep the item
//       });
//     }, [rawData, activeWarehouse, viewMode, search, selectedCategory, selectedBrand]);

//   const goBack = () => {
//     setSearch('');
//     if (viewMode === 'ITEMS') setViewMode('BRANDS');
//     else if (viewMode === 'BRANDS') setViewMode('CATEGORIES');
//   };

//   const RenderCategories = () => (
//     <View style={styles.categoryList}>
//       {['Glass', 'Cover'].map(cat => (
//         <Pressable key={cat} style={[styles.menuCard, { borderBottomColor: theme.border }]} onPress={() => { setSelectedCategory(cat); setViewMode('BRANDS'); }}>
//           <View style={[GlobalStyles.iconBtn, GlobalStyles.cardBadge, { marginRight: 15, backgroundColor: theme.iconBtn }]}>
//             <IconSymbol name={cat === 'Glass' ? 'square.stack.fill' : 'square.stack'} size={18} color={theme.tint} />
//           </View>
//           <Text style={[styles.menuText, { color: theme.text }]}>{cat.toUpperCase()}</Text>
//           <IconSymbol name="chevron.right" size={14} color={theme.textMuted} />
//         </Pressable>
//       ))}
//     </View>
//   );

//   const RenderBrands = () => {
//     const brands = [...new Set(processedData.filter(i => i.category === selectedCategory).map(i => i.brand))].sort();
//     return (
//       <View style={GlobalStyles.brandGrid}>
//         {brands.map(brand => (
//           <Pressable key={brand} style={[GlobalStyles.brandCard]} onPress={() => { setSelectedBrand(brand); setViewMode('ITEMS'); }}>
//             <View style={[GlobalStyles.brandLogoCircle, { backgroundColor: theme.card, borderColor: theme.border }]}>
//               <Image
//                 source={{ uri: `https://erpnext-209450-0.cloudclusters.net/files/${brand.trim().toLowerCase()}.png` }}
//                 style={{ width: '70%', height: '70%', resizeMode: 'contain', zIndex: 2 }}
//               />
//               <Text style={[styles.brandInitial, { position: 'absolute', zIndex: 1, color: theme.textMuted }]}>
//                 {brand.trim().charAt(0).toUpperCase()}
//               </Text>
//             </View>
//             <Text style={[styles.brandText, { color: theme.textMuted }]}>{brand.trim().toUpperCase()}</Text>
//           </Pressable>
//         ))}
//       </View>
//     );
//   };

//   const RenderItems = () => {
//     // DB has already filtered for Brand and Search Term, 
//     // we just apply the Category filter to be safe.
//     const itemsToShow = processedData.filter(i => i.category === selectedCategory);

//     return itemsToShow.map((item, idx) => (
//       <View key={idx} style={[GlobalStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
//         <View style={styles.cardTop}>
//           <View style={{ flex: 1 }}>
//             <ThemedText style={[styles.modelName, { color: theme.text }]}>{item.model}</ThemedText>
//             <View style={{ display: "flex", flexDirection: "row", gap: 8, marginTop: 8 }}>
//               <Text style={[styles.cardWarehouse, { color: theme.tint, backgroundColor: theme.filterBg }]}>{item.warehouse.split(' - ')[0]}</Text>
//               <Text style={[styles.typeText, { color: theme.text, backgroundColor: theme.iconBtn }]}>{item.displayType}</Text>
//               <Text style={[styles.priceValue, { color: theme.accent, backgroundColor: theme.iconBtn }]}>₹{item.buyingPrice.toLocaleString('en-IN')}</Text>
//             </View>
//           </View>
//           <View style={[styles.qtyBadge, { backgroundColor: theme.text }]}>
//             <Text style={[styles.qtyCount, { color: theme.background }]}>{item.available}</Text>
//             <Text style={[styles.qtyLabel, { color: theme.background }]}>PCS</Text>
//           </View>
//         </View>
//       </View>
//     ));
//   };

//   return (
//     <ThemedView style={[GlobalStyles.container, { backgroundColor: theme.background }]}>
//       <View style={GlobalStyles.header}>
//         <View style={GlobalStyles.titleRow}>
//           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: "flex-start", gap: 12 }}>
//             {viewMode !== 'CATEGORIES' && (
//               <Pressable onPress={goBack} style={[GlobalStyles.iconBtn, { marginRight: -16, marginLeft: -8 }]}>
//                 <IconSymbol name="chevron.left" size={18} color={theme.text} />
//               </Pressable>
//             )}
//             <ThemedText style={[GlobalStyles.mainTitle, { color: theme.text }]}>
//               {viewMode === 'CATEGORIES' ? 'Live Stock' : viewMode === 'BRANDS' ? selectedCategory : selectedBrand}
//             </ThemedText>
//           </View>
//           <View style={{ display: 'flex', gap: 12, flexDirection: 'row', alignItems: 'center' }}>
//             <Pressable onPress={() => loadData(true, search)} style={[GlobalStyles.iconBtn, { backgroundColor: theme.refreshBg }]}>
//               {refreshing ? <ActivityIndicator size="small" color={theme.refreshtint} /> : <IconSymbol name="arrow.counterclockwise" size={18} color={theme.refreshtint} />}
//             </Pressable>
//             <Pressable onPress={handleLogout} style={[GlobalStyles.iconBtn, { backgroundColor: theme.logoutBg }]}>
//               <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={theme.logouttint} />
//             </Pressable>
//           </View>
//         </View>

//         <View style={styles.userHeader}>
//           <View style={styles.userInfo}>
//             <View style={[styles.avatar, { backgroundColor: theme.iconBtn, borderColor: theme.border }]}>
//               <Text style={[styles.avatarText, { color: theme.tint }]}>{userName.charAt(0).toUpperCase()}</Text>
//             </View>
//             <View>
//               <Text style={[styles.welcomeText, { color: theme.textMuted }]}>Welcome back,</Text>
//               <Text style={[styles.userNameText, { color: theme.text }]}>{userName}</Text>
//             </View>
//           </View>
//         </View>

//         {viewMode !== 'CATEGORIES' && (
//           <>
//             {viewMode === 'ITEMS' && (
//               <View style={[GlobalStyles.searchPill, { marginTop: 10, backgroundColor: theme.iconBtn }]}>
//                 <IconSymbol name="magnifyingglass" size={18} color={theme.textMuted} />
//                 <TextInput
//                   style={[GlobalStyles.textInput, { color: theme.text }]}
//                   placeholder={`Search in ${selectedBrand}...`}
//                   placeholderTextColor={theme.textMuted}
//                   value={search}
//                   onChangeText={setSearch}
//                 />
//               </View>
//             )}
//             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
//               {dynamicWarehouses.map(w => (
//                 <Pressable key={w} onPress={() => setActiveWarehouse(w)} style={styles.tabItem}>
//                   <Text style={[styles.tabText, { color: theme.textMuted }, activeWarehouse === w && { color: theme.text }]}>
//                     {w === 'All' ? 'ALL SHOPS' : w.split(' - ')[0]}
//                   </Text>
//                   {activeWarehouse === w && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
//                 </Pressable>
//               ))}
//             </ScrollView>
//           </>
//         )}
//       </View>

//       <ScrollView
//         contentContainerStyle={{ padding: 16 }}
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true, search)} tintColor={theme.tint} />}
//       >
//         {loading && !refreshing ? (
//           <ActivityIndicator color={theme.tint} style={{ marginTop: 50 }} />
//         ) : (
//           viewMode === 'CATEGORIES' ? <RenderCategories /> : viewMode === 'BRANDS' ? <RenderBrands /> : <RenderItems />
//         )}
//       </ScrollView>
//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 5 },
//   userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
//   avatar: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
//   avatarText: { fontWeight: 'bold', fontSize: 18 },
//   welcomeText: { fontSize: 11 },
//   userNameText: { fontSize: 15, fontWeight: 'bold' },
//   categoryList: { gap: 12 },
//   menuCard: { width: '100%', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 12 },
//   menuText: { fontWeight: '900', fontSize: 14, flex: 1 },
//   brandInitial: { fontSize: 26, fontWeight: 'bold' },
//   brandText: { marginTop: 8, fontSize: 10, fontWeight: '800', textAlign: 'center' },
//   cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
//   cardWarehouse: { fontSize: 10, fontWeight: '800', marginBottom: 4, alignSelf: 'flex-start', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 },
//   modelName: { fontSize: 18, fontWeight: '800' },
//   typeText: { fontSize: 10, fontWeight: '800', marginBottom: 4, alignSelf: 'flex-start', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 },
//   qtyBadge: { borderRadius: 14, width: 56, height: "auto", justifyContent: 'center', alignItems: 'center' },
//   qtyCount: { fontSize: 18, fontWeight: '900' },
//   qtyLabel: { fontSize: 8, fontWeight: 'bold' },
//   priceValue: { fontSize: 10, fontWeight: '800', marginBottom: 4, alignSelf: 'flex-start', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 },
//   tabRow: { flexDirection: 'row', marginTop: 15 },
//   tabItem: { marginRight: 22, paddingVertical: 8 },
//   tabText: { fontSize: 12, fontWeight: '800' },
//   activeIndicator: { height: 6, width: 12, borderRadius: 99, marginTop: 4, alignSelf: 'center' }
// });



