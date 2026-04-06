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

  // const getInputStyle = (target: string, actual: string) => {
  //   const tgt = parseInt(target || '0');
  //   const act = parseInt(actual || '0');
  //   if (act > 0 && act >= tgt) return { backgroundColor: theme.refreshBg, tint: theme.refreshtint };
  //   if (tgt > 0) return { backgroundColor: theme.noteBg, tint: theme.noteting };
  //   return { backgroundColor: theme.border + '50', tint: theme.textMuted };
  // };
  const getInputStyle = (target: string, actual: string) => {
    const tgt = parseInt(target || '0');
    const act = parseInt(actual || '0');

    // SUCCESS: Actual meets or exceeds Target
    if (act > 0 && act >= tgt) {
        return { 
            backgroundColor: theme.accent + '20', // Light green-ish wash
            tint: theme.accent || '#27ae60'      // Bold green text
        };
    } 
    // WARNING: Target set but not yet met
    if (tgt > 0) {
        return { 
            backgroundColor: theme.noteBg + '20',    // Light orange/yellow wash
            tint: theme.notetint || '#f39c12'        // Bold orange text
        };
    }
    // DEFAULT: No data entered
    return { 
        backgroundColor: theme.border + '40', 
        tint: theme.textMuted 
    };
};

  const renderModelAccordion = (modelName: string, modelItems: any[]) => {
    const isExpanded = expandedModel === modelName;
    return (
      <View key={modelName} style={[styles.accordionContainer, { borderBottomColor: theme.border, backgroundColor: isExpanded ? theme.cardSecondary + '50' : 'transparent'}]}>
        <Pressable style={styles.accordionHeader} onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpandedModel(isExpanded ? null : modelName);
        }}>
          <View style={{}}>
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

  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
    {/* Target Pill */}
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: style.backgroundColor, 
      borderRadius: 20, // This creates the capsule shape
      paddingHorizontal: 12, 
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: style.tint + '20' 
    }}>
      <Text style={{ 
        fontSize: 10, 
        fontWeight: '800', 
        color: style.tint, 
        marginRight: 4, 
        opacity: 0.6 
      }}>TGT</Text>
      <TextInput
        keyboardType="numeric"
        style={{ 
          color: style.tint, 
          fontSize: 14, 
          fontWeight: 'bold', 
          minWidth: 30, 
          textAlign: 'center',
          padding: 0 // Removes default Android padding
        }}
        value={note?.target || ''}
        onChangeText={v => updateNote(item, 'target', v)}
        placeholder="0"
        placeholderTextColor={style.tint + '30'}
      />
    </View>

    {/* Actual Pill */}
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: style.backgroundColor, 
      borderRadius: 20, // Capsule shape
      paddingHorizontal: 12, 
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: style.tint + '20'
    }}>
      <Text style={{ 
        fontSize: 10, 
        fontWeight: '800', 
        color: style.tint, 
        marginRight: 4, 
        opacity: 0.6 
      }}>ACT</Text>
      <TextInput
        keyboardType="numeric"
        style={{ 
          color: style.tint, 
          fontSize: 14, 
          fontWeight: 'bold', 
          minWidth: 30, 
          textAlign: 'center',
          padding: 0
        }}
        value={note?.actual || ''}
        onChangeText={v => updateNote(item, 'actual', v)}
        placeholder="0"
        placeholderTextColor={style.tint + '30'}
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
          {/* <Pressable onPress={() => { setRefreshing(true); loadMainData(); }} style={styles.refreshPill}>
            {refreshing ? <ActivityIndicator size="small" color={theme.primary} /> : 
            <IconSymbol name="arrow.counterclockwise" size={14} color={theme.textMuted} />}
          </Pressable> */}
           <Pressable 
                            onPress={() => { setRefreshing(true); loadMainData(); }}
                            style={[styles.refreshPill, { backgroundColor: theme.card , borderColor: theme.border }]}
                        >
                            {refreshing ? (
                                <ActivityIndicator size="small" color={theme.tint} />
                            ) : (
                                <>
                                    <IconSymbol name="arrow.counterclockwise" size={14} color={theme.textMuted} />
                                    <Text style={[styles.refreshText, { color: theme.textMuted }]}>Sync</Text>
                                </>
                            )}
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
                    <Pressable key={brand.name} style={[styles.brandRow, { backgroundColor: theme.background, borderBottomWidth:1 , borderBottomColor: theme.border }]} onPress={() => {
                      setSelectedBrand(brand.name);
                      setSelectedCategory(item.title === 'Covers' ? 'Cover' : 'Glasses');
                    }}>
                      <View style={[styles.logoBox, { backgroundColor: theme.background }]}>
                        {brand.image ? (
                          <Image source={{ uri: `https://erpnext-209450-0.cloudclusters.net${brand.image}` }} style={styles.rowLogo} resizeMode="contain" />
                        ) : (
                          <Text style={[styles.initialText, { color: theme.textMuted }]}>{initial}</Text>
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
        <IconSymbol name="list.bullet" size={24} color={theme.text} />
        {summaryData.length > 0 && (
          <View style={[styles.fabBadge, { backgroundColor: theme.error, borderColor: theme.border }]}>
            <Text style={styles.badgeText}>{summaryData.length}</Text>
          </View>
        )}
      </Pressable>

      {/* Summary Modal */}
      <Modal 
  visible={showSummary} 
  animationType="slide" 
  transparent={true} 
  onRequestClose={() => setShowSummary(false)}
>
  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
    
    <Pressable style={{ flex: 1 }} onPress={() => setShowSummary(false)} />

    <ThemedView style={{ 
      height: '75%', 
      backgroundColor: theme.background, 
      borderTopLeftRadius: 24, 
      borderTopRightRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 20
    }}>
      
      <View style={[styles.modalHeader, { 
        borderBottomColor: theme.border + "50", 
        borderBottomWidth: 1,
        paddingVertical: 15, 
        paddingHorizontal: 20, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }]}>

        <ThemedText style={[styles.modalTitle, { fontSize: 20, fontWeight: '800' }]}>Review Audit</ThemedText>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={resetNotes} style={{ backgroundColor: theme.error + "15", padding: 8, borderRadius: 100, borderWidth: 1, borderColor: theme.error + "40" }}>
            <IconSymbol name="trash.fill" size={18} color={theme.error} />
          </Pressable>
          <Pressable style={{ backgroundColor: theme.border + "40", padding: 8, borderRadius: 100, borderWidth: 1, borderColor: theme.border }} onPress={() => setShowSummary(false)}>
            <IconSymbol name="xmark" size={18} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {summaryData.length === 0 ? (
          <View style={{ marginTop: 60, alignItems: 'center' }}>
            <Text style={{ color: theme.textMuted, fontSize: 14, fontWeight: '500' }}>No items updated yet.</Text>
          </View>
        ) : (
          summaryData.map((item, idx) => {
            const statusStyle = getInputStyle(item.target, item.actual);
            return (
              <View key={idx} style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                paddingVertical: 14, 
                borderBottomWidth: 1, 
                borderBottomColor: theme.border + "30" 
              }}>
                {/* Item Name Container */}
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: statusStyle.backgroundColor, 
                    borderRadius: 100, 
                    paddingHorizontal: 10, 
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: statusStyle.tint + "20"
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: statusStyle.tint, marginRight: 4, opacity: 0.6 }}>TGT</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: statusStyle.tint }}>{item.target || '0'}</Text>
                  </View>

                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: statusStyle.backgroundColor, 
                    borderRadius: 100, 
                    paddingHorizontal: 10, 
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: statusStyle.tint + "20"
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: statusStyle.tint, marginRight: 4, opacity: 0.6 }}>ACT</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: statusStyle.tint }}>{item.actual || '0'}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  </View>
</Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { padding: 8, marginLeft: -8 },
  refreshPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  sectionHeader: { fontSize: 11, fontWeight: '900', color: '#888', textTransform: 'uppercase', marginLeft: 20, marginBottom: 12, letterSpacing: 1 },
  brandRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    marginHorizontal: 16, 
    borderRadius: 0, // Set to 0 for sharp corners
    marginBottom: 8, 
    ...Platform.select({ 
      ios: { 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 4 
      }, 
    }) 
  },
  logoBox: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  rowLogo: { width: '70%', height: '70%' },
  rowNameText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600' },
  accordionContainer: { borderBottomWidth: 1 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  accordionContent: { paddingHorizontal: 20, paddingBottom: 10 },
  typeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  itemModelText: { fontSize: 16, fontWeight: '700' },
  itemTypeText: { fontSize: 14, fontWeight: '600' },
  pillContainer: { flexDirection: 'row', gap: 6, },
  inputPill: { flex:1,  borderRadius: 99, borderWidth:1, paddingBlock: 6, paddingInline:6, alignItems: 'center', justifyContent: 'center' },
  pillLabel: { fontSize: 7, fontWeight: '900', marginBottom: -2 },
  pillInput: { fontSize: 14, fontWeight: '800', textAlign: 'center', padding: 0 },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  fabBadge: { position: 'absolute', top: 0, right: 0, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, },
  badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1 },
  summaryName: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 10 },
  emptyText: { textAlign: 'center', marginTop: 60, fontSize: 15 },
  initialText: { fontSize: 18, fontWeight: 'bold' }
});


