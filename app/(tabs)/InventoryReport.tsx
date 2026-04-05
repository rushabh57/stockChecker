import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getCustomInventoryReport } from '@/constants/api';
import { generateInventoryPDF } from '@/constants/pdfHelper';
import { Colors, GlobalStyles } from '@/constants/Styles';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

type FilterMode = 'Month' | 'Year' | 'Custom';

export default function InventoryReportPage() {
    const colorScheme = useColorScheme() ?? 'light';
    const [selectedCategory, setSelectedCategory] = useState<'All' | 'Cover' | 'Glasses'>('All');
    const theme = Colors[colorScheme];
    const router = useRouter();

    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState<FilterMode>('Month');

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const getActiveRange = () => {
        let s = new Date(startDate);
        let e = new Date(endDate);
        const today = new Date(); // Get current time
        if (filterType === 'Month') {
            s = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            e = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        } else if (filterType === 'Year') {
            s = new Date(startDate.getFullYear(), 0, 1);
            e = new Date(startDate.getFullYear(), 11, 31);
        }
        // NEW: If the calculated end date is in the future, set it to today
          if (e > today) {
            e = today;
        }
        return { startStr: formatDate(s), endStr: formatDate(e) };
    };

    const { startStr, endStr } = getActiveRange();

    const loadData = async () => {
        setLoading(true);
        try {
            // getCustomInventoryReport now handles the bundling of Prices and Item Metadata
            const enrichedData = await getCustomInventoryReport(startStr, endStr);
            setReportData(enrichedData);
        } catch (err) {
            console.error("Deep Audit Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [filterType, startDate, endDate]);

    // const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date, isStart = true) => {
      
    //     if (isStart) {
    //         setShowStartPicker(Platform.OS === 'ios');
    //         if (selectedDate) setStartDate(selectedDate);
    //     } else {
    //         setShowEndPicker(Platform.OS === 'ios');
    //         if (selectedDate) setEndDate(selectedDate);
    //     }
    // };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date, isStart = true) => {
      const today = new Date();
      
      if (isStart) {
          setShowStartPicker(Platform.OS === 'ios');
          if (selectedDate) {
              // Ensure we don't save a future date
              setStartDate(selectedDate > today ? today : selectedDate);
          }
      } else {
          setShowEndPicker(Platform.OS === 'ios');
          if (selectedDate) {
              setEndDate(selectedDate > today ? today : selectedDate);
          }
      }
  };
    const filteredData = React.useMemo(() => {
      if (selectedCategory === 'All') return reportData;
      return reportData.filter(item => item.itemGroup === selectedCategory);
  }, [reportData, selectedCategory]);

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardTop}>
                <Text style={[styles.idLabel, { color: theme.textMuted }]}>#{item.id.split('-').pop()}</Text>
                <View style={[styles.badge, {backgroundColor: 'rgba(0,113,227,0.1)'}]}>
                   <Text style={[styles.badgeText, {color: '#0071e3'}]}>{item.warehouse}</Text>       
                </View>
            </View>

            <View style={styles.mainInfo}>
                <Text style={[styles.brandText, { color: theme.text }]}>
                    {item.brand} 
                </Text>
                <Text style={{fontWeight: '400', fontSize: 14, color:theme.text}}>{item.model}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Variant Pill (e.g., Color/Size) */}
                <View style={{ 
                backgroundColor: theme.background, 
                paddingHorizontal: 10, 
                paddingVertical: 3, 
                borderRadius: 20, 
                borderWidth: 1, 
                borderColor: theme.border 
                }}>
                  <Text style={{ 
              fontSize: 10, 
              fontWeight: '600', 
              color: theme.textMuted,
              letterSpacing: 0.3
                  }}>
                    {item.variantInfo}
                  </Text>
                </View>

    {/* Item Group Pill (e.g., COVER or GLASS) */}
    <View style={{ 
      backgroundColor: theme.background, 
      paddingHorizontal: 10, 
      paddingVertical: 3, 
      borderRadius: 20, 
      borderWidth: 1, 
      borderColor: theme.border 
    }}>
      <Text style={{ 
        fontSize: 10, 
        fontWeight: '600', 
        color: theme.textMuted,
        letterSpacing: 0.3
      }}>
        {item.itemGroup}
      </Text>
    </View>
  </View>
            </View>

            <View style={[styles.detailsGrid , {borderTopColor: theme.border}]}>
                <View style={styles.detailItem}>
                    <Text style={styles.label}>Purchase/Buy</Text>
                    <Text style={[styles.value, { color: theme.text }]}>₹{item.buying_price}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Text style={styles.label}>Selling Price</Text>
                    <Text style={[styles.value, { color: theme.text }]}>₹{item.selling_price}</Text>
                </View>
            </View>

            <View style={styles.cardBottom}>
                <View style={[{
                    paddingBlock:12,
                    paddingInline:18,
                    borderRadius:99,
                    borderWidth:1,
                    justifyContent:'center',
                    borderColor: theme.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                }]}>
                    <Text style={[styles.label , {marginLeft:4}]}>Party:</Text>
                    <Text style={[styles.value, { color: theme.text , display:"flex" , gap:4}]} >
                      {item.vendor}
                      </Text>
                </View>
                {/* <View style={styles.qtyBox}>
                    <Text style={[styles.qtyValue, { color: item.qty > 0 ? '#34C759' : '#FF3B30' }]}>
                        {item.qty > 0 ? '+' : ''}{item.qty}
                    </Text>
                    <Text style={[styles.stockLabel, { color: theme.textMuted }]}>After Trans: {item.projected_qty}</Text>
                </View> */}
                
            <View style={[styles.timestampRow , {borderColor: theme.border}]}>  
                <IconSymbol name="calendar" size={10} color={theme.textMuted} />
                <Text style={[styles.timeLabel, { color: theme.textMuted }]}>
                  {item.date}  •  {item.time.split('.')[0]} 
                </Text>
              </View>
            </View>
        </View>
    );

    return (
        <ThemedView style={[GlobalStyles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
           
                <ThemedText style={styles.title}>Audit Report</ThemedText>
      
                <Pressable 
                onPress={() => generateInventoryPDF(filteredData, startStr, endStr)} // Use filteredData
                disabled={filteredData.length === 0}
                style={[styles.downloadBtn, { backgroundColor: theme.accent, opacity: filteredData.length === 0 ? 0.5 : 1 }]}
              >
                <IconSymbol name="arrow.down.doc.fill" size={18} color={theme.text} />
              </Pressable>
                    </View>

            <View style={styles.tabContainer}>
                {(['Month', 'Year', 'Custom'] as FilterMode[]).map((mode) => (
                    <Pressable key={mode} onPress={() => setFilterType(mode)} style={[styles.tab, filterType === mode && { borderBottomColor: theme.tint, borderBottomWidth: 1 }]}>
                        <Text style={[styles.tabText, { color: filterType === mode ? theme.tint : theme.textMuted }]}>{mode}</Text>
                    </Pressable>
                ))}
            </View>

            {/* Category Filter Pills */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 15, gap: 8 }}>
              {['All', 'Cover', 'Glasses'].map((cat) => (
                  <Pressable 
                      key={cat} 
                      onPress={() => setSelectedCategory(cat as any)}
                      style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: selectedCategory === cat ? theme.primary : theme.background,
                          borderWidth: 1,
                          borderColor: theme.border
                      }}
                  >
                      <Text style={{ 
                          fontSize: 12, 
                          fontWeight: '700', 
                          color: selectedCategory === cat ? theme.text : theme.textMuted 
                      }}>
                          {cat === 'Glasses' ? 'TEMPERED' : cat.toUpperCase()}
                      </Text>
                  </Pressable>
              ))}
          </View>

              <View style={{ backgroundColor: theme.background, borderColor: theme.border , borderBottomWidth:1, borderTopWidth:1, padding: 16, borderRadius: 20,  marginBottom: 15 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>
                  Range Selection
                </Text>
                
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable 
                    onPress={() => setShowStartPicker(true)} 
                    style={{ 
                      flex: 1, 
                      backgroundColor: theme.card, 
                      paddingHorizontal: 12, 
                      paddingVertical: 10, 
                      borderRadius: 25, // The Pill Shape
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: theme.border
                    }}
                  >
                    <IconSymbol name="calendar" size={14} color={theme.tint} style={{ marginRight: 8 }} />
                    <View>
                      <Text style={{ fontSize: 8, fontWeight: '700', color: theme.textMuted }}>
                        {filterType === 'Custom' ? 'FROM' : 'PERIOD'}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>
                        {filterType === 'Year' ? startDate.getFullYear() : 
                        filterType === 'Month' ? startDate.toLocaleString('default', { month: 'short', year: 'numeric' }) : 
                        formatDate(startDate)}
                      </Text>
                    </View>
                  </Pressable>

                  {filterType === 'Custom' && (
                    <Pressable 
                      onPress={() => setShowEndPicker(true)} 
                      style={{ 
                        flex: 1, 
                        backgroundColor: theme.card, 
                        paddingHorizontal: 12, 
                        paddingVertical: 10, 
                        borderRadius: 25, // The Pill Shape
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: theme.border
                      }}
                    >
                      <IconSymbol name="calendar" size={14} color={theme.tint} style={{ marginRight: 8 }} />
                      <View>
                        <Text style={{ fontSize: 8, fontWeight: '700', color: theme.textMuted }}>TO</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>{formatDate(endDate)}</Text>
                      </View>
                    </Pressable>
                  )}
                </View>

                {showStartPicker && <DateTimePicker value={startDate} maximumDate={new Date()} mode="date" display="default" onChange={(e, d) => onDateChange(e, d, true)} />}
                {showEndPicker && <DateTimePicker value={endDate} maximumDate={new Date()} mode="date" display="default" onChange={(e, d) => onDateChange(e, d, false)} />}
              </View>
            {loading ? (
                <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 40 }} />
            ) : (
              // data={reportData}
                <FlatList
                    data={filteredData} // Use filteredData
                    renderItem={renderItem}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No ledger found for this period.</Text>}
                />
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 10 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: '800' },
    downloadBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10,  justifyContent: 'center', alignItems: 'center' },
    tab: { paddingVertical: 10, paddingHorizontal: 20, marginRight: 10, borderBottomColor: 'transparent', borderBottomWidth: 1 },
    tabText: { fontSize: 14},
    inputArea: { marginHorizontal: 16, padding: 16, borderRadius: 16, marginBottom: 10 },
    inputTitle: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12 },
    row: { flexDirection: 'row', gap: 15 },
    dateField: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#E5E5EA', paddingBottom: 8 },
    label: { fontSize: 10, color: '#8E8E93', marginBottom: 2 },
    dateTextValue: { fontSize: 16, fontWeight: '600' },
    card: { padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    idLabel: { fontSize: 10, fontWeight: 'bold' },
    timeLabel: { fontSize: 10 },
    mainInfo: { marginBottom: 10 },
    brandText: { fontSize: 17, fontWeight: '800', textTransform: 'uppercase' },
    badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
    badge: { backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
    badgeText: { fontSize: 9, fontWeight: 'bold', color: '#8E8E93' },
    detailsGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, marginBottom: 6 },
    detailItem: { flex: 1 , alignItems:"center"},
    value: { fontSize: 12, fontWeight: '600'},
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', gap:4, alignItems: 'flex-end' },
    priceCol: { flex: 1 ,     paddingBlock:12,
      paddingInline:6,
      borderRadius:99,
      borderWidth:1},
    qtyBox: { alignItems: 'flex-end' },
    qtyValue: { fontSize: 18, fontWeight: '800' },
    stockLabel: { fontSize: 9, marginTop: 2, fontWeight: '600' },
    emptyText: { textAlign: 'center', marginTop: 100, opacity: 0.5 },
    timeLabel: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.2,
      opacity: 0.8,
    },
    timestampRow: {
      paddingBlock:12,
      paddingInline:6,
      borderRadius:99,
      borderWidth:1,
      justifyContent:'center',
      flex:1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    }
}); 