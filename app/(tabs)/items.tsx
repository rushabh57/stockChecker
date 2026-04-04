import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getBrandStockDetails } from '@/constants/api'; // Ensure this can handle search queries
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

    // 1. Unified Fetch Function
    // We pass the search term to the API to fetch "101" from the server
    const loadItems = useCallback(async (searchTerm = '') => {
        try {
            setLoading(true);
            // Assuming getBrandStockDetails is updated to accept a search parameter
            // e.g., getBrandStockDetails(category, brand, searchTerm)
            const data = await getBrandStockDetails(category as string, brand as string, searchTerm);
            setAllItems(data || []);
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [category, brand]);

    // 2. Initial Load
    useEffect(() => { loadItems(); }, [loadItems]);

    // 3. Global Search Logic (Debounced)
    // This triggers when user types. It goes ONLINE to find items not in the local list.
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (search.trim().length > 1) {
                loadItems(search); // Requesting item "101" from ERPNext
            } else if (search.trim().length === 0) {
                loadItems(); // Reset to default brand list
            }
        }, 500); // Wait 500ms after last keystroke

        return () => clearTimeout(delayDebounceFn);
    }, [search, loadItems]);

    // Dynamic Shop Filter (Only shows shops that actually have items in the current view)
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

    // Local filter for the Shop Selection
    const filteredItems = useMemo(() => {
        if (selectedShop === 'All Shops') return allItems;
        return allItems.filter(item => 
            item.stocks?.some((s: any) => s.warehouse.includes(selectedShop))
        );
    }, [selectedShop, allItems]);

    const renderItemCard = ({ item }: { item: any }) => (
        <View style={[GlobalStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <ThemedText style={styles.modelTitle}>{item.model_name || item.item_name.split('-')[1]}</ThemedText>
                    <Text style={[styles.typePill, { backgroundColor: theme.iconBtn, color: theme.text }]}>
                        {item.cover_type || 'Standard'}
                    </Text>
                </View>
                <View style={[styles.priceBadge, { backgroundColor: theme.filterBg }]}>
                    <Text style={[styles.priceText, { color: theme.tint }]}>₹{item.buying_price}</Text>
                </View>
            </View>

            <View style={styles.stockSection}>
                {item.stocks && item.stocks.length > 0 ? (
                    item.stocks
                        .filter((s: any) => selectedShop === 'All Shops' || s.warehouse.includes(selectedShop))
                        .map((stock: any, index: number) => (
                            <View key={index} style={styles.shopRow}>
                                <View style={styles.shopNameContainer}>
                                    <IconSymbol name="mappin.and.ellipse" size={12} color={theme.tint} />
                                    <Text style={[styles.shopName, { color: theme.text }]}>{stock.warehouse.split(' - ')[0]}</Text>
                                </View>
                                <View style={[styles.qtyCircle, { backgroundColor: theme.text }]}>
                                    <Text style={[styles.qtyText, { color: theme.background }]}>{Math.round(stock.actual_qty)}</Text>
                                </View>
                            </View>
                        ))
                ) : <Text style={{ color: theme.logouttint, fontSize: 12 }}>Out of Stock</Text>}
            </View>
        </View>
    );

    return (
        <ThemedView style={[GlobalStyles.container, { backgroundColor: theme.background }]}>
            <View style={GlobalStyles.header}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={() => router.back()} style={GlobalStyles.iconBtn}>
                        <IconSymbol name="chevron.left" size={20} color={theme.text} />
                    </Pressable>
                    <Text style={[GlobalStyles.mainTitle, { color: theme.text, marginLeft: -12 }]}>{brand}</Text>
                </View>

                {/* Search Pill */}
                <View style={[GlobalStyles.searchPill, { backgroundColor: theme.iconBtn, marginTop: 15 }]}>
                    <IconSymbol name="magnifyingglass" size={16} color={theme.textMuted} />
                    <TextInput
                        style={[GlobalStyles.textInput, { color: theme.text }]}
                        placeholder="Search model locally or online..."
                        placeholderTextColor={theme.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {loading && <ActivityIndicator size="small" color={theme.tint} />}
                </View>

                {/* Dynamic Shop Filter Chips */}
                <View style={styles.chipContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                        {dynamicShopList.map((shop) => (
                            <Pressable 
                                key={shop} 
                                onPress={() => setSelectedShop(shop)}
                                style={[
                                    styles.chip, 
                                    { backgroundColor: theme.card, borderColor: theme.border },
                                    selectedShop === shop && { backgroundColor: theme.tint, borderColor: theme.tint }
                                ]}
                            >
                                <Text style={[
                                    styles.chipText, 
                                    { color: theme.textMuted },
                                    selectedShop === shop && { color: '#FFF' }
                                ]}>
                                    {shop}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {loading && allItems.length === 0 ? (
                <ActivityIndicator color={theme.tint} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={filteredItems}
                    keyExtractor={(item) => item.name}
                    renderItem={renderItemCard}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadItems(search)} />}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: theme.textMuted }}>No items found online.</Text>}
                />
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    chipContainer: { marginTop: 12, marginBottom: 4 },
    chipScroll: { gap: 8, paddingRight: 20 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    chipText: { fontSize: 11, fontWeight: '700' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    modelTitle: { fontSize: 17, fontWeight: '800' },
    typePill: { fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 6, alignSelf: 'flex-start' },
    priceBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    priceText: { fontWeight: '900', fontSize: 14 },
    stockSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#eeeeee20', paddingTop: 8 },
    shopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    shopNameContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    shopName: { fontSize: 13, fontWeight: '600' },
    qtyCircle: { minWidth: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    qtyText: { fontSize: 11, fontWeight: '900' },
});