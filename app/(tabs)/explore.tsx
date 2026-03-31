import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getLiveInventory } from '@/constants/api';
import { Colors, GlobalStyles } from '@/constants/Styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View
} from 'react-native';

export default function PurchaseNoteScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme as keyof typeof Colors];
  
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [purchaseList, setPurchaseList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  useEffect(() => {
    const backAction = () => {
      if (filterActive) { setFilterActive(false); return true; }
      if (selectedBrand) { setSelectedBrand(null); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedBrand, filterActive]);

  const initializeData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getLiveInventory();
      const actualProducts = data.filter((i: any) => {
        const name = (i.item_name || "").toLowerCase().trim();
        return i.has_variants !== 1 && !name.includes('glass') && i.disabled !== 1;
      });
      setItems(actualProducts);

      const savedNotes = await AsyncStorage.getItem('purchase_notes');
      const lastSaveTime = await AsyncStorage.getItem('note_reset_time');

      if (lastSaveTime && Date.now() - parseInt(lastSaveTime) < 8 * 60 * 60 * 1000) {
        if (savedNotes) setPurchaseList(JSON.parse(savedNotes));
      } else {
        await clearAllNotes();
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { initializeData(); }, [initializeData]);

  const clearAllNotes = async () => {
    setPurchaseList([]);
    await AsyncStorage.removeItem('purchase_notes');
    await AsyncStorage.removeItem('note_reset_time');
    setShowSummary(false);
    setFilterActive(false);
  };

  const updateField = async (item: any, field: 'target' | 'actual', value: string) => {
    const existing = purchaseList.find((p: any) => p.id === item.item_code);
    let newList;
    if (existing) {
      newList = purchaseList.map((p: any) => p.id === item.item_code ? { ...p, [field]: value } : p);
    } else {
      newList = [...purchaseList, {
        id: item.item_code,
        name: item.item_name,
        target: field === 'target' ? value : '0',
        actual: field === 'actual' ? value : '0'
      }];
    }
    setPurchaseList(newList);
    await AsyncStorage.setItem('purchase_notes', JSON.stringify(newList));
    await AsyncStorage.setItem('note_reset_time', Date.now().toString());
  };

  const filteredModels = useMemo(() => {
    if (filterActive) {
      return items.filter((i: any) => {
        const note = purchaseList.find((p: any) => p.id === i.item_code);
        const hasData = note && (parseInt(note.target) > 0 || parseInt(note.actual) > 0);
        return hasData && i.item_name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      });
    }
    let list = items;
    if (selectedBrand) {
      list = list.filter((i: any) => i.item_name.split('-')[0]?.trim() === selectedBrand);
    }
    if (searchQuery) {
      list = list.filter((i: any) => i.item_name.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    }
    return list;
  }, [items, selectedBrand, searchQuery, filterActive, purchaseList]);

  const brands = useMemo(() => {
    const uniqueBrands = new Set(items.map((i: any) => i.item_name.split('-')[0]?.trim()));
    return Array.from(uniqueBrands).sort();
  }, [items]);

  const renderItemCard = (item: any) => {
    const note = purchaseList.find((p: any) => p.id === item.item_code);
    const parts = item.item_name.split('-');
    const brandLabel = parts[0]?.trim() || '';
    const modelName = parts[1]?.trim() || '';
    const variant = parts[2]?.trim() || 'Standard';

    return (
      <View key={item.item_code} style={[GlobalStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.itemMainInfo}>
          <View style={{ flex: 1 }}>
            {filterActive && <Text style={[styles.brandBadge , {color: theme.text}]}>{brandLabel.toUpperCase()}</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThemedText style={[styles.modelNameText, { color: theme.text }]}>{modelName}</ThemedText>
            <Text style={[styles.variantName, { color: theme.textMuted  , backgroundColor: theme.primary + "20"}]}>{variant}</Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
             <Text style={[styles.priceText, { color: theme.refreshtint }]}>₹{item.buying_rate  || '0'}</Text>
          </View>
        </View>
        <View style={styles.inputsRow}>
          <View style={[styles.pillInput, { backgroundColor: theme.iconBtn, borderColor: theme.border }, (parseInt(note?.target) > 0) && {backgroundColor: colorScheme === 'dark' ? 'rgba(255, 217, 0, 0.57)' : '#FFFDE7' }]}>
            <Text style={[styles.pillLabel, { color: theme.textMuted }]}>TGT</Text>
            <TextInput
              style={[styles.pillValue, { color: theme.text }]}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textMuted}
              value={note?.target?.toString() ?? ''}
              onChangeText={(v) => updateField(item, 'target', v)}
            />
          </View>
          <View style={[styles.pillInput, { backgroundColor: theme.iconBtn, borderColor: theme.border }, (parseInt(note?.actual) > 0) && { backgroundColor: colorScheme === 'dark' ? 'rgba(76, 175, 79, 0.51)' : '#E8F5E9' }]}>
            <Text style={[styles.pillLabel, { color: theme.textMuted }]}>ACT</Text>
            <TextInput
              style={[styles.pillValue, { color: theme.text }]}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textMuted}
              value={note?.actual?.toString() ?? ''}
              onChangeText={(v) => updateField(item, 'actual', v)}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[GlobalStyles.container, { backgroundColor: theme.background }]}>
      <View style={GlobalStyles.header}>
        <View style={GlobalStyles.titleRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {(selectedBrand || filterActive) && (
        <Pressable 
          style={[GlobalStyles.iconBtn , {marginRight: -16}]}
          onPress={() => {
            if (filterActive) setFilterActive(false);
            else if (selectedBrand) setSelectedBrand(null);
          }}
        >
          <IconSymbol name="chevron.left" size={18} color={theme.text} />
        </Pressable>
          )}

          <ThemedText style={[GlobalStyles.mainTitle, { color: theme.text }]}>
            {filterActive ? "Summary" : (selectedBrand || "Market Note")}
          </ThemedText>
        </View>
            <View style={{display:'flex' , gap: 12, flexDirection:'row', alignItems:'center'}}>
            {/* GREEN SHADE REFRESH BUTTON */}
              <Pressable 
                          onPress={() => initializeData(true)} 
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
            <Pressable 
              style={[GlobalStyles.iconBtn, { backgroundColor: theme.iconBtn }, filterActive && { borderColor: theme.noteting, backgroundColor: theme.noteBg }]} 
              onPress={() => setFilterActive(!filterActive)}
            >
              <IconSymbol name="list.bullet.clipboard" size={20} color={filterActive ? theme.tint : theme.textMuted} />
            </Pressable>

            <Pressable style={[GlobalStyles.iconBtn,  { backgroundColor: theme.filterBg }]} onPress={() => setShowSummary(true)}>
              <IconSymbol name="slider.horizontal.3" size={20} color={theme.tint} />
            </Pressable>
          </View>
  </View>

        {(selectedBrand || filterActive) && (
          <View style={[GlobalStyles.searchPill, { marginTop: 10, backgroundColor: theme.iconBtn }]}>
            <IconSymbol name="magnifyingglass" size={16} color={theme.textMuted} />
            <TextInput
              style={[GlobalStyles.textInput, { color: theme.text }]}
              placeholder="Search items..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => initializeData(true)} tintColor={theme.tint} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator color={theme.tint} style={{ marginTop: 20 }} />
        ) : (
          (selectedBrand || filterActive) ? (
            filteredModels.length > 0 ? filteredModels.map(renderItemCard) : (
              <View style={styles.emptyContainer}><Text style={[styles.emptyText, { color: theme.textMuted }]}>No items found.</Text></View>
            )
          ) : (
            <View style={GlobalStyles.brandGrid}>
              {brands.map(brand => (
                <Pressable key={brand} style={[GlobalStyles.brandCard]} onPress={() => setSelectedBrand(brand)}>
                  <View style={[GlobalStyles.brandLogoCircle, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Image
                      source={{ uri: `https://erpnext-209450-0.cloudclusters.net/files/${brand.trim().toLowerCase()}.png` }}
                      style={{ width: '70%', height: '70%', resizeMode: 'contain' }}
                    />
                    <Text style={[styles.brandInitial, { position: 'absolute', zIndex: -1, color: theme.textMuted }]}>
                      {brand.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.brandText, { color: theme.textMuted }]}>{brand.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
          )
        )}
      </ScrollView>

      <Modal visible={showSummary} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setShowSummary(false)}>
          <View style={[styles.popoverCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.popoverHeader}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>Review Note</ThemedText>
              <Pressable onPress={clearAllNotes} style={[styles.clearBtn, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,82,82,0.1)' : '#FFEBEE' }]}>
                <Text style={{ color: theme.error, fontWeight: 'bold', fontSize: 11 }}>RESET</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {purchaseList.filter(p => parseInt(p.target) > 0 || parseInt(p.actual) > 0).map(p => (
                <View key={p.id} style={[styles.summaryRow, { borderBottomColor: theme.border }]}>
                  <Text style={{ color: theme.text, flex: 1, fontSize: 13 }}>{p.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[styles.statPill, { backgroundColor: theme.iconBtn, borderColor: theme.border }]}><Text style={{ color: theme.tint, fontSize: 10 }}>T: {p.target}</Text></View>
                    <View style={[styles.statPill, { backgroundColor: theme.iconBtn, borderColor: theme.border }]}><Text style={{ color: theme.tint, fontSize: 10 }}>A: {p.actual}</Text></View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  itemMainInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  brandBadge: { fontSize: 8, fontWeight: 'bold', marginBottom: 6 },
  modelNameText: { fontSize: 16, fontWeight: '800' },
  variantName: { fontSize: 11, borderRadius:99, paddingHorizontal: 6, paddingVertical: 2, fontWeight: '600', marginLeft: 4 },
  priceContainer: { paddingHorizontal: 5, paddingVertical: 4, borderRadius: 8 },
  priceText: { fontWeight: '900', fontSize: 12 },
  inputsRow: { flexDirection: 'row', gap: 8 },
  pillInput: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 99, paddingHorizontal: 12, height: 40, borderWidth: 1 },
  pillLabel: { fontSize: 8, fontWeight: 'bold', marginRight: 8 },
  pillValue: { fontSize: 16, fontWeight: '900', flex: 1, textAlign: 'center' },
  brandInitial: { fontSize: 24, fontWeight: 'bold' },
  brandText: { fontSize: 10, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  popoverCard: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, height: '70%', borderWidth: 1 },
  popoverHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  summaryRow: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, alignItems: 'center' },
  statPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 }
});