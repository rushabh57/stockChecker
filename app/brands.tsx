import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getBrandLogo, getBrandsByCategory, getWarehouses } from '@/constants/api';
import { Colors, GlobalStyles } from '@/constants/Styles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from 'react-native';

export default function BrandsPage() {
    const { category } = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const router = useRouter();

    const [brands, setBrands] = useState([]);
    const [shops, setShops] = useState(['All']); 
    const [selectedShop, setSelectedShop] = useState('All');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Ensure we pass the actual shop name or undefined if "All"
            const warehouseFilter = selectedShop === 'All' ? undefined : selectedShop;
    
            // Fetch Brands and Warehouses
            const [brandNames, dynamicWarehouses] = await Promise.all([
                getBrandsByCategory(category, warehouseFilter), 
                getWarehouses()
            ]);
    
            // Update Shops list only if we got data (prevents flickering)
            if (dynamicWarehouses && dynamicWarehouses.length > 0) {
                setShops(['All', ...dynamicWarehouses]);
            }
    
            // Fetch Logos
            const brandDataPromises = brandNames.map(async (name) => {
                try {
                    const brandLogo = await getBrandLogo(name);
                    return { name, image: brandLogo || null };
                } catch (err) {
                    return { name, image: null };
                }
            });
    
            const finalBrands = await Promise.all(brandDataPromises);
            setBrands(finalBrands);
        } catch (error) {
            console.error("Error loading dynamic data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    
    // Ensure this useEffect is exactly like this
    useEffect(() => {
        loadData();
    }, [category, selectedShop]);

   

    const renderBrandRow = ({ item: brandObj }) => {
        const brandName = brandObj.name;
        const brandImageSource = brandObj.image 
            ? { uri: `https://erpnext-209450-0.cloudclusters.net${brandObj.image}` }
            : null;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.brandRow,
                    { backgroundColor: pressed ? theme.card : 'transparent' }
                ]}
                onPress={() => router.push({ 
                    pathname: '/items', 
                    params: { 
                        category, 
                        brand: brandName, 
                        warehouse: selectedShop !== 'All' ? selectedShop : '' 
                    } 
                })}
            >
                <View style={[styles.logoBox, { backgroundColor: theme.background }]}>
                    {brandImageSource ? (
                        <Image source={brandImageSource} style={styles.rowLogo} resizeMode="contain" />
                    ) : (
                        <Text style={[styles.rowInitial, { color: theme.tint }]}>
                            {brandName.charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>

                <Text style={[styles.rowNameText, { color: theme.text }]}>
                    {brandName}
                </Text>

                <IconSymbol name="chevron.right" size={14} color={theme.textMuted} />
            </Pressable>
        );
    };

    return (
        <ThemedView style={[GlobalStyles.container, { backgroundColor: theme.background }]}>
            <View style={GlobalStyles.header}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={() => router.back()} style={GlobalStyles.iconBtn}>
                        <IconSymbol name="chevron.left" size={20} color={theme.text} />
                    </Pressable>
                    <View style={styles.headerTitleRow}>
                        <ThemedText style={[GlobalStyles.mainTitle, { color: theme.text, marginLeft: -12 }]}>
                            Brands
                        </ThemedText>
                        <Pressable 
                            onPress={() => { setRefreshing(true); loadData(); }} 
                            style={[styles.refreshPill, { backgroundColor: theme.card, borderColor: theme.border }]}
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
            </View>

            <View style={styles.chipWrapper}>
                <FlatList
                    horizontal
                    data={shops}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipList}
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => setSelectedShop(item)}
                            style={[
                                styles.chip,
                                { 
                                    backgroundColor: selectedShop === item ? theme.primary + "50" : theme.card,
                                    borderColor: selectedShop === item ? theme.border : theme.border + '80',
                                }
                            ]}
                        >
                            <Text style={[
                                styles.chipText, 
                                { color: selectedShop === item ? theme.text : theme.textMuted }
                            ]}>
                                {item}
                            </Text>
                        </Pressable>
                    )}
                    keyExtractor={(item) => item}
                />
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator color={theme.tint} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={brands}
                    renderItem={renderBrandRow}
                    keyExtractor={(item) => item.name}
                    ItemSeparatorComponent={() => (
                        <View style={[styles.separator, { backgroundColor: theme.textMuted + '20' }]} />
                    )}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={() => { setRefreshing(true); loadData(); }} 
                            tintColor={theme.tint} 
                        />
                    }
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                            No brands found in {selectedShop}.
                        </Text>
                    }
                />
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '85%', flexDirection: 'row' },
    refreshPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    refreshText: { fontSize: 12, fontWeight: '700' },
    chipWrapper: { marginBottom: 10 },
    chipList: { paddingHorizontal: 16, gap: 10, paddingVertical: 10 },
    chip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    chipText: { fontSize: 13, fontWeight: '700' },
    brandRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
    logoBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(150,150,150,0.1)' },
    rowLogo: { width: '100%', height: '100%' },
    rowInitial: { fontSize: 20, fontWeight: '700' },
    rowNameText: { flex: 1, marginLeft: 18, fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
    separator: { height: 1, marginLeft: 88, marginRight: 20 },
    emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14, fontWeight: '600' },
});