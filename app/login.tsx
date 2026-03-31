import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/Styles';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  useColorScheme,
  View
} from 'react-native';

export default function LoginScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme as keyof typeof Colors];
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
  
    const handleLogin = async () => {
      if (!username || !password) {
        Alert.alert("Error", "Please enter both credentials");
        return;
      }
  
      setLoading(true);
      try {
        const response = await fetch('https://erpnext-209450-0.cloudclusters.net/api/method/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usr: username, pwd: password }),
        });
  
        const result = await response.json();
  
        if (response.ok) {
          const cookie = response.headers.get('set-cookie');
          if (cookie) {
            await SecureStore.setItemAsync('frappe_session', cookie);
            const nameToSave = result.full_name || username; 
            await SecureStore.setItemAsync('user_name', nameToSave);
            router.replace('/(tabs)'); 
          }
        } else {
          Alert.alert("Login Failed", result.message || "Invalid username or password");
        }
      } catch (error) {
        Alert.alert("Connection Error", "Could not reach ERP server");
      } finally {
        setLoading(false);
      }
    };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            <View style={styles.content}>
              <View style={styles.header}>
                {/* Using theme.tint for the shield to keep it consistent with your brand green */}
                <IconSymbol name="lock.shield.fill" size={60} color={theme.tint} />
                <ThemedText style={[styles.title, { color: theme.text }]}>Murlidhar ERP</ThemedText>
                <ThemedText style={[styles.subtitle, { color: theme.textMuted }]}>For Login Enter Credentials</ThemedText>
              </View>

              <View style={styles.inputGroup}>
                <View style={[styles.inputPill, { backgroundColor: theme.iconBtn, borderColor: theme.border }]}>
                  <IconSymbol name="person.fill" size={18} color={theme.textMuted} />
                  <TextInput 
                    style={[styles.input, { color: theme.text }]} 
                    placeholder="Username" 
                    placeholderTextColor={theme.textMuted}
                    selectionColor={theme.tint}
                    value={username} 
                    onChangeText={setUsername} 
                    autoCapitalize="none"
                  />
                </View>

                <View style={[styles.inputPill, { backgroundColor: theme.iconBtn, borderColor: theme.border }]}>
                  <IconSymbol name="lock.fill" size={18} color={theme.textMuted} />
                  <TextInput 
                    style={[styles.input, { color: theme.text }]} 
                    placeholder="Password" 
                    placeholderTextColor={theme.textMuted}
                    selectionColor={theme.tint}
                    value={password} 
                    onChangeText={setPassword} 
                    secureTextEntry={!showPassword} 
                  />
                  <Pressable 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <IconSymbol 
                      name={showPassword ? "eye.fill" : "eye.slash.fill"} 
                      size={20} 
                      color={theme.textMuted} 
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable 
                style={({pressed}) => [
                    styles.button, 
                    { backgroundColor: theme.primary },
                    pressed && { opacity: 0.8 }
                ]} 
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.background} />
                ) : (
                  <ThemedText style={[styles.buttonText, { color: theme.background  }]}>Login</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 30 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', marginTop: 10 },
  subtitle: { fontSize: 14, marginTop: 5 },
  inputGroup: { gap: 15, marginBottom: 30 },
  inputPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 99, 
    paddingHorizontal: 20, 
    height: 60, 
    borderWidth: 1, 
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },
  eyeButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: { 
    height: 60, 
    borderRadius: 99, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  buttonText: { fontSize: 16, fontWeight: '900' }
});