import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  useWindowDimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  // MEJORA: Importar los tipos de estilo para TypeScript
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import databaseService from '../services/databaseService';

// MEJORA: Definir un tipo para la estructura de los estilos dinámicos
type DynamicStyles = {
  scrollContent: ViewStyle;
  logoContainer: ViewStyle;
  logo: TextStyle;
  formContainer: ViewStyle;
  title: TextStyle;
};

export default function LoginScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email y contraseña');
      return;
    }

    setLoading(true);

    try {
      const user = await databaseService.login(email.trim().toLowerCase(), password);
      navigation.replace('ProfileSelection', { userId: user.id });
      return;
    } catch (error: any) {
      console.error('Error en login:', error);
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      if (status === 401 || message?.includes('Credenciales inválidas')) {
        setTimeout(() => {
          Alert.alert('Usuario o contraseña incorrecta', 'Verifica tus datos e inténtalo de nuevo.', [{ text: 'OK' }]);
        }, 100);
      } else if (status === 400) {
        setTimeout(() => {
          Alert.alert('Datos incompletos', 'Email y contraseña son requeridos.', [{ text: 'OK' }]);
        }, 100);
      } else if (error.message?.includes('Network request failed')) {
        setTimeout(() => {
          Alert.alert('Error de conexión', 'No se pudo conectar con el servidor. Verifica tu conexión a internet.', [{ text: 'OK' }]);
        }, 100);
      } else {
        setTimeout(() => {
          Alert.alert('Error Inesperado', 'Ocurrió un problema. Por favor, inténtalo de nuevo más tarde.', [{ text: 'OK' }]);
        }, 100);
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, navigation]);

  // MEJORA: Aplicar el tipo 'DynamicStyles' al hook useMemo para solucionar el error de TypeScript
  const dynamicStyles: DynamicStyles = useMemo(() => ({
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingVertical: isSmallScreen ? 20 : 40,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: isSmallScreen ? 30 : 50,
      marginTop: isSmallScreen ? 20 : 0,
    },
    logo: {
      fontSize: isSmallScreen ? 40 : 56,
      fontWeight: 'bold',
      color: colors.primary,
      letterSpacing: 2,
    },
    formContainer: {
      // TypeScript ahora entiende que este 'width' es para un estilo y lo acepta
      width: isSmallScreen ? '90%' : 450,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.75)',
      borderRadius: 4,
      padding: isSmallScreen ? 24 : 60,
    },
    title: {
      fontSize: isSmallScreen ? 28 : 32,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: isSmallScreen ? 24 : 28,
    },
  }), [isSmallScreen]);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1517602302552-471fe67f1d36?q=80&w=1920&auto=format&fit=crop',
        }}
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
              contentContainerStyle={dynamicStyles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={dynamicStyles.logoContainer}>
                <Text style={dynamicStyles.logo}>DSIVIEW</Text>
              </View>

              <View style={dynamicStyles.formContainer}>
                <Text style={dynamicStyles.title}>Iniciar sesión</Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email o número de celular"
                    placeholderTextColor="#8c8c8c"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    accessibilityLabel="Campo de entrada para email"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#8c8c8c"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    accessibilityLabel="Campo de entrada para contraseña"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#8c8c8c"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, loading && { opacity: 0.6 }]}
                  onPress={handleLogin}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Iniciar sesión"
                >
                  <Text style={styles.loginButtonText}>
                    {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.separatorContainer}>
                  <View style={styles.separator} />
                  <Text style={styles.separatorText}>O</Text>
                  <View style={styles.separator} />
                </View>

                <TouchableOpacity style={styles.codeButton}>
                  <Text style={styles.codeButtonText}>
                    Usar un código de inicio de sesión
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>
                    ¿Olvidaste la contraseña?
                  </Text>
                </TouchableOpacity>

                <View style={styles.rememberContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    <View
                      style={[
                        styles.checkboxBox,
                        rememberMe && styles.checkboxBoxChecked,
                      ]}
                    >
                      {rememberMe && (
                        <Ionicons name="checkmark" size={16} color="#000" />
                      )}
                    </View>
                    <Text style={styles.rememberText}>Recordarme</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>¿Primera vez en DSIView?</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.signupLink}>Regístrate aquí.</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.infoText}>
                  Esta página está protegida por Google reCAPTCHA para comprobar que
                  no eres un robot.{' '}
                  <Text style={styles.infoLink}>Más info.</Text>
                </Text>
              </View>

              <View style={styles.testCredentials}>
                <Ionicons name="information-circle" size={18} color="#46d369" />
                <Text style={styles.testCredentialsText}>
                  Prueba con: admin / admin
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 4,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: '#333',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  loginButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separator: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  separatorText: {
    color: '#8c8c8c',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  codeButton: {
    backgroundColor: '#333',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  codeButtonText: {
    color: colors.text,
    fontSize: 14,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#b3b3b3',
    fontSize: 13,
  },
  rememberContainer: {
    marginBottom: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#8c8c8c',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  rememberText: {
    color: '#b3b3b3',
    fontSize: 13,
  },
  signupContainer: {
    flexDirection: 'row',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  signupText: {
    color: '#8c8c8c',
    fontSize: 16,
    marginRight: 6,
  },
  signupLink: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    color: '#8c8c8c',
    fontSize: 13,
    marginTop: 20,
    lineHeight: 20,
  },
  infoLink: {
    color: '#0071eb',
  },
  testCredentials: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  testCredentialsText: {
    color: '#46d369',
    fontSize: 14,
    fontWeight: '600',
  },
});