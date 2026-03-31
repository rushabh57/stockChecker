import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getLiveInventory } from '@/constants/api';
import { Colors, GlobalStyles } from '@/constants/Styles';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View
} from 'react-native';

export default function InventoryDashboard() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme as keyof typeof Colors];
  
  const router = useRouter();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeWarehouse, setActiveWarehouse] = useState('All');
  const [userName, setUserName] = useState('Admin');

  const [viewMode, setViewMode] = useState('CATEGORIES');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);

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
          // Change 'user_session' to 'frappe_session'
          await SecureStore.deleteItemAsync('frappe_session'); 
          router.replace('/login');
        }
      }
    ]);
  };

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await getLiveInventory();
      setRawData(data);
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    const backAction = () => {
      if (viewMode !== 'CATEGORIES') {
        goBack();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [viewMode]);

  const dynamicWarehouses = useMemo(() => {
    const list = new Set(rawData.map(b => b.warehouse).filter(Boolean));
    return ['All', ...Array.from(list)].sort();
  }, [rawData]);

  const processedData = useMemo(() => {
    return rawData.map(item => {
      const fullName = item.item_name || "";
      const nameParts = fullName.split('-');
      const category = fullName.toLowerCase().includes('glass') ? 'Glass' : 'Cover';
      const rawBrand = (item.brand || nameParts[0] || "OTHER").trim();

      return {
        ...item,
        category,
        brand: rawBrand,
        model: (nameParts[1] || "Generic").trim(),
        displayType: (nameParts[2] || "").trim(),
        available: Math.round(item.projected_qty || 0),
        price: item.valuation_rate || 0,
        buyingPrice: item.buying_rate || 0,
        sellingPrice: item.selling_rate || 0
      };
    }).filter(item => activeWarehouse === 'All' || item.warehouse === activeWarehouse);
  }, [rawData, activeWarehouse]);

  const goBack = () => {
    setSearch('');
    if (viewMode === 'ITEMS') setViewMode('BRANDS');
    else if (viewMode === 'BRANDS') setViewMode('CATEGORIES');
  };

  const RenderCategories = () => (
    <View style={styles.categoryList}>
      {['Glass', 'Cover'].map(cat => (
        <Pressable key={cat} style={[styles.menuCard, { borderBottomColor: theme.border }]} onPress={() => { setSelectedCategory(cat); setViewMode('BRANDS'); }}>
          <View style={[GlobalStyles.iconBtn, GlobalStyles.cardBadge, { marginRight: 15, backgroundColor: theme.iconBtn }]}>
            <IconSymbol name={cat === 'Glass' ? 'square.stack.fill' : 'square.stack'} size={18} color={theme.tint} />
          </View>
          <Text style={[styles.menuText, { color: theme.text  }]}>{cat.toUpperCase()}</Text>
          <IconSymbol name="chevron.right" size={14} color={theme.textMuted} />
        </Pressable>
      ))}
    </View>
  );

  const RenderBrands = () => {
    const brands = [...new Set(processedData.filter(i => i.category === selectedCategory).map(i => i.brand))].sort();
    return (
      <View style={GlobalStyles.brandGrid}>
        {brands.map(brand => (
          <Pressable key={brand} style={[GlobalStyles.brandCard]} onPress={() => { setSelectedBrand(brand); setViewMode('ITEMS'); }}>
            <View style={[GlobalStyles.brandLogoCircle, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Image
                source={{ uri: `https://erpnext-209450-0.cloudclusters.net/files/${brand.trim().toLowerCase()}.png` }}
                style={{ 
                  width: '70%', 
                  height: '70%', 
                  resizeMode: 'contain', 
                  zIndex: 2,
                  // ADD THIS LINE:
                  // tintColor: (colorScheme === 'dark' && brand.toLowerCase() === 'apple') ? '#FFFFFF' : undefined 
                }}
              />
              <Text style={[styles.brandInitial, { position: 'absolute', zIndex: 1, color: theme.textMuted }]}>
                {brand.trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.brandText, { color: theme.textMuted }]}>{brand.trim().toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
    );
  };
  // const RenderBrands = () => {
  //   const brands = [...new Set(processedData.filter(i => i.category === selectedCategory).map(i => i.brand))].sort();
  //   return (
  //     <View style={GlobalStyles.brandGrid}>
  //       {brands.map(brand => (
  //         <Pressable key={brand} style={[GlobalStyles.brandCard]} onPress={() => { setSelectedBrand(brand); setViewMode('ITEMS'); }}>
  //           <View style={[GlobalStyles.brandLogoCircle, , { backgroundColor: theme.card , borderColor: theme.border }]}>
  //             <Image
  //               source={{ uri: `https://erpnext-209450-0.cloudclusters.net/files/${brand.trim().toLowerCase()}.png` }}
  //               style={{ width: '70%', height: '70%', resizeMode: 'contain', zIndex: 2 , }}
  //             />
  //             <Text style={[styles.brandInitial, { position: 'absolute', zIndex: 1, color: theme.textMuted }]}>
  //               {brand.trim().charAt(0).toUpperCase()}
  //             </Text>
  //           </View>
  //           <Text style={[styles.brandText, { color: theme.textMuted }]}>{brand.trim().toUpperCase()}</Text>
  //         </Pressable>
  //       ))}
  //     </View>
  //   );
  // };

  const RenderItems = () => {
    const items = processedData.filter(i =>
      i.category === selectedCategory && i.brand === selectedBrand &&
      (i.item_name.toLowerCase().includes(search.toLowerCase()))
    );
    return items.map((item, idx) => (
      <View key={idx} style={[GlobalStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
         
          <View style={{display:"flex" , flexDirection: "row" , gap:8}}>

            <ThemedText style={[styles.modelName, { color: theme.text }]}>{item.model}</ThemedText>
            </View>

            <View style={{display:"flex" , flexDirection: "row" , gap:8 , marginTop:8 }}>
                <Text style={[styles.cardWarehouse, { color: theme.tint , backgroundColor : theme.filtertint  }]}>{item.warehouse.split(' - ')[0]}</Text>
               <Text style={[styles.typeText, { color: theme.text , backgroundColor : theme.iconBtn }]}>{item.displayType}</Text>
              <Text style={[styles.priceValue, { color: theme.accent, backgroundColor : theme.iconBtn  }]}>₹{item.buyingPrice.toLocaleString('en-IN')}</Text>

            <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 4 }}>
            {/* <IconSymbol name="arrow.down.circle.fill" size={12} color="#FFC107" /> */}
            </View>
            <View style={{}}>
            </View>
            {/* <View style={{ alignItems: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}> 
              <IconSymbol name="arrow.up.circle.fill" size={12} color="#4CAF50" />   
              <Text style={[styles.priceValue, { color: theme.text }]}>₹{item.sellingPrice.toLocaleString('en-IN')}</Text>
            </View> */}
          </View>

          </View>
          <View style={[styles.qtyBadge, { backgroundColor: theme.text  }]}>
            <Text style={[styles.qtyCount, { color: theme.background }]}>{item.available}</Text>
            <Text style={[styles.qtyLabel, { color: theme.background }]}>PCS</Text>
          </View>
        </View>
      
      </View>
    ));
  };

  return (
    <ThemedView style={[GlobalStyles.container, { backgroundColor: theme.background }]}>
      <View style={GlobalStyles.header}>
        <View style={GlobalStyles.titleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' , justifyContent:"flex-start", gap: 12 }}>
            {viewMode !== 'CATEGORIES' && (
              <Pressable onPress={goBack}   style={[GlobalStyles.iconBtn , {marginRight: -16 , marginLeft: -8}]}>
                <IconSymbol name="chevron.left" size={18} color={theme.text} />
              </Pressable>
            )}
            <ThemedText style={[GlobalStyles.mainTitle, { color: theme.text }]}>
              {viewMode === 'CATEGORIES' ? 'Live Stock' : viewMode === 'BRANDS' ? selectedCategory : selectedBrand}
            </ThemedText>
          </View>
          <View style={{display:'flex' , gap: 12, flexDirection:'row', alignItems:'center'}}>
            <Pressable 
            onPress={() => loadData(true)} 
            style={[
              GlobalStyles.iconBtn, 
              { backgroundColor: theme.refreshBg } // Distinct green shade background
            ]}>
              {refreshing 
              ? 
              <ActivityIndicator size="small" color={theme.refreshtint + '20'} /> 
              : 
              <IconSymbol name="arrow.counterclockwise" size={18} color={theme.refreshtint} />}
            </Pressable>
            <Pressable onPress={handleLogout} 
            style={[
              GlobalStyles.iconBtn, 
              { backgroundColor: theme.logoutBg }]}>
              <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={theme.logouttint} />
            </Pressable>
          </View>
        </View>

        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.iconBtn, borderColor: theme.border }]}>
              <Text style={[styles.avatarText, { color: theme.tint }]}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={[styles.welcomeText, { color: theme.textMuted }]}>Welcome back,</Text>
              <Text style={[styles.userNameText, { color: theme.text }]}>{userName}</Text>
            </View>
          </View>
        </View>

        {viewMode !== 'CATEGORIES' && (
          <>
            {viewMode === 'ITEMS' && (
              <View style={[GlobalStyles.searchPill, { marginTop: 10, backgroundColor: theme.iconBtn }]}>
                <IconSymbol name="magnifyingglass" size={18} color={theme.textMuted} />
                <TextInput 
                  style={[GlobalStyles.textInput, { color: theme.text }]} 
                  placeholder="Search models..." 
                  placeholderTextColor={theme.textMuted} 
                  value={search} 
                  onChangeText={setSearch} 
                />
              </View>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
              {dynamicWarehouses.map(w => (
                <Pressable key={w} onPress={() => setActiveWarehouse(w)} style={styles.tabItem}>
                  <Text style={[styles.tabText, { color: theme.textMuted }, activeWarehouse === w && { color: theme.text }]}>
                    {w === 'All' ? 'ALL SHOPS' : w.split(' - ')[0]}
                  </Text>
                  {activeWarehouse === w && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16 }} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={theme.tint} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator color={theme.tint} style={{ marginTop: 50 }} />
        ) : (
          viewMode === 'CATEGORIES' ? <RenderCategories /> : viewMode === 'BRANDS' ? <RenderBrands /> : <RenderItems />
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 5 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  avatarText: { fontWeight: 'bold', fontSize: 18 },
  welcomeText: { fontSize: 11 },
  userNameText: { fontSize: 15, fontWeight: 'bold' },
  categoryList: { gap: 12 },
  menuCard: { width: '100%', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 12 },
  menuText: { fontWeight: '900', fontSize: 14, flex: 1 },
  brandInitial: { fontSize: 26, fontWeight: 'bold' },
  brandText: { marginTop: 8, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardWarehouse: { fontSize: 10, fontWeight: '800', marginBottom: 4, alignSelf: 'flex-start', borderRadius:99,  paddingBlock:6,paddingInline:12 },
  modelName: { fontSize: 18, fontWeight: '800' },
  typeText: { fontSize: 10, fontWeight: '800', marginBottom: 4, alignSelf: 'flex-start', borderRadius:99,  paddingBlock:6,paddingInline:12   },
  qtyBadge: { borderRadius: 14, width: 56, height: "auto", justifyContent: 'center', alignItems: 'center' },
  qtyCount: { fontSize: 18, fontWeight: '900' },
  qtyLabel: { fontSize: 8, fontWeight: 'bold' },
  priceContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  priceValue: { fontSize: 10, fontWeight: '800', marginBottom: 4, alignSelf: 'flex-start', borderRadius:99,  paddingBlock:6,paddingInline:12  },
  tabRow: { flexDirection: 'row', marginTop: 15 },
  tabItem: { marginRight: 22, paddingVertical: 8 },
  tabText: { fontSize: 12, fontWeight: '800' },
  activeIndicator: { height: 6, width: 12, borderRadius: 99, marginTop: 4, alignSelf: 'center' }
});