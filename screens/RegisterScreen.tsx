import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  useWindowDimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import databaseService from '../services/databaseService';
import { registerEmail, loginEmail, loginGoogle as loginGoogleProxy, signInWithGoogleAndroid } from '../services/auth';
import * as GoogleAuth from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';
// import { DYNAMIC_NETWORK_CONFIG } from '../utils/networkUtils';

interface RegisterScreenProps {
  navigation: any;
}

// Flujo simplificado al estilo Netflix: sólo Email/Contraseña y Perfil
type Step = 'email' | 'profile';

// Avatares disponibles para los perfiles
const AVAILABLE_AVATARS = [
  { id: '1', name: 'Avatar 1', emoji: '👤', color: '#e50914' },
  { id: '2', name: 'Avatar 2', emoji: '👨', color: '#0071eb' },
  { id: '3', name: 'Avatar 3', emoji: '👩', color: '#46d369' },
  { id: '4', name: 'Avatar 4', emoji: '🧑', color: '#f59e0b' },
  { id: '5', name: 'Avatar 5', emoji: '👶', color: '#8b5cf6' },
  { id: '6', name: 'Avatar 6', emoji: '🧒', color: '#ec4899' },
  { id: '7', name: 'Avatar 7', emoji: '👧', color: '#06b6d4' },
  { id: '8', name: 'Avatar 8', emoji: '👦', color: '#84cc16' },
];

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Eliminado flujo de plan/pago (no se requiere)
  const [profileName, setProfileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = React.useRef<any>(null);

  // Planes/Pagos removidos en este flujo

  const validateEmail = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Ingresa un email válido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateProfile = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!profileName.trim()) {
      newErrors.profileName = 'El nombre del perfil es requerido';
    }

    if (!selectedImageUri) {
      newErrors.avatar = 'Debes seleccionar una foto de perfil';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectProfileImage = async () => {
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permisos requeridos',
          'Necesitamos acceso a tu galería para agregar una foto de perfil',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setSelectedImageUri(result.assets[0].uri);
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleWebFileSelect = async (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, avatar: 'Por favor selecciona un archivo de imagen' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, avatar: 'El archivo es demasiado grande. Máximo 5MB' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImageUri(e.target?.result as string);
      setErrors(prev => ({ ...prev, avatar: '' }));
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNext = () => {
    if (currentStep === 'email') {
      if (validateEmail()) {
        setCurrentStep('profile');
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 'profile') {
      setCurrentStep('email');
    }
  };

  const testConnection = async () => true;

  const handleRegister = async () => {
    if (!validateProfile()) return;

    setLoading(true);

    // Registro sin backend: usamos Firebase directamente

    try {
      // Registrar el usuario
      const cred = await registerEmail(email.trim().toLowerCase(), password);
      console.log('Usuario registrado (Firebase):', cred.user?.uid);

      // Subir la imagen del perfil primero
      setUploadingImage(true);
      let avatarUrl: string;

      if (!selectedImageUri) {
        throw new Error('Debes seleccionar una foto de perfil');
      }

      if (Platform.OS === 'web' && selectedImageUri.startsWith('data:')) {
        const uploadResult = await databaseService.uploadAvatar(selectedImageUri);
        avatarUrl = uploadResult.url;
      } else if (typeof selectedImageUri === 'string') {
        // En móvil, usar la URI directamente
        const uploadResult = await databaseService.uploadAvatar(selectedImageUri);
        avatarUrl = uploadResult.url;
      } else {
        throw new Error('Tipo de imagen no soportado');
      }

      setUploadingImage(false);

      // Crear un perfil automáticamente con el nombre y avatar proporcionado
      const profileResult = await databaseService.createProfile({
        usuario_id: 0,
        name: profileName.trim() || 'Mi Perfil',
        avatar_url: avatarUrl,
      });
      console.log('Perfil creado con ID:', profileResult?.id);

      // Obtener el perfil creado para pasarlo a la pantalla principal
      const profiles = await databaseService.getProfiles(0);
      const createdProfile = profiles.find((p: any) => p.id === profileResult.id);

      if (createdProfile) {
        // Navegar directamente a la pantalla principal con el perfil seleccionado
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'Principal',
              params: {
                selectedProfile: createdProfile,
              },
            },
          ],
        });
      } else {
        // Si no se encuentra el perfil, ir a selección de perfiles
        navigation.reset({
          index: 0,
          routes: [
            { name: 'SeleccionPerfil' },
          ],
        });
      }

    } catch (error: any) {
      console.error('Error en registro:', error);
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      let title = 'Error';
      let body = 'No se pudo crear tu cuenta. Intenta de nuevo.';

      if (error?.code === 'auth/email-already-in-use') {
        title = 'Email en uso';
        body = 'Este email ya está registrado. Inicia sesión o usa otro email.';
      }
      if (title && body) {
        Alert.alert(title, body, [{ text: 'OK' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const [googleRequest, googleResponse, googlePromptAsync] = GoogleAuth.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID_RELEASE || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  const handleLoginGoogle = async () => {
    try {
      setGoogleLoading(true);
      if (Platform.OS === 'web') {
        const cred = await loginGoogleProxy();
        navigation.reset({ index: 0, routes: [{ name: 'Principal' }] });
        return;
      }
      if (Platform.OS === 'android') {
        await signInWithGoogleAndroid();
        navigation.reset({ index: 0, routes: [{ name: 'Principal' }] });
        return;
      }
      const res = await googlePromptAsync();
      if (res?.type === 'success' && res?.params?.id_token) {
        const credential = GoogleAuthProvider.credential(res.params.id_token as string);
        const cred = await signInWithCredential(auth, credential);
        navigation.reset({ index: 0, routes: [{ name: 'Principal' }] });
      } else {
        const cred = await loginGoogleProxy();
        navigation.reset({ index: 0, routes: [{ name: 'Principal' }] });
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo continuar con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderStepIndicator = () => {
    const steps = ['email', 'profile'];
    const currentIndex = steps.indexOf(currentStep);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <View key={step} style={styles.stepContainer}>
            <View style={[
              styles.stepCircle,
              index <= currentIndex && styles.stepCircleActive
            ]}>
              <Text style={[
                styles.stepNumber,
                index <= currentIndex && styles.stepNumberActive
              ]}>
                {index + 1}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                index < currentIndex && styles.stepLineActive
              ]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderEmailStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Crea tu cuenta</Text>
      <Text style={styles.stepSubtitle}>
        Ingresa tu email y una contraseña para empezar
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="Correo electrónico"
          placeholderTextColor="#8c8c8c"
          value={email}
          onChangeText={(text) => {
            setEmail(text.toLowerCase());
            clearError('email');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={[
              styles.input,
              errors.password && styles.inputError,
              { paddingRight: 44 }
            ]}
            placeholder="Contraseña"
            placeholderTextColor="#8c8c8c"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearError('password');
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setShowPassword(prev => !prev)}
            style={{ position: 'absolute', right: 12, top: 12, padding: 4 }}
            disabled={loading}
          >
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#8c8c8c" />
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>

      <TouchableOpacity
        style={styles.nextButton}
        onPress={handleNext}
        disabled={loading}
      >
        <Text style={styles.nextButtonText}>Siguiente</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.googleButton, googleLoading && { opacity: 0.6 }]} onPress={handleLoginGoogle} disabled={googleLoading}>
        {googleLoading ? (
          <ActivityIndicator color="#000000" />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.googleButtonText}>Continuar con Google</Text>
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('Ingreso')}
      >
        <Text style={styles.loginLinkText}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>
    </View>
  );

  // Paso de Plan removido

  // Paso de Pago removido

  const renderProfileStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>¡Casi terminamos!</Text>
      <Text style={styles.stepSubtitle}>
        Crea tu perfil y comenzaremos tu experiencia en Pixel No Sekai
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.profileName && styles.inputError]}
          placeholder="Nombre del perfil"
          placeholderTextColor="#8c8c8c"
          value={profileName}
          onChangeText={(text) => {
            setProfileName(text);
            clearError('profileName');
          }}
          autoCapitalize="words"
          editable={!loading}
        />
        {errors.profileName && <Text style={styles.errorText}>{errors.profileName}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Foto de perfil (obligatorio):</Text>
        <TouchableOpacity
          style={styles.imagePickerContainer}
          onPress={handleSelectProfileImage}
          disabled={loading || uploadingImage}
        >
          {selectedImageUri ? (
            <Image
              source={{ uri: selectedImageUri }}
              style={styles.previewImage}
            />
          ) : (
            <View style={styles.imagePickerPlaceholder}>
              {uploadingImage ? (
                <ActivityIndicator size="large" color="#E50914" />
              ) : (
                <>
                  <Ionicons name="camera" size={40} color="#8c8c8c" />
                  <Text style={styles.imagePickerText}>Toca para seleccionar imagen</Text>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>
        {errors.avatar && <Text style={styles.errorText}>{errors.avatar}</Text>}

        {/* Input file oculto para web */}
        {Platform.OS === 'web' && (
          <input
            // @ts-ignore
            ref={(el: HTMLInputElement) => { fileInputRef.current = el; }}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleWebFileSelect}
          />
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctaButton, (loading || uploadingImage) && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading || uploadingImage}
        >
          <Text style={styles.nextButtonText} numberOfLines={1} ellipsizeMode="tail">
            {loading || uploadingImage ? 'Creando cuenta e iniciando sesión...' : 'Crear cuenta e iniciar sesión'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'email':
        return renderEmailStep();
      case 'profile':
        return renderProfileStep();
      default:
        return renderEmailStep();
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/fondo login.jpg')}
        style={styles.backgroundImage}
        blurRadius={2}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.logoContainer}>
                <Text style={styles.logo}>Pixel No Sekai</Text>
              </View>

              <View style={styles.formContainer}>
                {renderStepIndicator()}
                {renderCurrentStep()}
              </View>


            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#E50914',
    letterSpacing: 2,
  },
  formContainer: {
    width: '90%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    padding: 40,
    maxWidth: 450,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333333',
  },
  stepCircleActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  stepNumber: {
    color: '#8c8c8c',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#333333',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#E50914',
  },
  stepContent: {
    width: '100%',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#8c8c8c',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#333333',
    borderRadius: 4,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
  },
  inputError: {
    borderColor: '#E50914',
  },
  errorText: {
    color: '#E50914',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  nextButton: {
    backgroundColor: '#E50914',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ctaButton: {
    flex: 1,
    backgroundColor: '#E50914',
    borderRadius: 4,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#333333',
    borderRadius: 4,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  planCard: {
    backgroundColor: '#333333',
    borderRadius: 4,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#E50914',
    backgroundColor: '#404040',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planPrice: {
    color: '#E50914',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planDescription: {
    color: '#8c8c8c',
    fontSize: 14,
  },
  paymentCard: {
    backgroundColor: '#333333',
    borderRadius: 4,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentCardSelected: {
    borderColor: '#E50914',
    backgroundColor: '#404040',
  },
  paymentText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  loginLinkText: {
    color: '#8c8c8c',
    fontSize: 16,
  },
  debugInfo: {
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
  },
  debugText: {
    color: '#46d369',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  imagePickerContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#666',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    alignSelf: 'center',
  },
  imagePickerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePickerText: {
    color: '#8c8c8c',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
});

export default RegisterScreen;
