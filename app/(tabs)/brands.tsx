import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getBrandsByCategory } from '@/constants/api';
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
    View,
} from 'react-native';

export default function BrandsPage() {
  const { category } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme as keyof typeof Colors];
  const router = useRouter();

  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBrands = async () => {
    try {
      const data = await getBrandsByCategory(category as string);
      setBrands(data || []);
    } catch (error) {
      console.error("Error loading brands:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, [category]);

  const renderBrandCard = ({ item: brand }: { item: string }) => (
    <Pressable
      style={GlobalStyles.brandCard}
      onPress={() => router.push({ pathname: '/items', params: { category, brand } })}
    >
      <View style={[GlobalStyles.brandLogoCircle, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Image
          source={{ uri: `https://erpnext-209450-0.cloudclusters.net/files/${brand.trim().toLowerCase()}.png` }}
          style={styles.brandLogo}
        />
        {/* Fallback initial if image fails to load */}
        <Text style={[styles.brandInitial, { color: theme.textMuted }]}>
          {brand.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.brandText, { color: theme.textMuted }]}>
        {brand.toUpperCase()}
      </Text>
    </Pressable>
  );

  return (
    <ThemedView style={[GlobalStyles.container, { backgroundColor: theme.background }]}>
      {/* Header with Back Button and Category Title */}
      <View style={GlobalStyles.header}>
        <View style={GlobalStyles.titleRow}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.back()} style={[GlobalStyles.iconBtn]}>
              <IconSymbol name="chevron.left" size={20} color={theme.text} />
            </Pressable>
                <ThemedText style={[GlobalStyles.mainTitle, { color: theme.text  , marginLeft:-12}]}>
                Brands
                </ThemedText>
            {/* <ThemedText style={GlobalStyles.mainTitle}>
              {category} Brands
            </ThemedText> */}
          </View>
          
          <Pressable 
            onPress={() => { setRefreshing(true); loadBrands(); }} 
            style={[GlobalStyles.iconBtn, { backgroundColor: theme.refreshBg }]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={theme.refreshtint} />
            ) : (
              <IconSymbol name="arrow.counterclockwise" size={18} color={theme.refreshtint} />
            )}
          </Pressable>
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator color={theme.tint} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={brands}
          renderItem={renderBrandCard}
          keyExtractor={(item) => item}
          numColumns={3} // Grid layout
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBrands(); }} tintColor={theme.tint} />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No brands found in this category.</Text>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gridRow: { justifyContent: 'flex-start', gap: 12 },
  brandLogo: { 
    width: '65%', 
    height: '65%', 
    resizeMode: 'contain', 
    zIndex: 2 
  },
  brandInitial: { 
    position: 'absolute', 
    fontSize: 28, 
    fontWeight: 'bold', 
    zIndex: 1, 
    opacity: 0.15 
  },
  brandText: { 
    marginTop: 8, 
    fontSize: 10, 
    fontWeight: '800', 
    textAlign: 'center',
    letterSpacing: 0.5
  },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});