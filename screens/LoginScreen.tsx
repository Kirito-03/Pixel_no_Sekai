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
import databaseService from '../services/databaseService';
import { useAuth } from '../contexts/AuthContext';
import { loginEmail, loginGoogle } from '../services/auth';

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
  const [loading, setLoading] = useState(false);

  // --- Recuperación de contraseña ---
  const [forgotVisible, setForgotVisible] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email y contraseña');
      return;
    }

    setLoading(true);

    try {
      const cred = await loginEmail(email.trim().toLowerCase(), password);
      await login({ uid: cred.user.uid, email: cred.user.email || email.trim().toLowerCase() });
      navigation.replace('ProfileSelection');
      return;
    } catch (error: any) {
      console.error('Error en login:', error);
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      const isNetworkError = error.code === 'NETWORK_ERROR' || 
                            error.code === 'ERR_NETWORK' || 
                            error.message?.includes('Network Error') ||
                            error.message?.includes('Network request failed');

      if (status === 401 || message?.includes('Credenciales inválidas')) {
        setTimeout(() => {
          Alert.alert('Usuario o contraseña incorrecta', 'Verifica tus datos e inténtalo de nuevo.', [{ text: 'OK' }]);
        }, 100);
      } else if (status === 400) {
        setTimeout(() => {
          Alert.alert('Datos incompletos', 'Email y contraseña son requeridos.', [{ text: 'OK' }]);
        }, 100);
      } else if (isNetworkError) {
        setTimeout(() => {
          Alert.alert(
            'Error de conexión', 
            'No se pudo conectar con el servidor.\n\nVerifica que:\n• El servidor esté ejecutándose\n• Estés en la misma red\n• El firewall no esté bloqueando la conexión', 
            [{ text: 'OK' }]
          );
        }, 100);
      } else {
        setTimeout(() => {
          Alert.alert('Error Inesperado', `Ocurrió un problema: ${error.message || 'Error desconocido'}`, [{ text: 'OK' }]);
        }, 100);
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, navigation]);

  const handleLoginGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const cred = await loginGoogle();
      await login({ uid: cred.user.uid, email: cred.user.email || '' });
      navigation.replace('ProfileSelection');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

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

                <TouchableOpacity style={styles.googleButton} onPress={handleLoginGoogle} disabled={loading}>
                  <Ionicons name="logo-google" size={20} color="#000" style={{ marginRight: 8 }} />
                  <Text style={styles.googleButtonText}>Iniciar sesión con Google</Text>
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
                  Ingresa tu correo asociado a la cuenta. Te enviaremos un código de recuperación.
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
                        console.log('🔄 ForgotPassword: solicitando token para', emailToUse);
                        const res = await databaseService.forgotPassword(emailToUse);
                        console.log('✅ ForgotPassword: respuesta', res);
                        // En entorno de desarrollo, el backend devuelve el token
                        if (res?.token) {
                          setResetToken(res.token);
                          setResetVisible(true);
                          setForgotVisible(false);
                          Alert.alert(
                            'Código generado',
                            `Se generó un código de recuperación (dev):\n${res.token}\n\nVigencia: ${res.expires_in_minutes || 10} minutos.`
                          );
                        } else {
                          Alert.alert(
                            'Correo enviado',
                            'Si el correo existe, se envió un código de recuperación.'
                          );
                          setForgotVisible(false);
                          setResetVisible(true);
                        }
                        // Prefijar el email en el formulario de reseteo
                        setEmail(emailToUse);
                      } catch (error: any) {
                        console.error('❌ ForgotPassword error:', error?.response?.data || error.message);
                        const status = error?.response?.status;
                        const message = error?.response?.data?.message;
                        if (status === 404 || message?.includes('no encontrado')) {
                          Alert.alert('Cuenta no encontrada', 'No existe un usuario con ese correo.');
                        } else {
                          Alert.alert('Error', message || 'No se pudo procesar la solicitud.');
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
                      <Text style={styles.modalButtonText}>Enviar código</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal: Ingresar código y nueva contraseña */}
          <Modal
            visible={resetVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setResetVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Restablecer contraseña</Text>
                <Text style={styles.modalDesc}>Ingresa el código recibido y tu nueva contraseña.</Text>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Código de recuperación"
                  placeholderTextColor="#8c8c8c"
                  value={resetToken}
                  onChangeText={setResetToken}
                  autoCapitalize="none"
                />

                <TextInput
                  style={styles.modalInput}
                  placeholder="Nueva contraseña"
                  placeholderTextColor="#8c8c8c"
                  value={newPassword1}
                  onChangeText={setNewPassword1}
                  secureTextEntry
                  autoCapitalize="none"
                />

                <TextInput
                  style={styles.modalInput}
                  placeholder="Confirmar contraseña"
                  placeholderTextColor="#8c8c8c"
                  value={newPassword2}
                  onChangeText={setNewPassword2}
                  secureTextEntry
                  autoCapitalize="none"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={() => setResetVisible(false)}
                    disabled={resetLoading}
                  >
                    <Text style={styles.modalButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, resetLoading && { opacity: 0.7 }]}
                    onPress={async () => {
                      const emailToUse = (forgotEmail || email).trim().toLowerCase();
                      if (!emailToUse) {
                        Alert.alert('Email requerido', 'Completa tu correo primero.');
                        return;
                      }
                      if (!resetToken.trim()) {
                        Alert.alert('Código requerido', 'Ingresa el código de recuperación.');
                        return;
                      }
                      if (newPassword1.length < 6) {
                        Alert.alert('Contraseña insegura', 'La contraseña debe tener al menos 6 caracteres.');
                        return;
                      }
                      if (newPassword1 !== newPassword2) {
                        Alert.alert('Las contraseñas no coinciden', 'Verifica ambas entradas.');
                        return;
                      }
                      setResetLoading(true);
                      try {
                        console.log('🔄 ResetPassword: reseteando contraseña para', emailToUse);
                        const res = await databaseService.resetPassword(emailToUse, resetToken.trim(), newPassword1);
                        console.log('✅ ResetPassword: respuesta', res);
                        Alert.alert('Contraseña actualizada', 'Ahora puedes iniciar sesión con tu nueva contraseña.', [
                          { text: 'OK', onPress: () => setResetVisible(false) },
                        ]);
                        // Rellenar el formulario de login y cerrar modales
                        setEmail(emailToUse);
                        setPassword(newPassword1);
                        setForgotVisible(false);
                        setResetVisible(false);
                      } catch (error: any) {
                        console.error('❌ ResetPassword error:', error?.response?.data || error.message);
                        const status = error?.response?.status;
                        const message = error?.response?.data?.message;
                        if (status === 400 || message?.includes('Token inválido')) {
                          Alert.alert('Código inválido', 'El código es incorrecto o ha expirado.');
                        } else {
                          Alert.alert('Error', message || 'No se pudo actualizar la contraseña.');
                        }
                      } finally {
                        setResetLoading(false);
                      }
                    }}
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalButtonText}>Actualizar contraseña</Text>
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