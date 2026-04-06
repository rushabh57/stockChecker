import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getFullItemDetails, searchInventory } from '@/constants/api'; // Ensure both are exported
import { Colors, GlobalStyles } from '@/constants/Styles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    View,
} from 'react-native';

export default function ItemsPage() {
    const { category, brand } = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme as keyof typeof Colors];
    const router = useRouter();

    const [allItems, setAllItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedShop, setSelectedShop] = useState('All Shops');
    const [isSearching, setIsSearching] = useState(false);

    const pageLoadLImit = 60;
   
    // --- DEBUG LOAD LOGIC ---
    // const loadItems = useCallback(async (searchTerm = '') => {
    //     try {
    //         setLoading(true);
    //         let data;

    //         if (searchTerm.trim().length > 1) {
    //             console.log(`[DEBUG] TRIGGERING SEARCH API: Query="${searchTerm}"`);
    //             data = await searchInventory(searchTerm);
    //             console.log(`[DEBUG] SEARCH API RETURNED: ${data?.length || 0} items`);
    //         } else {
    //             console.log(`[DEBUG] TRIGGERING FULL DETAILS API: Category=${category}, Brand=${brand}`);
    //             data = await getFullItemDetails(category as string, brand as string);
    //             console.log(`[DEBUG] FULL API RETURNED: ${data?.length || 0} items`);
    //         }

    //         setAllItems(data || []);
    //     } catch (error) {
    //         console.error("[DEBUG] FETCH ERROR:", error);
    //     } finally {
    //         setLoading(false);
    //         setRefreshing(false);
    //     }
    // }, [category, brand]);

 
    const loadItems = useCallback(async (searchTerm = '') => {
        try {
            setLoading(true);
            if (searchTerm.trim().length > 1) setIsSearching(true); // Mark as search mode
            
            let data;
            if (searchTerm.trim().length > 1) {
                data = await searchInventory(searchTerm);
            } else {
                setIsSearching(false); // Back to normal mode
                data = await getFullItemDetails(category as string, brand as string);
            }
            setAllItems(data || []);
        } catch (error) {
            console.error("FETCH ERROR:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [category, brand]);
    // Initial load
    useEffect(() => { loadItems(); }, [loadItems]);

    // Debounced Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (search.trim().length > 1 || search.trim().length === 0) {
                loadItems(search);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [search, loadItems]);

    const dynamicShopList = useMemo(() => {
        const shops = new Set<string>();
        allItems.forEach(item => {
            item.stocks?.forEach((s: any) => {
                const name = s.warehouse.split(' - ')[0];
                if (name) shops.add(name);
            });
        });
        return ['All Shops', ...Array.from(shops)];
    }, [allItems]);

    const groupedItems = useMemo(() => {
        const query = search.trim();
        const queryLength = query.length;
    
        // 1. FAST EXIT: If we are actively fetching a search, show NOTHING.
        // This stops the "Old Data" from staying on screen while the new search loads.
        if (loading && queryLength > 1) return [];
    
        // 2. PROCESS DATA: Filter and Group
        const filtered = selectedShop === 'All Shops' 
            ? allItems 
            : allItems.filter(item => item.stocks?.some((s: any) => s.warehouse.includes(selectedShop)));
    
        const groups: { [key: string]: any } = {};
        filtered.forEach(item => {
            const modelKey = item.model_name || item.item_name.split('-')[1] || "Other";
            if (!groups[modelKey]) {
                groups[modelKey] = { modelName: modelKey, variations: [] };
            }
            groups[modelKey].variations.push(item);
        });
    
        const result = Object.values(groups);
    
        // 3. STRICT LOGIC GATE (The Glitch Killer)
        
        // CASE A: User is searching (Typed 2+ characters)
        if (queryLength > 1) {
            // We return the result exactly as is. 
            // If the API found 0 items, this returns [], which triggers "Not Found".
            // It will NOT fall through to show the 3 default items.
            return result; 
        }
    
        // CASE B: User is in transition (Typed 1 character)
        if (queryLength === 1) {
            // While typing the first letter, keep it locked to the limit 
            // so the screen doesn't suddenly expand to 60 items.
            return result.slice(0, pageLoadLImit);
        }
    
        // CASE C: Default State (No search)
        // Show only your "Wow" minimalist 3 items.
        return result.slice(0, pageLoadLImit);
    
    }, [selectedShop, allItems, search, loading, pageLoadLImit]);

const renderModelGroup = ({ item: group }: { item: any }) => {
        return (
            <View style={[styles.groupCard, { backgroundColor: theme.card }]}>
                <View style={styles.groupHeader}>
                    <Text style={[styles.brandLabel, { color: theme.tint }]}>{brand}</Text>
                    <ThemedText style={styles.modelTitle}>{group.modelName}</ThemedText>
                </View>
    
                <View style={styles.variationList}>
                    {group.variations.map((v: any, index: number) => {
                        const stockData = selectedShop === 'All Shops' 
                            ? v.stocks 
                            : v.stocks?.filter((s: any) => s.warehouse.includes(selectedShop));
                        
                        const qty = stockData?.reduce((acc: number, s: any) => {
                            const projected = (s.actual_qty || 0) - (s.reserved_qty || 0);
                            return acc + projected;
                        }, 0) || 0;

                        const isLowStock = qty > 0 && qty < 5;
                        const hasStock = qty > 0;
                        const availableIn = stockData?.filter((s: any) => (s.actual_qty - (s.reserved_qty || 0)) > 0) || [];
    
                        return (
                            <View key={index} style={[styles.variationRow, { borderTopColor: theme.border + '40' }]}>
                                <View style={styles.varMainInfo}>
                                    <View style={[styles.badgeColumn, {borderColor: theme.border, 
                                        alignSelf: 'flex-start',      
                                        flexDirection: 'row',          
                                        alignItems: 'center',          
                                        borderRadius:99, paddingInline:12, paddingBlock:6}]}>
                                        {selectedShop === 'All Shops' && hasStock && (
                                            <View style={styles.warehouseBadgeContainer}>
                                                {availableIn.map((s: any, sIdx: number) => (
                                                    <View key={sIdx} style={[styles.miniWarehouseBadge, { backgroundColor: theme.cardSecondary + "50", borderColor: theme.border }]}>
                                                        <Text style={[styles.miniWarehouseText, { color: theme.textMuted }]}>
                                                            {s.warehouse.split(' - ')[0]} 
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                        
                                        <View style={styles.dataRow}>
                                            <Text style={[styles.coverTypeText, { color: theme.text, backgroundColor: theme.cardSecondary + "50" }]}>
                                                {v.cover_type || 'Standard'}
                                            </Text>

                                            <Text style={[styles.qtyText, { 
                                                color: hasStock ? (isLowStock ? '#FF9500' : theme.tint) : theme.textMuted, 
                                                backgroundColor: theme.cardSecondary + "50", 
                                                borderColor: isLowStock ? '#FF950040' : theme.border, 
                                            }]}>
                                                {Math.round(qty)} pcs
                                            </Text>

                                            <Text style={[styles.priceValue, { color: '#08CB00', borderColor: '#08CB0040', backgroundColor: '#08CB0020' }]}>
                                                ₹{v.buying_price || '0'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };
 
    return (
        <ThemedView style={[GlobalStyles.container, { backgroundColor: theme.background }]}>
            <View style={GlobalStyles.header}>
                <View style={styles.headerTop}>
                    <Pressable onPress={() => router.back()} style={GlobalStyles.iconBtn}>
                        <IconSymbol name="chevron.left" size={20} color={theme.text} />
                    </Pressable>
                    <Text style={[GlobalStyles.mainTitle, { color: theme.text }]}>{brand}</Text>
                </View>

                <View style={[GlobalStyles.searchPill, { backgroundColor: theme.card, marginTop: 10 }]}>
                    <IconSymbol name="magnifyingglass" size={16} color={theme.textMuted} />
                    <TextInput
                        style={[GlobalStyles.textInput, { color: theme.text }]}
                        placeholder="Search model (Debug mode)..."
                        placeholderTextColor={theme.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {loading && <ActivityIndicator size="small" color={theme.tint} />}
                </View>

                <View style={styles.chipContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                        {dynamicShopList.map((shop) => (
                            <Pressable 
                                key={shop} 
                                onPress={() => setSelectedShop(shop)}
                                style={[
                                    styles.chip, 
                                    { backgroundColor: theme.card, borderColor: theme.border },
                                    selectedShop === shop && { backgroundColor: theme.text, borderColor: theme.text }
                                ]}
                            >
                                <Text style={[
                                    styles.chipText, 
                                    { color: theme.textMuted },
                                    selectedShop === shop && { color: theme.background }
                                ]}>
                                    {shop}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </View>

            <FlatList
                data={groupedItems}
                keyExtractor={(item, index) => item.modelName + index}
                // keyExtractor={(item) => item.modelName}
                renderItem={renderModelGroup}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadItems(search)} />}
                ListEmptyComponent={() => {
        if (loading) return null; // Keep it clean while the spinner is active
        
        return (
            <View style={{ marginTop: 60, alignItems: 'center' }}>
                <IconSymbol name="exclamationmark.triangle" size={32} color={theme.textMuted} />
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', marginTop: 12 }}>
                    {search.length > 1 ? `"${search}" not found` : "No items in this category"}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                    Try checking a different shop or model name.
                </Text>
            </View>
        );
    }}
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chipContainer: { marginTop: 12, marginBottom: 4 },
    chipScroll: { gap: 8, paddingRight: 20 },
    chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    chipText: { fontSize: 11, fontWeight: '700' },
    
    groupCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(150,150,150,0.1)',
        elevation: 2,
    },
    groupHeader: { marginBottom: 12 },
    brandLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    modelTitle: { fontSize: 22, fontWeight: '900' },
    
    variationList: { gap: 12 },
    variationRow: { paddingVertical: 12, borderTopWidth: 1 },
    varMainInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    badgeColumn: { gap: 8, flexDirection: 'row', flexWrap: 'wrap', borderWidth:1 },
    dataRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    
    coverTypeText: { fontSize: 13, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
    qtyText: { fontSize: 13, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
    priceValue: { fontSize: 13, fontWeight: '800', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
    
    emptyText: { textAlign: 'center', marginTop: 40, opacity: 0.5, fontSize: 14 },

    warehouseBadgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    miniWarehouseBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
    miniWarehouseText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
});