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
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

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

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [step]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleContinue = () => {
    if (step === 1) {
      if (!email) {
        Alert.alert('Campo requerido', 'Por favor ingresa tu email');
        return;
      }
      if (!validateEmail(email)) {
        Alert.alert('Email inválido', 'Por favor ingresa un email válido');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!name) {
        Alert.alert('Campo requerido', 'Por favor ingresa tu nombre');
        return;
      }
      setStep(3);
    }
  };

  const handleRegister = async () => {
    if (!password) {
      Alert.alert('Campo requerido', 'Por favor ingresa una contraseña');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      Alert.alert(
        '¡Bienvenido a Netflix!',
        `Cuenta creada exitosamente, ${name}`,
        // @ts-ignore
        [{ text: 'Empezar', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error: any) {
      let errorMessage = 'Error al crear la cuenta';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email ya está registrado. ¿Quieres iniciar sesión?';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/weak-password':
          errorMessage = 'Contraseña muy débil. Usa al menos 6 caracteres';
          break;
        default:
          errorMessage = error.message;
      }
      
      Alert.alert('Error de registro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.replace('/login');
    }
  };

  const handleHelp = () => {
    Alert.alert(
      'Ayuda',
      '¿Necesitas ayuda con el registro?\n\nContacta a soporte@netflix.com',
      [{ text: 'Entendido' }]
    );
  };

  const handleSignIn = () => {
    router.replace('/login');
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
            <Text style={styles.stepNumber}>PASO 1 DE 3</Text>
            <Text style={styles.stepTitle}>¿Cuál es tu email?</Text>
            <Text style={styles.stepSubtitle}>
              Agrega tu email para comenzar tu membresía
            </Text>
            
            <View style={[styles.inputContainer, emailFocused && styles.inputFocused]}>
              <TextInput
                style={styles.input}
                placeholder="Ingresa tu email"
                placeholderTextColor="#8c8c8c"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </Animated.View>
        );
      
      case 2:
        return (
          <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
            <Text style={styles.stepNumber}>PASO 2 DE 3</Text>
            <Text style={styles.stepTitle}>Crea tu cuenta</Text>
            <Text style={styles.stepSubtitle}>
              Netflix es personalizado para ti. Ingresa tu nombre para que podamos personalizar tu experiencia.
            </Text>
            
            <View style={[styles.inputContainer, nameFocused && styles.inputFocused]}>
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor="#8c8c8c"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>
            
            <View style={styles.emailDisplay}>
              <Text style={styles.emailLabel}>Email</Text>
              <Text style={styles.emailValue}>{email}</Text>
            </View>
          </Animated.View>
        );
      
      case 3:
        return (
          <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
            <Text style={styles.stepNumber}>PASO 3 DE 3</Text>
            <Text style={styles.stepTitle}>Crea una contraseña</Text>
            <Text style={styles.stepSubtitle}>
              Ingresa una contraseña y estarás viendo en cuestión de minutos.
            </Text>
            
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
              />
            </View>
            
            <View style={styles.passwordHints}>
              <Text style={[styles.hint, password.length >= 6 && styles.hintValid]}>
                {password.length >= 6 ? '✓' : '○'} Mínimo 6 caracteres
              </Text>
            </View>
            
            <View style={styles.emailDisplay}>
              <Text style={styles.emailLabel}>Email</Text>
              <Text style={styles.emailValue}>{email}</Text>
            </View>
          </Animated.View>
        );
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://assets.nflxext.com/ffe/siteui/vlv3/c0b69f8c-3c7f-4d87-876c-5a3aae8d6f06/background.jpg' }}
      style={styles.background}
      blurRadius={3}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Text style={styles.backText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.logo}>NETFLIX</Text>
              <TouchableOpacity onPress={handleHelp}>
                <Text style={styles.helpText}>Ayuda</Text>
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${(step / 3) * 100}%` }]} />
            </View>

            {/* Content */}
            <View style={styles.content}>
              {renderStep()}

              {/* Buttons */}
              <TouchableOpacity 
                style={[styles.continueButton, loading && styles.buttonDisabled]}
                onPress={step === 3 ? handleRegister : handleContinue}
                disabled={loading}
              >
                <Text style={styles.continueButtonText}>
                  {loading ? 'Creando cuenta...' : step === 3 ? 'Finalizar' : 'Continuar'}
                </Text>
              </TouchableOpacity>

              {step === 1 && (
                <TouchableOpacity onPress={handleSignIn}>
                  <Text style={styles.signInText}>
                    ¿Ya tienes cuenta?{' '}
                    <Text style={styles.signInLink}>Inicia sesión</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              Al hacer clic en "Continuar", aceptas los Términos de uso y la Política de privacidad de Netflix.
            </Text>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
  },
  backText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E50914',
    letterSpacing: 2,
  },
  helpText: {
    color: '#fff',
    fontSize: 16,
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  stepContainer: {
    marginBottom: 40,
  },
  stepNumber: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 38,
  },
  stepSubtitle: {
    color: '#b3b3b3',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  inputContainer: {
    backgroundColor: '#333',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#333',
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: '#fff',
  },
  input: {
    color: '#fff',
    fontSize: 16,
    padding: 18,
  },
  emailDisplay: {
    backgroundColor: 'rgba(51,51,51,0.5)',
    borderRadius: 4,
    padding: 16,
    marginTop: 16,
  },
  emailLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  emailValue: {
    color: '#fff',
    fontSize: 16,
  },
  passwordHints: {
    marginTop: 12,
  },
  hint: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  hintValid: {
    color: '#46d369',
  },
  continueButton: {
    backgroundColor: '#E50914',
    borderRadius: 4,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signInText: {
    color: '#b3b3b3',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  signInLink: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    color: '#737373',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
    marginTop: 20,
  },
});