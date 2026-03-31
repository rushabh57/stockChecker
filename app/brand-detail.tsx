// app/brand-detail.tsx
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getLiveInventory } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function BrandDetailScreen() {
  const { brandName, warehouse } = useLocalSearchParams();
  const router = useRouter();
  
  const [items, setItems] = useState([]);
  const [purchaseList, setPurchaseList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getLiveInventory();
      const filtered = data.filter(i => 
        (i.item_name || "").startsWith(brandName as string) && 
        (warehouse === 'All' || i.warehouse === warehouse) &&
        i.has_variants !== 1 && !i.item_name.toLowerCase().includes('glass')
      );
      setItems(filtered);

      const saved = await AsyncStorage.getItem('purchase_notes');
      if (saved) setPurchaseList(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateField = async (item: any, field: string, value: string) => {
    const newList = [...purchaseList];
    const idx = newList.findIndex((p: any) => p.id === item.item_code);
    if (idx > -1) {
      newList[idx] = { ...newList[idx], [field]: value };
    } else {
      newList.push({ id: item.item_code, name: item.item_name, target: field === 'target' ? value : '0', actual: field === 'actual' ? value : '0' });
    }
    setPurchaseList(newList);
    await AsyncStorage.setItem('purchase_notes', JSON.stringify(newList));
    await AsyncStorage.setItem('note_timestamp', Date.now().toString());
  };

  const groupedModels = useMemo(() => {
    return items.reduce((acc: any, item: any) => {
      const model = item.item_name.split('-')[1]?.trim() || 'Standard';
      if (!acc[model]) acc[model] = [];
      acc[model].push(item);
      return acc;
    }, {});
  }, [items]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color="#4CAF50" />
          <Text style={styles.backText}>{brandName}</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator color="#4CAF50" style={{ flex: 1 }} /> : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {Object.keys(groupedModels).sort().map(model => (
            <View key={model} style={styles.modelItemBox}>
              <Text style={styles.modelTitleMain}>{model}</Text>
              {groupedModels[model].map((item: any) => {
                const rowData: any = purchaseList.find((p: any) => p.id === item.item_code);
                return (
                  <View key={item.item_code} style={styles.summaryRow}>
                    <Text style={styles.variantLabel}>{item.item_name.split('-')[2] || 'Standard'}</Text>
                    <View style={styles.inputStack}>
                      <View style={styles.inputGroupSmall}>
                        <Text style={styles.miniLabel}>TARGET:</Text>
                        <TextInput 
                          style={[styles.miniInput, rowData?.target > 0 && styles.activeTarget]} 
                          placeholder="0" placeholderTextColor="#333" keyboardType="numeric"
                          value={rowData?.target?.toString() || ""} 
                          onChangeText={(v) => updateField(item, 'target', v)}
                        />
                      </View>
                      <View style={styles.inputGroupSmall}>
                        <Text style={styles.miniLabel}>ACTUAL:</Text>
                        <TextInput 
                          style={[styles.miniInput, rowData?.actual > 0 && styles.activeActual]} 
                          placeholder="0" placeholderTextColor="#333" keyboardType="numeric"
                          value={rowData?.actual?.toString() || ""} 
                          onChangeText={(v) => updateField(item, 'actual', v)}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingTop: 60, paddingHorizontal: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  backText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  scrollContent: { padding: 15 },
  modelItemBox: { backgroundColor: '#0A0A0A', borderRadius: 20, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#1A1A1A' },
  modelTitleMain: { color: '#4CAF50', fontSize: 16, fontWeight: '900', marginBottom: 15 },
  summaryRow: { borderTopWidth: 1, borderTopColor: '#111', paddingTop: 12, marginTop: 5 },
  variantLabel: { color: '#eee', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  inputStack: { flexDirection: 'row', justifyContent: 'space-between' },
  inputGroupSmall: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniLabel: { color: '#444', fontSize: 10, fontWeight: '900' },
  miniInput: { width: 50, height: 35, backgroundColor: '#000', borderRadius: 8, color: '#fff', textAlign: 'center', fontWeight: 'bold', borderWidth: 1, borderColor: '#222' },
  activeTarget: { borderColor: '#FFD700', color: '#FFD700' },
  activeActual: { borderColor: '#4CAF50', color: '#4CAF50' }
});