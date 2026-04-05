import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getBrandLogo, getBrandsByCategory, getFullItemDetails } from '@/constants/api';
import { Colors, GlobalStyles } from '@/constants/Styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View
} from 'react-native';

const NOTES_KEY = 'murlidhar_market_notes';

export default function PurchaseNoteScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [sections, setSections] = useState<{ title: string, data: any[] }[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [purchaseList, setPurchaseList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const loadMainData = async () => {
    try {
      setRefreshing(true);
      const [coverNames, glassNames] = await Promise.all([
        getBrandsByCategory('Cover', undefined),
        getBrandsByCategory('Glasses', undefined)
      ]);

      const fetchLogos = async (names: string[]) => {
        return Promise.all(names.map(async (name) => {
          const logo = await getBrandLogo(name);
          return { name, image: logo };
        }));
      };

      const [covers, glasses] = await Promise.all([fetchLogos(coverNames), fetchLogos(glassNames)]);
      setSections([{ title: 'Covers', data: covers }, { title: 'Glasses', data: glasses }]);

      const savedNotes = await AsyncStorage.getItem(NOTES_KEY);
      if (savedNotes) setPurchaseList(JSON.parse(savedNotes));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadMainData(); }, []);

  useEffect(() => {
    if (selectedBrand && selectedCategory) {
      setLoading(true);
      getFullItemDetails(selectedCategory, selectedBrand).then(setItems).finally(() => setLoading(false));
    }
  }, [selectedBrand, selectedCategory]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {};
    items.forEach(item => {
      const model = item.item_name.split('-')[1]?.trim() || "Other";
      if (!groups[model]) groups[model] = [];
      groups[model].push(item);
    });
    return groups;
  }, [items]);

  const summaryData = useMemo(() => {
    return purchaseList.filter(p => parseInt(p.target) > 0 || parseInt(p.actual) > 0);
  }, [purchaseList]);

  const updateNote = (item: any, field: 'target' | 'actual', val: string) => {
    const newList = [...purchaseList];
    const idx = newList.findIndex(p => p.id === item.name);
    if (idx > -1) {
      newList[idx] = { ...newList[idx], [field]: val };
    } else {
      newList.push({
        id: item.name,
        name: item.item_name,
        target: field === 'target' ? val : '0',
        actual: field === 'actual' ? val : '0'
      });
    }
    setPurchaseList(newList);
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(newList));
  };

  const resetNotes = () => {
    Alert.alert("Reset All Data", "This will clear your entire purchase list.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: async () => {
        setPurchaseList([]);
        await AsyncStorage.removeItem(NOTES_KEY);
        setShowSummary(false);
      }}
    ]);
  };

  const getInputStyle = (target: string, actual: string) => {
    const tgt = parseInt(target || '0');
    const act = parseInt(actual || '0');
    if (act > 0 && act >= tgt) return { backgroundColor: theme.refreshBg, tint: theme.refreshtint };
    if (tgt > 0) return { backgroundColor: theme.noteBg, tint: theme.noteting };
    return { backgroundColor: theme.border + '50', tint: theme.textMuted };
  };

  const renderModelAccordion = (modelName: string, modelItems: any[]) => {
    const isExpanded = expandedModel === modelName;
    return (
      <View key={modelName} style={[styles.accordionContainer, { borderBottomColor: theme.border }]}>
        <Pressable style={styles.accordionHeader} onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpandedModel(isExpanded ? null : modelName);
        }}>
          <View>
            <Text style={[styles.itemModelText, { color: theme.text }]}>{modelName}</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted }}>{modelItems.length} Variants</Text>
          </View>
          <IconSymbol name={isExpanded ? "chevron.up" : "chevron.down"} size={14} color={theme.textMuted} />
        </Pressable>

        {isExpanded && (
          <View style={styles.accordionContent}>
            {modelItems.map(item => {
              const note = purchaseList.find(p => p.id === item.name);
              const style = getInputStyle(note?.target, note?.actual);
              const type = item.item_name.split('-')[2]?.trim() || "Standard";

              return (
                <View key={item.name} style={styles.typeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTypeText, { color: theme.text }]}>{type}</Text>
                    <Text style={{ fontSize: 10, color: theme.textMuted }}>Stock: {Math.round(item.real_count)}</Text>
                  </View>
                  <View style={styles.pillContainer}>
                    {/* Target Pill */}
                    <View style={[styles.inputPill, { backgroundColor: style.backgroundColor }]}>
                      <Text style={[styles.pillLabel, { color: style.tint }]}>TGT</Text>
                      <TextInput
                        keyboardType="numeric"
                        style={[styles.pillInput, { color: style.tint }]}
                        value={note?.target || ''}
                        onChangeText={v => updateNote(item, 'target', v)}
                        placeholder="0"
                        placeholderTextColor={style.tint + '50'}
                      />
                    </View>
                    {/* Actual Pill */}
                    <View style={[styles.inputPill, { backgroundColor: style.backgroundColor }]}>
                      <Text style={[styles.pillLabel, { color: style.tint }]}>ACT</Text>
                      <TextInput
                        keyboardType="numeric"
                        style={[styles.pillInput, { color: style.tint }]}
                        value={note?.actual || ''}
                        onChangeText={v => updateNote(item, 'actual', v)}
                        placeholder="0"
                        placeholderTextColor={style.tint + '50'}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={[GlobalStyles.container, { backgroundColor: theme.background }]}>
      <View style={GlobalStyles.header}>
        <View style={styles.headerTitleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {selectedBrand && (
              <Pressable onPress={() => setSelectedBrand(null)} style={styles.backBtn}>
                <IconSymbol name="chevron.left" size={20} color={theme.text} />
              </Pressable>
            )}
            <ThemedText style={[GlobalStyles.mainTitle, { color: theme.text }]}>
              {selectedBrand || "Market Notes"}
            </ThemedText>
          </View>
          <Pressable onPress={() => { setRefreshing(true); loadMainData(); }} style={styles.refreshPill}>
            {refreshing ? <ActivityIndicator size="small" color={theme.primary} /> : 
            <IconSymbol name="arrow.counterclockwise" size={14} color={theme.textMuted} />}
          </Pressable>
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={selectedBrand ? Object.keys(groupedItems) : sections}
          keyExtractor={(item) => selectedBrand ? item : item.title}
          renderItem={({ item }) => {
            if (selectedBrand) return renderModelAccordion(item, groupedItems[item]);
            return (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.sectionHeader}>{item.title}</Text>
                {item.data.map(brand => {
                  const initial = brand.name ? brand.name.charAt(0).toUpperCase() : '?';
                  return (
                    <Pressable key={brand.name} style={[styles.brandRow, { backgroundColor: theme.card }]} onPress={() => {
                      setSelectedBrand(brand.name);
                      setSelectedCategory(item.title === 'Covers' ? 'Cover' : 'Glasses');
                    }}>
                      <View style={[styles.logoBox, { backgroundColor: theme.background }]}>
                        {brand.image ? (
                          <Image source={{ uri: `https://erpnext-209450-0.cloudclusters.net${brand.image}` }} style={styles.rowLogo} resizeMode="contain" />
                        ) : (
                          <Text style={[styles.initialText, { color: theme.primary }]}>{initial}</Text>
                        )}
                      </View>
                      <Text style={[styles.rowNameText, { color: theme.text }]}>{brand.name}</Text>
                      <IconSymbol name="chevron.right" size={14} color={theme.textMuted} />
                    </Pressable>
                  );
                })}
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadMainData} tintColor={theme.primary} />}
        />
      )}

      {/* FAB */}
      <Pressable style={[styles.fab, { backgroundColor: theme.background, borderWidth:1 , borderColor:theme.border }]} onPress={() => setShowSummary(true)}>
        <IconSymbol name="list.bullet" size={24} color="white" />
        {summaryData.length > 0 && (
          <View style={[styles.fabBadge, { backgroundColor: theme.error, borderColor: theme.border }]}>
            <Text style={styles.badgeText}>{summaryData.length}</Text>
          </View>
        )}
      </Pressable>

      {/* Summary Modal */}
      <Modal visible={showSummary} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSummary(false)}>
        <ThemedView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <ThemedText style={styles.modalTitle}>Summary</ThemedText>
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <Pressable onPress={resetNotes}><IconSymbol name="trash.fill" size={20} color={theme.error} /></Pressable>
              <Pressable onPress={() => setShowSummary(false)}><IconSymbol name="xmark" size={20} color={theme.text} /></Pressable>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {summaryData.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No items updated yet.</Text>
            ) : (
              summaryData.map((item, idx) => {
                const style = getInputStyle(item.target, item.actual);
                return (
                  <View key={idx} style={[styles.summaryItem, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.summaryName, { color: theme.text }]}>{item.name}</Text>
                    <View style={styles.pillContainer}>
                      <View style={[styles.inputPill, { backgroundColor: style.backgroundColor, width: 48 }]}>
                        <Text style={[styles.pillLabel, { color: style.tint }]}>TGT</Text>
                        <Text style={[styles.pillInput, { color: style.tint }]}>{item.target}</Text>
                      </View>
                      <View style={[styles.inputPill, { backgroundColor: style.backgroundColor, width: 48 }]}>
                        <Text style={[styles.pillLabel, { color: style.tint }]}>ACT</Text>
                        <Text style={[styles.pillInput, { color: style.tint }]}>{item.actual}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { padding: 8, marginLeft: -8 },
  refreshPill: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(150,150,150,0.1)' },
  sectionHeader: { fontSize: 11, fontWeight: '900', color: '#888', textTransform: 'uppercase', marginLeft: 20, marginBottom: 12, letterSpacing: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', padding: 12, marginHorizontal: 16, borderRadius: 16, marginBottom: 8, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 2 } }) },
  logoBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  rowLogo: { width: '70%', height: '70%' },
  rowNameText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600' },
  accordionContainer: { borderBottomWidth: 1 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  accordionContent: { paddingHorizontal: 20, paddingBottom: 10 },
  typeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  itemModelText: { fontSize: 16, fontWeight: '700' },
  itemTypeText: { fontSize: 14, fontWeight: '600' },
  pillContainer: { flexDirection: 'row', gap: 6 },
  inputPill: { width: 54, borderRadius: 18, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  pillLabel: { fontSize: 7, fontWeight: '900', marginBottom: -2 },
  pillInput: { fontSize: 14, fontWeight: '800', textAlign: 'center', padding: 0 },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  fabBadge: { position: 'absolute', top: 0, right: 0, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, },
  badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1 },
  summaryName: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 10 },
  emptyText: { textAlign: 'center', marginTop: 60, fontSize: 15 },
  initialText: { fontSize: 18, fontWeight: 'bold' }
});