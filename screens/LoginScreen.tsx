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
  ViewStyle,
  TextStyle,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { loginEmail, requestPasswordReset, loginGoogle as loginGoogleProxy, getUserDetails } from '../services/auth';
import * as GoogleAuth from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';

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
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleRequest, googleResponse, googlePromptAsync] = GoogleAuth.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID_RELEASE || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  // --- Recuperación de contraseña ---
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email y contraseña');
      return;
    }

    setEmailLoading(true);

    try {
      const cred = await loginEmail(email.trim().toLowerCase(), password);
      const userDetails = await getUserDetails();
      await login({ uid: cred.user.uid, email: cred.user.email || email.trim().toLowerCase(), role: userDetails.role });
      // navigation.replace('SeleccionPerfil'); // Eliminado: AppNavigator maneja esto automáticamente
      return;
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        Alert.alert('Usuario o contraseña incorrecta', 'Verifica tus datos e inténtalo de nuevo.');
      } else if (code === 'auth/user-not-found') {
        Alert.alert('Cuenta no encontrada', 'No existe un usuario con ese correo.');
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Email inválido', 'Revisa el formato de tu correo.');
      } else if (code === 'auth/too-many-requests') {
        Alert.alert('Demasiados intentos', 'Acceso temporalmente bloqueado. Intenta más tarde o restablece tu contraseña.');
      } else if (code === 'auth/network-request-failed') {
        Alert.alert('Error de conexión', 'No se pudo conectar. Verifica tu red.');
      } else if (error?.message) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'No se pudo iniciar sesión.');
      }
    } finally {
      setEmailLoading(false);
    }
  }, [email, password, navigation]);

  const handleLoginGoogle = useCallback(async () => {
    setGoogleLoading(true);
    try {
      if (Platform.OS === 'web') {
        const cred = await loginGoogleProxy();
        const userDetails = await getUserDetails();
        await login({ uid: cred.user.uid, email: cred.user.email || '', role: userDetails.role });
        // navigation.replace('SeleccionPerfil'); // Eliminado
        return;
      }
      const res = await googlePromptAsync();
      if (res?.type === 'success' && res?.params?.id_token) {
        const credential = GoogleAuthProvider.credential(res.params.id_token as string);
        const cred = await signInWithCredential(auth, credential);
        const userDetails = await getUserDetails();
        await login({ uid: cred.user.uid, email: cred.user.email || '', role: userDetails.role });
        // navigation.replace('SeleccionPerfil'); // Eliminado
      } else {
        const cred = await loginGoogleProxy();
        const userDetails = await getUserDetails();
        await login({ uid: cred.user.uid, email: cred.user.email || '', role: userDetails.role });
        // navigation.replace('SeleccionPerfil'); // Eliminado
      }
    } catch (error: any) {
      const msg = error?.message || 'No se pudo iniciar sesión con Google';
      Alert.alert('Error', msg);
    } finally {
      setGoogleLoading(false);
    }
  }, [navigation, googlePromptAsync]);

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
      color: '#E50914', // Rojo Netflix
      letterSpacing: 2,
    },
    formContainer: {
      width: isSmallScreen ? '90%' : 450,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.75)',
      borderRadius: 4,
      padding: isSmallScreen ? 24 : 60,
    },
    title: {
      fontSize: isSmallScreen ? 28 : 32,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: isSmallScreen ? 24 : 28,
    },
  }), [isSmallScreen]);

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
              contentContainerStyle={dynamicStyles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={dynamicStyles.logoContainer}>
                <Text style={dynamicStyles.logo}>Pixel No Sekai</Text>
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
                  style={[styles.loginButton, emailLoading && { opacity: 0.6 }]}
                  onPress={handleLogin}
                  disabled={emailLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Iniciar sesión"
                >
                  {emailLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Iniciar sesión</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.separatorContainer}>
                  <View style={styles.separator} />
                  <Text style={styles.separatorText}>O</Text>
                  <View style={styles.separator} />
                </View>

                <TouchableOpacity style={[styles.googleButton, googleLoading && { opacity: 0.6 }]} onPress={handleLoginGoogle} disabled={googleLoading}>
                  {googleLoading ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color="#000" style={{ marginRight: 8 }} />
                      <Text style={styles.googleButtonText}>Iniciar sesión con Google</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => {
                    setForgotEmail(email);
                    setForgotVisible(true);
                  }}
                >
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
                  <Text style={styles.signupText}>¿Primera vez en Pixel No Sekai?</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Registro')}>
                    <Text style={styles.signupLink}>Regístrate aquí.</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.infoText}>
                  Esta página está protegida por Google reCAPTCHA para comprobar que
                  no eres un robot.{' '}
                  <Text style={styles.infoLink}>Más info.</Text>
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Modal: Solicitar email para recuperación */}
          <Modal
            visible={forgotVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setForgotVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Recuperar contraseña</Text>
                <Text style={styles.modalDesc}>
                  Ingresa tu correo asociado a la cuenta. Te enviaremos un enlace para restablecer tu contraseña.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Tu correo"
                  placeholderTextColor="#8c8c8c"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={() => setForgotVisible(false)}
                    disabled={forgotLoading}
                  >
                    <Text style={styles.modalButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, forgotLoading && { opacity: 0.7 }]}
                    onPress={async () => {
                      const emailToUse = (forgotEmail || email).trim().toLowerCase();
                      if (!emailToUse) {
                        Alert.alert('Email requerido', 'Ingresa tu correo para continuar.');
                        return;
                      }
                      setForgotLoading(true);
                      try {
                        await requestPasswordReset(emailToUse);
                        Alert.alert('Correo enviado', 'Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.');
                        setEmail(emailToUse);
                        setForgotVisible(false);
                      } catch (error: any) {
                        const code = error?.code || '';
                        if (code === 'auth/user-not-found') {
                          Alert.alert('Cuenta no encontrada', 'No existe un usuario con ese correo.');
                        } else if (code === 'auth/invalid-email') {
                          Alert.alert('Email inválido', 'Revisa el formato de tu correo.');
                        } else if (code === 'auth/network-request-failed') {
                          Alert.alert('Error de conexión', 'No se pudo conectar. Verifica tu red.');
                        } else if (error?.message) {
                          Alert.alert('Error', error.message);
                        } else {
                          Alert.alert('Error', 'No se pudo enviar el correo de recuperación.');
                        }
                      } finally {
                        setForgotLoading(false);
                      }
                    }}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalButtonText}>Enviar enlace</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>


        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Fondo negro como Netflix
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
    backgroundColor: '#333333', // Gris oscuro como Netflix
    borderRadius: 4,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF', // Texto blanco
    borderWidth: 1,
    borderColor: '#333333',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  loginButton: {
    backgroundColor: '#E50914', // Rojo Netflix
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  loginButtonText: {
    color: '#FFFFFF', // Texto blanco
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
    backgroundColor: '#333333',
  },
  separatorText: {
    color: '#8c8c8c',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  codeButton: {
    backgroundColor: '#333333',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  codeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
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
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
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
    color: '#FFFFFF',
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
  // --- Modal styles ---
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 6,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalDesc: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#333333',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalButton: {
    backgroundColor: '#E50914',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#333333',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});