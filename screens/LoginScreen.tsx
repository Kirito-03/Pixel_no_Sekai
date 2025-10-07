import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

export default function LoginScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = () => {
    // Validación simple con admin/admin
    if (email.trim() === 'admin' && password === 'admin') {
      navigation.replace('Main');
    } else {
      Alert.alert(
        'Error de autenticación',
        'Usuario o contraseña incorrectos. Por favor, intenta con:\nUsuario: admin\nContraseña: admin',
        [{ text: 'OK' }]
      );
    }
  };

  const styles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backgroundImage: {
      flex: 1,
      width: '100%' as const,
      height: '100%' as const,
    },
    gradient: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center' as const,
      paddingVertical: isSmallScreen ? 20 : 40,
    },
    logoContainer: {
      alignItems: 'center' as const,
      marginBottom: isSmallScreen ? 30 : 50,
      marginTop: isSmallScreen ? 20 : 0,
    },
    logo: {
      fontSize: isSmallScreen ? 40 : 56,
      fontWeight: 'bold' as const,
      color: colors.primary,
      letterSpacing: 2,
    },
    formContainer: {
      width: (isSmallScreen ? '90%' : 450) as any,
      alignSelf: 'center' as const,
      backgroundColor: 'rgba(0,0,0,0.75)',
      borderRadius: 4,
      padding: isSmallScreen ? 24 : 60,
    },
    title: {
      fontSize: isSmallScreen ? 28 : 32,
      fontWeight: 'bold' as const,
      color: colors.text,
      marginBottom: isSmallScreen ? 24 : 28,
    },
    inputContainer: {
      position: 'relative' as const,
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
      position: 'absolute' as const,
      right: 16,
      top: 16,
    },
    loginButton: {
      backgroundColor: colors.primary,
      borderRadius: 4,
      padding: 16,
      alignItems: 'center' as const,
      marginTop: 24,
      marginBottom: 12,
    },
    loginButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold' as const,
    },
    separatorContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
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
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    codeButtonText: {
      color: colors.text,
      fontSize: 14,
    },
    forgotPassword: {
      alignItems: 'center' as const,
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
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    checkboxBox: {
      width: 20,
      height: 20,
      borderRadius: 2,
      borderWidth: 1,
      borderColor: '#8c8c8c',
      marginRight: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
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
      flexDirection: 'row' as const,
      marginTop: 16,
      flexWrap: 'wrap' as const,
    },
    signupText: {
      color: '#8c8c8c',
      fontSize: 16,
      marginRight: 6,
    },
    signupLink: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold' as const,
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
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: 20,
      gap: 8,
    },
    testCredentialsText: {
      color: '#46d369',
      fontSize: 14,
      fontWeight: '600' as const,
    },
  };

  return (
    <View style={styles.container}>
      {/* Fondo con imagen de películas */}
      <ImageBackground
        source={{
          uri: 'https://assets.nflxext.com/ffe/siteui/vlv3/fc164b4b-f085-44ee-bb7f-ec7df8539eff/d23a1608-7d90-4da1-93d6-bae2fe60a69b/ES-en-20230814-popsignuptwoweeks-perspective_alpha_website_large.jpg',
        }}
        style={styles.backgroundImage}
        blurRadius={2}
      >
        {/* Gradiente oscuro sobre el fondo */}
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
              {/* Logo de DSIView */}
              <View style={styles.logoContainer}>
                <Text style={styles.logo}>DSIVIEW</Text>
              </View>

              {/* Formulario de inicio de sesión */}
              <View style={styles.formContainer}>
                <Text style={styles.title}>Iniciar sesión</Text>

                {/* Campo de email/usuario */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email o número de celular"
                    placeholderTextColor="#8c8c8c"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                {/* Campo de contraseña */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#8c8c8c"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#8c8c8c"
                    />
                  </TouchableOpacity>
                </View>

                {/* Botón de iniciar sesión */}
                <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                  <Text style={styles.loginButtonText}>Iniciar sesión</Text>
                </TouchableOpacity>

                {/* Separador */}
                <View style={styles.separatorContainer}>
                  <View style={styles.separator} />
                  <Text style={styles.separatorText}>O</Text>
                  <View style={styles.separator} />
                </View>

                {/* Botón de código de inicio */}
                <TouchableOpacity style={styles.codeButton}>
                  <Text style={styles.codeButtonText}>
                    Usar un código de inicio de sesión
                  </Text>
                </TouchableOpacity>

                {/* Olvidaste contraseña */}
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>
                    ¿Olvidaste la contraseña?
                  </Text>
                </TouchableOpacity>

                {/* Recordarme */}
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

                {/* Registro */}
                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>¿Primera vez en DSIView?</Text>
                  <TouchableOpacity>
                    <Text style={styles.signupLink}>Suscríbete ya.</Text>
      </TouchableOpacity>
                </View>

                {/* Info adicional */}
                <Text style={styles.infoText}>
                  Esta página está protegida por Google reCAPTCHA para comprobar que
                  no eres un robot.{' '}
                  <Text style={styles.infoLink}>Más info.</Text>
                </Text>
              </View>

              {/* Credenciales de prueba */}
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

