import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, GlobalStyles } from '@/constants/Styles';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View
} from 'react-native';

const BASE_URL = 'https://erpnext-209450-0.cloudclusters.net';

export default function CategoryPage() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme as keyof typeof Colors];
  const router = useRouter();
  const [userName, setUserName] = useState('Admin');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializePage = async () => {
      await fetchUser();
      await fetchCategories();
    };
    initializePage();
  }, []);

  const fetchUser = async () => {
    const storedName = await SecureStore.getItemAsync('user_name');
    if (storedName) setUserName(storedName);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Fetching Item Groups from ERPNext
      const response = await fetch(
        `${BASE_URL}/api/resource/Item Group?fields=["name","parent_item_group"]`
      );
      const json = await response.json();

      if (json.data) {
        // Filter out the root group and transform the data
        const dynamicCategories = json.data
          .filter((group: any) => group.name !== "All Item Groups")
          .map((group: any) => {
            const name = group.name;
            
            // Logic to determine Icon and Label based on Name
            let label = name.toUpperCase();
            let icon = 'cube.fill'; // Default icon for "Products"
            let isGlass = 0;

            if (name === 'Glasses') {
              label = 'TEMPERED GLASS';
              icon = 'square.grid.3x3.fill';
              isGlass = 1;
            } else if (name === 'Cover') {
              label = 'MOBILE COVERS';
              icon = 'iphone';
              isGlass = 0;
            }

            return {
              id: name,
              label: label,
              icon: icon,
              itemGroup: name,
              isGlass: isGlass
            };
          });

        setCategories(dynamicCategories);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Error", "Could not load categories from inventory.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to exit?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive", onPress: async () => {
          await SecureStore.deleteItemAsync('frappe_session');
          router.replace('/login');
        }
      }
    ]);
  };

  return (
    <ThemedView style={[GlobalStyles.container, { backgroundColor: theme.background }]}>
      <View style={GlobalStyles.header}>
        <View style={GlobalStyles.titleRow}>
          <ThemedText style={[GlobalStyles.mainTitle, { color: theme.text }]}>
            Live Stock
          </ThemedText>
          <Pressable onPress={handleLogout} style={[GlobalStyles.iconBtn, { backgroundColor: theme.logoutBg }]}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={theme.logouttint} />
          </Pressable>
        </View>

        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.iconBtn, borderColor: theme.border }]}>
              <Text style={[styles.avatarText, { color: theme.tint }]}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.welcomeText, { color: theme.textMuted }]}>Welcome back,</Text>
              <Text style={[styles.userNameText, { color: theme.text }]}>{userName}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.categoryList}>
            {categories.map((cat) => (
              <Pressable 
                key={cat.id} 
                style={[styles.menuCard, { borderBottomColor: theme.border }]} 
                onPress={() => router.push({ 
                  pathname: '/brands', 
                  params: { 
                    category: cat.id,
                    itemGroup: cat.itemGroup,
                    isGlass: cat.isGlass 
                  } 
                })}
              >
                <View style={[GlobalStyles.iconBtn, { marginRight: 15, backgroundColor: theme.iconBtn }]}>
                  <IconSymbol name={cat.icon as any} size={18} color={theme.tint} />
                </View>
                <Text style={[styles.menuText, { color: theme.text }]}>{cat.label}</Text>
                <IconSymbol name="chevron.right" size={14} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 15 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  avatarText: { fontWeight: 'bold', fontSize: 18 },
  welcomeText: { fontSize: 11 },
  userNameText: { fontSize: 15, fontWeight: 'bold' },
  categoryList: { gap: 4 },
  menuCard: { width: '100%', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 18 },
  menuText: { fontWeight: '900', fontSize: 14, flex: 1, letterSpacing: 0.5 },
});