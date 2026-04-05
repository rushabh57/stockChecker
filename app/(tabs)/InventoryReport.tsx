import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getCustomInventoryReport } from '@/constants/api';
import { generateInventoryPDF } from '@/constants/pdfHelper';
import { Colors, GlobalStyles } from '@/constants/Styles';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
    
    // Pagination & Insights
    const [isLimitEnabled, setIsLimitEnabled] = useState(true);
    const [showSmartInfo, setShowSmartInfo] = useState(true);

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const getActiveRange = () => {
        let s = new Date(startDate);
        let e = new Date(endDate);
        const today = new Date();
        if (filterType === 'Month') {
            s = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            e = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        } else if (filterType === 'Year') {
            s = new Date(startDate.getFullYear(), 0, 1);
            e = new Date(startDate.getFullYear(), 11, 31);
        }
        if (e > today) e = today;
        return { startStr: formatDate(s), endStr: formatDate(e) };
      };

    const { startStr, endStr } = getActiveRange();

 
    // 1. Add a new state to hold the full response from ERPNext
    const [fullData, setFullData] = useState<any[]>([]); 
    
    const loadData = async () => {
        setLoading(true);
        setShowSmartInfo(true);
        try {
          // ALWAYS fetch all related records for the date range from ERPNext
            const enrichedData = await getCustomInventoryReport(startStr, endStr);
            
            // Save the COMPLETE list for downloading/PDF
            setFullData(enrichedData);

            // Limit only what is shown in the UI FlatList
            const displayData = isLimitEnabled 
            ? enrichedData.slice(0, 30) 
            : enrichedData;
            
            setReportData(displayData);
        } catch (err) {
          console.error("ERPNext Fetch Error:", err);
        } finally {
            setLoading(false);
        }
      };
      
      useEffect(() => { loadData(); }, [filterType, startDate, endDate, isLimitEnabled]);
      

    const dataInsight = useMemo(() => {
        if (reportData.length === 0) return null;
        const sorted = [...reportData].sort((a, b) => a.date.localeCompare(b.date));
        const firstActualDate = sorted[0].date;
        return {
            hasGap: firstActualDate > startStr,
            firstDate: firstActualDate,
            count: reportData.length
        };
    }, [reportData, startStr]);

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date, isStart = true) => {
        const today = new Date();
        if (isStart) {
            setShowStartPicker(Platform.OS === 'ios');
            if (selectedDate) {
                setStartDate(selectedDate > today ? today : selectedDate);
                setIsLimitEnabled(true); // Reset to limit 4 on new date selection
            }
        } else {
            setShowEndPicker(Platform.OS === 'ios');
            if (selectedDate) {
                setEndDate(selectedDate > today ? today : selectedDate);
                setIsLimitEnabled(true);
            }
        }
    };

    //     // This is for the UI (Limited to 4 if enabled)
    // const filteredData = React.useMemo(() => {
    //   if (selectedCategory === 'All') return reportData;
    //   return reportData.filter(item => item.itemGroup === selectedCategory);
    // }, [reportData, selectedCategory]);

    // // NEW: This is for the PDF (All items from ERPNext, but filtered by Category)
    // const filteredFullData = React.useMemo(() => {
    //   if (selectedCategory === 'All') return fullData;
    //   return fullData.filter(item => item.itemGroup === selectedCategory);
    // }, [fullData, selectedCategory]);


    const [selectedBrand, setSelectedBrand] = useState<string>('All');
    // Automatically get a list of unique brands from the full data
    const uniqueBrands = useMemo(() => {
      const brands = fullData.map(item => item.brand);
      return ['All', ...new Set(brands)];
    }, [fullData]);


    // PDF Data: Full ERPNext records filtered by Category AND Brand
const filteredFullData = useMemo(() => {
  return fullData.filter(item => {
      const categoryMatch = selectedCategory === 'All' || item.itemGroup === selectedCategory;
      const brandMatch = selectedBrand === 'All' || item.brand === selectedBrand;
      return categoryMatch && brandMatch;
  });
}, [fullData, selectedCategory, selectedBrand]);

// UI Data: Preview records (up to 4) filtered by Category AND Brand
const filteredData = useMemo(() => {
  // Note: We filter the FULL data first, THEN slice it for the UI preview
  const fullFiltered = fullData.filter(item => {
      const categoryMatch = selectedCategory === 'All' || item.itemGroup === selectedCategory;
      const brandMatch = selectedBrand === 'All' || item.brand === selectedBrand;
      return categoryMatch && brandMatch;
  });

  return isLimitEnabled ? fullFiltered.slice(0, 30) : fullFiltered;
}, [fullData, selectedCategory, selectedBrand, isLimitEnabled]);

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardTop}>
                <Text style={[styles.idLabel, { color: theme.textMuted }]}>#{item.id.split('-').pop()}</Text>
                <View style={[styles.badge, {backgroundColor: 'rgba(0,113,227,0.1)'}]}>
                   <Text style={[styles.badgeText, {color: '#0071e3'}]}>{item.warehouse}</Text>       
                </View>
            </View>

            <View style={styles.mainInfo}>
                <Text style={[styles.brandText, { color: theme.text }]}>{item.brand}</Text>
                <Text style={{fontWeight: '400', fontSize: 14, color:theme.text}}>{item.model}</Text>
                <View style={styles.badgeRow}>
                    <View style={[styles.pill, { backgroundColor: theme.background, borderColor: theme.border }]}>
                        <Text style={[styles.pillText, { color: theme.textMuted }]}>{item.variantInfo}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: theme.background, borderColor: theme.border }]}>
                        <Text style={[styles.pillText, { color: theme.textMuted }]}>{item.itemGroup}</Text>
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
                <View style={[styles.partyPill, { borderColor: theme.border }]}>
                    <Text style={styles.label}>Party:</Text>
                    <Text style={[styles.value, { color: theme.text }]}>{item.vendor}</Text>
                </View>
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
            
    onPress={() => {
      const fileName = `Audit_${startStr}_${endStr}_${Date.now()}.pdf`;
      generateInventoryPDF(filteredFullData, startStr, endStr, fileName)
      
    }} 
    disabled={filteredFullData.length === 0}
    style={[
        styles.downloadBtn, 
        { 
            backgroundColor: theme.accent, 
            opacity: filteredFullData.length === 0 ? 0.5 : 1 
        }
    ]}
>
    <IconSymbol name="arrow.down.doc.fill" size={18} color={theme.text} />
</Pressable>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabContainer}>
                {(['Month', 'Year', 'Custom'] as FilterMode[]).map((mode) => (
                    <Pressable key={mode} onPress={() => {setFilterType(mode); setIsLimitEnabled(true);}} style={[styles.tab, filterType === mode && { borderBottomColor: theme.tint, borderBottomWidth: 1 }]}>
                        <Text style={[styles.tabText, { color: filterType === mode ? theme.tint : theme.textMuted }]}>{mode}</Text>
                    </Pressable>
                ))}
            </View>

            {/* Category Filter Pills */}
            <View style={styles.categoryRow}>
                {['All', 'Cover', 'Glasses'].map((cat) => (
                    <Pressable 
                        key={cat} 
                        onPress={() => setSelectedCategory(cat as any)}
                        style={[styles.catPill, { backgroundColor: selectedCategory === cat ? theme.primary + "50": theme.background, borderColor: theme.border }]}
                    >
                        <Text style={[styles.catPillText, { color: selectedCategory === cat ? theme.text : theme.textMuted }]}>
                            {cat === 'Glasses' ? 'TEMPERED' : cat.toUpperCase()}
                        </Text>
                    </Pressable>
                ))}
            </View>
            {/* brand selection */}
            {/* <View style={{ marginBottom: 15 }}>
    <Text style={[styles.rangeTitle, { color: theme.textMuted, paddingHorizontal: 16, marginBottom: 8 }]}>
        Filter by Brand
    </Text>
    <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={uniqueBrands}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item: brand }) => (
            <Pressable 
                onPress={() => setSelectedBrand(brand)}
                style={[
                    styles.catPill, 
                    { 
                        backgroundColor: selectedBrand === brand ? theme.primary + "50" : theme.background, 
                        borderColor: selectedBrand === brand ? theme.border : theme.border 
                    }
                ]}
            >
                <Text style={[styles.catPillText, { color: selectedBrand === brand ? theme.tint : theme.textMuted }]}>
                    {brand.toUpperCase()}
                </Text>
            </Pressable>
        )}
        keyExtractor={(item) => item}
    />
            </View> */}

            {/* Range Selection */}
            <View style={[styles.rangeBox, { borderColor: theme.border }]}>
                <Text style={[styles.rangeTitle, { color: theme.textMuted }]}>Range Selection</Text>
                <View style={styles.row}>
                    <Pressable onPress={() => setShowStartPicker(true)} style={[styles.dateSelector, {backgroundColor: theme.card, borderColor: theme.border}]}>
                        <IconSymbol name="calendar" size={14} color={theme.tint} style={{ marginRight: 8 }} />
                        <View>
                            <Text style={styles.selectorLabel}>{filterType === 'Custom' ? 'FROM' : 'PERIOD'}</Text>
                            <Text style={[styles.selectorValue, {color: theme.text}]}>
                                {filterType === 'Year' ? startDate.getFullYear() : 
                                 filterType === 'Month' ? startDate.toLocaleString('default', { month: 'short', year: 'numeric' }) : 
                                 formatDate(startDate)}
                            </Text>
                        </View>
                    </Pressable>

                    {filterType === 'Custom' && (
                        <Pressable onPress={() => setShowEndPicker(true)} style={[styles.dateSelector, {backgroundColor: theme.card, borderColor: theme.border}]}>
                            <IconSymbol name="calendar" size={14} color={theme.tint} style={{ marginRight: 8 }} />
                            <View>
                                <Text style={styles.selectorLabel}>TO</Text>
                                <Text style={[styles.selectorValue, {color: theme.text}]}>{formatDate(endDate)}</Text>
                            </View>
                        </Pressable>
                    )}
                </View>
                {showStartPicker && <DateTimePicker value={startDate} maximumDate={new Date()} mode="date" display="default" onChange={(e, d) => onDateChange(e, d, true)} />}
                {showEndPicker && <DateTimePicker value={endDate} maximumDate={new Date()} mode="date" display="default" onChange={(e, d) => onDateChange(e, d, false)} />}
            </View>

            {/* SMART INFO BAR - LIMIT OF 4 */}
            {!loading && dataInsight && showSmartInfo && (
                <View style={styles.smartBarContainer}>
                    <View style={[styles.smartBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <IconSymbol name="info.circle.fill" size={14} color={theme.tint} />
                        <Text style={[styles.smartBarText, { color: theme.textMuted }]}>
                            {dataInsight.hasGap ? `Starts ${dataInsight.firstDate}. ` : ""}
                            {isLimitEnabled && reportData.length >= 30 ? "Preview (30 items)." : `Found ${reportData.length} records.`}
                        </Text>
                        
                        {isLimitEnabled && reportData.length >= 30 && (
                            <Pressable onPress={() => setIsLimitEnabled(false)} style={[styles.loadAllBtn , {backgroundColor: theme.accent + "50" , borderRadius:99}]}>
                                <Text style={{ color: theme.tint, fontWeight: 'bold', fontSize: 11 }}>LOAD ALL</Text>
                            </Pressable>
                        )}
                        <Pressable onPress={() => setShowSmartInfo(false)}>
                            <IconSymbol name="xmark" size={14} color={theme.textMuted} />
                        </Pressable>
                    </View>
                </View>
            )}
              
            {loading ? (
                <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={filteredData}
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
    title: { fontSize: 20, fontWeight: '800' },
    downloadBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, justifyContent: 'center' },
    tab: { paddingVertical: 10, paddingHorizontal: 20, marginRight: 10 },
    tabText: { fontSize: 14, fontWeight: '600' },
    categoryRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 15, gap: 8 },
    catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    catPillText: { fontSize: 12, fontWeight: '700' },
    rangeBox: { padding: 16, borderBottomWidth:1, borderTopWidth:1, marginBottom: 15 },
    rangeTitle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
    row: { flexDirection: 'row', gap: 10 },
    dateSelector: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 25, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
    selectorLabel: { fontSize: 8, fontWeight: '700', color: '#8E8E93' },
    selectorValue: { fontSize: 13, fontWeight: '700' },
    // Smart Bar
    smartBarContainer: { paddingHorizontal: 16, marginBottom: 10 },
    smartBar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 8 },
    smartBarText: { fontSize: 11, flex: 1, fontWeight: '500' },
    loadAllBtn: {  paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    // Cards
    card: { padding: 16, borderRadius: 16, marginBottom: 12,  },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    idLabel: { fontSize: 10, fontWeight: 'bold' },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
    badgeText: { fontSize: 9, fontWeight: 'bold' },
    mainInfo: { marginBottom: 10 },
    brandText: { fontSize: 17, fontWeight: '800', textTransform: 'uppercase' },
    badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' },
    pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
    pillText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
    detailsGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, marginBottom: 6 },
    detailItem: { flex: 1, alignItems: "center" },
    label: { fontSize: 10, color: '#8E8E93' },
    value: { fontSize: 12, fontWeight: '600' },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, alignItems: 'flex-end' },
    partyPill: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 99, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    timestampRow: { paddingVertical: 12, paddingHorizontal: 6, borderRadius: 99, borderWidth: 1, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
    timeLabel: { fontSize: 10, fontWeight: '600' },
    emptyText: { textAlign: 'center', marginTop: 100, opacity: 0.5 }
});