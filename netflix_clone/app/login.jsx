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
  Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Aquí podrías validar usuario, contraseña, token, etc.
    router.replace('/(tabs)');
  };

  return (
    <ImageBackground
      source={{ uri: 'https://assets.nflxext.com/ffe/siteui/vlv3/c0b69f8c-3c7f-4d87-876c-5a3aae8d6f06/background.jpg' }}
      style={styles.background}
      blurRadius={3}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)', 'rgba(0,0,0,0.95)']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.content}>
            {/* Logo */}
            <Text style={styles.logo}>NETFLIX</Text>
            
            {/* Formulario */}
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email o número de teléfono"
                placeholderTextColor="#8c8c8c"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#8c8c8c"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={handleLogin}
              >
                <Text style={styles.loginButtonText}>Iniciar sesión</Text>
              </TouchableOpacity>

              <View style={styles.helpContainer}>
                <TouchableOpacity>
                  <Text style={styles.rememberText}>☐ Recuérdame</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.helpText}>¿Necesitas ayuda?</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Registro */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>
                ¿Primera vez en Netflix?{' '}
                <Text style={styles.signupLink}>Suscríbete ahora</Text>.
              </Text>
            </View>

            {/* reCAPTCHA notice */}
            <Text style={styles.captchaText}>
              Esta página está protegida por Google reCAPTCHA para comprobar que no eres un robot.{' '}
              <Text style={styles.captchaLink}>Más información</Text>.
            </Text>
          </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 450,
    paddingHorizontal: 20,
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#E50914',
    textAlign: 'left',
    marginBottom: 40,
    letterSpacing: 2,
  },
  formContainer: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    padding: 60,
    paddingTop: 60,
    paddingBottom: 40,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 4,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 0,
  },
  loginButton: {
    backgroundColor: '#E50914',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rememberText: {
    color: '#b3b3b3',
    fontSize: 13,
  },
  helpText: {
    color: '#b3b3b3',
    fontSize: 13,
  },
  signupContainer: {
    marginTop: 20,
  },
  signupText: {
    color: '#737373',
    fontSize: 16,
  },
  signupLink: {
    color: '#fff',
    fontWeight: 'bold',
  },
  captchaText: {
    color: '#737373',
    fontSize: 13,
    marginTop: 20,
    lineHeight: 20,
  },
  captchaLink: {
    color: '#0071eb',
  },
});