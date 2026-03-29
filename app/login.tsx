import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert, // Add this
    Keyboard // Add this
    ,





    KeyboardAvoidingView, // Add this
    Platform,
    Pressable,
    StyleSheet,
    TextInput, // Add this
    TouchableWithoutFeedback,
    View
} from 'react-native';

export default function LoginScreen() {
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
    <ThemedView style={styles.container}>
      {/* 1. Wrap in KeyboardAvoidingView */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* 2. Dismiss keyboard when tapping empty space */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            <View style={styles.content}>
              <View style={styles.header}>
                <IconSymbol name="lock.shield.fill" size={60} color="#4CAF50" />
                <ThemedText style={styles.title}>Murlidhar ERP</ThemedText>
                <ThemedText style={styles.subtitle}>For Login Enter Credentials</ThemedText>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputPill}>
                  <IconSymbol name="person.fill" size={18} color="#666" />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Username" 
                    placeholderTextColor="#444"
                    value={username} 
                    onChangeText={setUsername} 
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputPill}>
                  <IconSymbol name="lock.fill" size={18} color="#666" />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Password" 
                    placeholderTextColor="#444"
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
                      color="#666" 
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable 
                style={({pressed}) => [styles.button, pressed && {opacity: 0.8}]} 
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <ThemedText style={styles.buttonText}>Authorize System</ThemedText>
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
  container: { flex: 1, backgroundColor: '#000' },
  inner: { flex: 1, justifyContent: 'center' }, // New wrapper to ensure centering
  content: { paddingHorizontal: 30 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 10 },
  subtitle: { color: '#666', fontSize: 14, marginTop: 5 },
  inputGroup: { gap: 15, marginBottom: 30 },
  inputPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#0A0A0A', 
    borderRadius: 99, 
    paddingHorizontal: 20, 
    height: 60, 
    borderWidth: 1, 
    borderColor: '#1A1A1A' 
  },
  input: { flex: 1, color: '#fff', marginLeft: 10, fontSize: 16 },
  eyeButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: { 
    backgroundColor: '#4CAF50', 
    height: 60, 
    borderRadius: 99, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '900' }
});