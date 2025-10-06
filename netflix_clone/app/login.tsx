import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBZUzrUAFkj0-Tx-pc6FIlGCkVmuE-Ewos",
  authDomain: "netflix-app-bb606.firebaseapp.com",
  projectId: "netflix-app-bb606",
  storageBucket: "netflix-app-bb606.firebasestorage.app",
  messagingSenderId: "813603140357",
  appId: "1:813603140357:web:76e4f22c322ff29cec7d6c",
  measurementId: "G-Z5KMZ9X9E8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu email y contraseña');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navegar a la app principal
      router.replace('/(tabs)');
    } catch (error: any) {
      let errorMessage = 'Error al iniciar sesión';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No existe una cuenta con este email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Esta cuenta ha sido deshabilitada';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña';
          break;
        default:
          errorMessage = 'Error al iniciar sesión. Intenta de nuevo';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Recuperar contraseña',
      'Por favor contacta a soporte@netflix.com para recuperar tu contraseña',
      [{ text: 'Entendido' }]
    );
  };

  return (
    <ImageBackground
      source={{ uri: 'https://assets.nflxext.com/ffe/siteui/vlv3/c0b69f8c-3c7f-4d87-876c-5a3aae8d6f06/background.jpg' }}
      style={styles.background}
      blurRadius={3}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>PIXEL NO SEKAI</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={styles.title}>Iniciar sesión</Text>

              <View style={[styles.inputContainer, emailFocused && styles.inputFocused]}>
                <TextInput
                  style={styles.input}
                  placeholder="Email o número de teléfono"
                  placeholderTextColor="#8c8c8c"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  editable={!loading}
                />
              </View>

              <View style={[styles.inputContainer, passwordFocused && styles.inputFocused]}>
                <TextInput
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor="#8c8c8c"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity 
                style={[styles.loginButton, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Iniciar sesión</Text>
                )}
              </TouchableOpacity>

              <View style={styles.helpContainer}>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.helpText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>O</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity 
                style={styles.signUpContainer}
                onPress={() => router.push('/register')}
                disabled={loading}
              >
                <Text style={styles.signUpText}>
                  ¿Primera vez en Pixel?{' '}
                  <Text style={styles.signUpLink} onPress={() => router.push('/register')}>
                    Suscríbete ahora
                  </Text>
                </Text>
              </TouchableOpacity>

              <Text style={styles.captchaText}>
                Esta página está protegida por Google reCAPTCHA para comprobar que no eres un robot.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#E50914',
    letterSpacing: 3,
  },
  formContainer: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    padding: 60,
    paddingVertical: 60,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 28,
  },
  inputContainer: {
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputFocused: {
    borderColor: '#fff',
  },
  input: {
    color: '#fff',
    fontSize: 16,
    padding: 16,
  },
  loginButton: {
    backgroundColor: '#E50914',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  helpText: {
    color: '#b3b3b3',
    fontSize: 13,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#8c8c8c',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  signUpContainer: {
    marginTop: 16,
  },
  signUpText: {
    color: '#8c8c8c',
    fontSize: 16,
    textAlign: 'center',
  },
  signUpLink: {
    color: '#fff',
    fontWeight: 'bold',
  },
  captchaText: {
    color: '#8c8c8c',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
});