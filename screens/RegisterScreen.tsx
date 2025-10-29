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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import databaseService from '../services/databaseService';
import { DYNAMIC_NETWORK_CONFIG } from '../utils/networkUtils';

interface RegisterScreenProps {
  navigation: any;
}

type Step = 'email' | 'plan' | 'payment' | 'profile';

// Avatares disponibles para los perfiles
const AVAILABLE_AVATARS = [
  { id: '1', name: 'Adulto 1', emoji: '👤', color: '#e50914' },
  { id: '2', name: 'Adulto 2', emoji: '👨', color: '#0071eb' },
  { id: '3', name: 'Adulto 3', emoji: '👩', color: '#46d369' },
  { id: '4', name: 'Adulto 4', emoji: '🧑', color: '#f59e0b' },
  { id: '5', name: 'Niños 1', emoji: '👶', color: '#8b5cf6' },
  { id: '6', name: 'Niños 2', emoji: '🧒', color: '#ec4899' },
  { id: '7', name: 'Niños 3', emoji: '👧', color: '#06b6d4' },
  { id: '8', name: 'Niños 4', emoji: '👦', color: '#84cc16' },
];

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [profileName, setProfileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const plans = [
    { id: 'basic', name: 'Básico', price: '$8.99', description: 'Pantalla única' },
    { id: 'standard', name: 'Estándar', price: '$13.99', description: '2 pantallas simultáneas' },
    { id: 'premium', name: 'Premium', price: '$17.99', description: '4 pantallas simultáneas' },
  ];

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 'email') {
      if (validateEmail()) {
        setCurrentStep('plan');
      }
    } else if (currentStep === 'plan') {
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
      setCurrentStep('profile');
    }
  };

  const handleBack = () => {
    if (currentStep === 'plan') {
      setCurrentStep('email');
    } else if (currentStep === 'payment') {
      setCurrentStep('plan');
    } else if (currentStep === 'profile') {
      setCurrentStep('payment');
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch(DYNAMIC_NETWORK_CONFIG.getHealthURL());
      const data = await response.json();
      console.log('✅ Conexión exitosa:', data);
      return true;
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      return false;
    }
  };

  const handleRegister = async () => {
    if (!validateProfile()) return;

    setLoading(true);
    
    // Probar conexión antes del registro
    const isConnected = await testConnection();
    if (!isConnected) {
      Alert.alert(
        'Error de Conexión',
        `No se puede conectar al servidor.\n\nURL: ${DYNAMIC_NETWORK_CONFIG.getBaseURL()}\n\nVerifica que el servidor esté ejecutándose.`,
        [{ text: 'OK' }]
      );
      setLoading(false);
      return;
    }

    try {
      // Registrar el usuario
      const registerResult = await databaseService.register(email.trim().toLowerCase(), password);
      console.log('✅ Usuario registrado:', registerResult);
      
      // Iniciar sesión automáticamente
      const loginResult = await databaseService.login(email.trim().toLowerCase(), password);
      console.log('✅ Login automático exitoso:', loginResult);
      
      // Crear un perfil automáticamente con el nombre proporcionado
      const profileResult = await databaseService.createProfile({
        usuario_id: loginResult.id,
        name: profileName.trim() || 'Mi Perfil',
        avatar_url: AVAILABLE_AVATARS[0].emoji, // Usar el primer avatar por defecto
      });
      console.log('✅ Perfil creado:', profileResult);
      
      // Obtener el perfil creado para pasarlo a la pantalla principal
      const profiles = await databaseService.getProfiles(loginResult.id);
      const createdProfile = profiles.find((p: any) => p.id === profileResult.id);
      
      if (createdProfile) {
        // Navegar directamente a la pantalla principal con el perfil seleccionado
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'Main',
              params: {
                selectedProfile: createdProfile,
                userId: loginResult.id,
              },
            },
          ],
        });
      } else {
        // Si no se encuentra el perfil, ir a selección de perfiles
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'ProfileSelection',
              params: { userId: loginResult.id },
            },
          ],
        });
      }
      
    } catch (error: any) {
      console.error('Error en registro:', error);
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      let title = 'Error';
      let body = 'No se pudo crear tu cuenta. Intenta de nuevo.';

      if (status === 409 || message?.includes('Email ya registrado')) {
        title = 'Email en uso';
        body = 'Este email ya está registrado. Intenta iniciar sesión.';
      } else if (error.message?.includes('Network request failed')) {
        title = 'Sin conexión';
        body = `Error de conexión.\n\nURL: ${DYNAMIC_NETWORK_CONFIG.getBaseURL()}\n\nVerifica que el servidor esté ejecutándose.`;
      }

      Alert.alert(title, body, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderStepIndicator = () => {
    const steps = ['email', 'plan', 'payment', 'profile'];
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
        Solo necesitamos algunos datos para comenzar
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
        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          placeholder="Contraseña"
          placeholderTextColor="#8c8c8c"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            clearError('password');
          }}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>

      <TouchableOpacity
        style={styles.nextButton}
        onPress={handleNext}
        disabled={loading}
      >
        <Text style={styles.nextButtonText}>Siguiente</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPlanStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Elige tu plan</Text>
      <Text style={styles.stepSubtitle}>
        Puedes cambiar o cancelar tu plan en cualquier momento
      </Text>

      {plans.map((plan) => (
        <TouchableOpacity
          key={plan.id}
          style={[
            styles.planCard,
            selectedPlan === plan.id && styles.planCardSelected
          ]}
          onPress={() => setSelectedPlan(plan.id)}
        >
          <View style={styles.planInfo}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planPrice}>{plan.price}/mes</Text>
            <Text style={styles.planDescription}>{plan.description}</Text>
          </View>
          {selectedPlan === plan.id && (
            <Ionicons name="checkmark-circle" size={24} color="#E50914" />
          )}
        </TouchableOpacity>
      ))}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Siguiente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPaymentStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Método de pago</Text>
      <Text style={styles.stepSubtitle}>
        Tu información de pago está encriptada y segura
      </Text>

      <TouchableOpacity
        style={[
          styles.paymentCard,
          paymentMethod === 'card' && styles.paymentCardSelected
        ]}
        onPress={() => setPaymentMethod('card')}
      >
        <Ionicons name="card" size={24} color="#FFFFFF" />
        <Text style={styles.paymentText}>Tarjeta de crédito o débito</Text>
        {paymentMethod === 'card' && (
          <Ionicons name="checkmark-circle" size={24} color="#E50914" />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.paymentCard,
          paymentMethod === 'paypal' && styles.paymentCardSelected
        ]}
        onPress={() => setPaymentMethod('paypal')}
      >
        <Ionicons name="logo-paypal" size={24} color="#FFFFFF" />
        <Text style={styles.paymentText}>PayPal</Text>
        {paymentMethod === 'paypal' && (
          <Ionicons name="checkmark-circle" size={24} color="#E50914" />
        )}
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Siguiente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {loading ? 'Creando cuenta e iniciando sesión...' : 'Crear cuenta e iniciar sesión'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'email':
        return renderEmailStep();
      case 'plan':
        return renderPlanStep();
      case 'payment':
        return renderPaymentStep();
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

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginLinkText}>
                  ¿Ya tienes cuenta? Inicia sesión
                </Text>
              </TouchableOpacity>

              {/* Debug info - solo en desarrollo */}
              {__DEV__ && (
                <View style={styles.debugInfo}>
                  <Text style={styles.debugText}>
                    🔧 Debug: {DYNAMIC_NETWORK_CONFIG.getBaseURL()}
                  </Text>
                </View>
              )}
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
    padding: 16,
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
});

export default RegisterScreen;