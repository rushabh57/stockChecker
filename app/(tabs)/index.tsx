import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getLiveInventory } from '@/constants/api';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function InventoryDashboard() {
  const router = useRouter();
  const [rawData, setRawData] = useState({ bins: [], draftSales: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeWarehouse, setActiveWarehouse] = useState('All');
  const [userName] = useState('Administrator');

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive", 
        onPress: async () => {
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
    const interval = setInterval(() => loadData(), 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [loadData]);

  const onPullRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const processedGroups = useMemo(() => {
    const itemMap = new Map();
    rawData.items.forEach(i => itemMap.set(i.name, i));

    const salesMap = new Map();
    rawData.draftSales.forEach(s => {
      const key = `${s.item_code}_${s.warehouse}`;
      salesMap.set(key, (salesMap.get(key) || 0) + s.qty);
    });

    return rawData.bins.reduce((acc, bin) => {
      const item = itemMap.get(bin.item_code);
      if (!item) return acc; 

      if (activeWarehouse !== 'All' && bin.warehouse !== activeWarehouse) return acc;
      if (search && !item.item_name.toLowerCase().includes(search.toLowerCase())) return acc;

      const key = `${bin.item_code}_${bin.warehouse}`;
      const liveQty = bin.actual_qty - (bin.reserved_qty || 0) - (salesMap.get(key) || 0);

      if (liveQty <= 0 && activeWarehouse !== 'All') return acc; 

      const nameParts = item.item_name.split('-');
      acc.push({
        warehouse: bin.warehouse,
        brand: (nameParts[0] || "Other").toUpperCase(),
        model: nameParts[1] || "Generic",
        type: nameParts[2] || "Standard",
        qty: Math.round(liveQty),
        price: bin.valuation_rate || 0,
      });

      return acc;
    }, []);
  }, [rawData, activeWarehouse, search]);

  const dynamicWarehouses = useMemo(() => {
    const list = new Set(rawData.bins.map(b => b.warehouse));
    return ['All', ...Array.from(list)].sort();
  }, [rawData.bins]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        {/* TITLE ROW WITH REFRESH */}
        <View style={styles.titleRow}>
          <ThemedText style={styles.title}>Live Stock</ThemedText>
          <View style={{display:"flex", alignItems:"flex-end" , flexDirection:"row" , gap:8}}>
          <Pressable 
            onPress={() => loadData(true)} 
            disabled={refreshing}
            style={({pressed}) => [styles.refreshBtn, pressed && {opacity: 0.5}]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <IconSymbol name="arrow.counterclockwise" size={20} color="#4CAF50" />
            )}
          </Pressable>
          <Pressable onPress={handleLogout} style={styles.avatarPill}>
              <Text style={styles.avatarLetter}>{userName.charAt(0)}</Text>
              <View style={styles.onlineDot} />
            </Pressable>
            </View>
        </View>
        
        {/* PILL SEARCH BAR */}
        <View style={styles.searchPillContainer}>
          <IconSymbol name="magnifyingglass" size={18} color="#666" />
          <TextInput 
            style={styles.searchBar}
            placeholder="Search items..."
            placeholderTextColor="#666"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
            {dynamicWarehouses.map(w => (
                <Pressable key={w} onPress={() => setActiveWarehouse(w)} style={styles.tabItem}>
                    <ThemedText style={[styles.tabText, activeWarehouse === w && styles.activeTabText]}>
                        {w === 'All' ? 'ALL SHOPS' : w.split(' - ')[0]}
                    </ThemedText>
                    {activeWarehouse === w && <View style={styles.activeIndicator} />}
                </Pressable>
            ))}
        </ScrollView>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor="#fff" />}
      >
        {loading ? (
          <ActivityIndicator color="#fff" style={{marginTop: 50}} />
        ) : processedGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol size={40} name="exclamationmark.triangle" color="#333" />
            <ThemedText style={styles.emptyText}>No matching items</ThemedText>
          </View>
        ) : (
          processedGroups.map((item, idx) => (
            <View key={idx} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{flex: 1, marginRight: 10}}>
                  <View style={styles.warehouseBadge}>
                    <IconSymbol name="mappin.and.ellipse" size={10} color="#4CAF50" />
                    <Text style={styles.cardWarehouse}> {item.warehouse}</Text>
                  </View>
                  <ThemedText style={styles.brandName} numberOfLines={1}>{item.brand}</ThemedText>
                </View>
                
                <View style={styles.qtyBadge}>
                   <Text style={styles.qtyCount}>{item.qty}</Text>
                   <Text style={styles.qtyLabel}>PCS</Text>
                </View>
              </View>
                
              <View style={styles.pillContainer}>
                <View style={styles.innerPill}><Text style={styles.pillText}>{item.model}</Text></View>
                <View style={styles.innerPill}><Text style={styles.pillText}>{item.type}</Text></View>
                <View style={[styles.innerPill, styles.pricePill]}>
                  <Text style={styles.priceValue}>₹{item.price.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 20, paddingTop: 60, backgroundColor: '#000' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  refreshBtn: { padding: 8, backgroundColor: '#111', borderRadius: 99, borderWidth: 1, borderColor: '#1A1A1A' },
  
  searchPillContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#111', 
    borderRadius: 99, 
    paddingHorizontal: 15, 
    height: 48, 
    marginTop: 20,
    borderWidth: 1, 
    borderColor: '#1A1A1A' 
  },
  searchBar: { flex: 1, color: '#fff', marginLeft: 10, fontSize: 15 },

  tabRow: { flexDirection: 'row', marginTop: 15 },
  tabItem: { marginRight: 24, paddingVertical: 8, alignItems: 'center' },
  tabText: { color: '#555', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  activeTabText: { color: '#fff' },
  activeIndicator: { height: 3, width: 12, backgroundColor: '#4CAF50', borderRadius: 99, marginTop: 4 },

  scrollContent: { padding: 16, flexGrow: 1 },

  card: { 
    backgroundColor: '#0A0A0A', 
    borderRadius: 24, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#161616',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  warehouseBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(76, 175, 80, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, marginBottom: 6 },
  cardWarehouse: { color: '#4CAF50', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
  brandName: { color: '#fff', fontSize: 22, fontWeight: '900' },
  
  qtyBadge: { backgroundColor: '#fff', borderRadius: 16, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  qtyCount: { color: '#000', fontSize: 18, fontWeight: '900' },
  qtyLabel: { color: '#000', fontSize: 8, fontWeight: 'bold', marginTop: -2 },

  pillContainer: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  innerPill: { backgroundColor: '#161616', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: '#222' },
  pillText: { color: '#888', fontSize: 11, fontWeight: '700' },
  pricePill: { backgroundColor: 'transparent', borderColor: '#4CAF50' },
  priceValue: { color: '#4CAF50', fontSize: 12, fontWeight: '800' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#444', marginTop: 10, fontSize: 14, fontWeight: '600' },


  avatarPill: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(76, 175, 80, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50' },
  avatarLetter: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold' },
  onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', borderWidth: 1.5, borderColor: '#000' },
});