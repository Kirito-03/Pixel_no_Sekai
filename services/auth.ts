import { auth, db } from './firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, GoogleAuthProvider, signInWithPopup, signInWithCredential } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'

WebBrowser.maybeCompleteAuthSession()

const ensureUserProfile = async (user: User) => {
  const ref = doc(db, 'profiles', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || '',
      avatarUrl: user.photoURL || '',
      adultContentEnabled: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true })
  } else {
    await setDoc(ref, { updatedAt: serverTimestamp() }, { merge: true })
  }
  
}

export const subscribeAuth = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback)

export const registerEmail = async (email: string, password: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await ensureUserProfile(cred.user)
  return cred
}

export const loginEmail = async (email: string, password: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await ensureUserProfile(cred.user)
  return cred
}

export const loginGoogle = async () => {
  if (Platform.OS === 'web') {
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    await ensureUserProfile(cred.user)
    return cred
  }
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID as string
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID_MISSING')
  // Intento 1: usar Proxy de Expo (más simple en desarrollo)
  const proxyRedirect = (AuthSession.makeRedirectUri as any)({ useProxy: true })
  console.log('Google OAuth proxy redirect URI:', proxyRedirect)
  const buildAuthUrl = (redirect: string) =>
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&response_type=id_token&scope=${encodeURIComponent('openid email profile')}&redirect_uri=${encodeURIComponent(redirect)}&nonce=${Date.now()}`

  let result: any = await WebBrowser.openAuthSessionAsync(buildAuthUrl(proxyRedirect), proxyRedirect)
  let url: string = (result && result.url) ? result.url : ''

  // Fallback: usar esquema nativo si el proxy no funciona en bare/dev-client
  if (result.type !== 'success' || !url.includes('id_token=')) {
    const nativeRedirect = (AuthSession.makeRedirectUri as any)({ scheme: 'netflixapp' })
    console.log('Google OAuth native redirect URI:', nativeRedirect)
    result = await WebBrowser.openAuthSessionAsync(buildAuthUrl(nativeRedirect), nativeRedirect)
    url = (result && result.url) ? result.url : ''
  }

  if (result.type !== 'success' || !url) throw new Error('GOOGLE_AUTH_CANCELED')
  const match = url.match(/id_token=([^&]+)/)
  const idToken = match ? decodeURIComponent(match[1]) : ''
  if (!idToken) throw new Error('GOOGLE_ID_TOKEN_MISSING')

  const credential = GoogleAuthProvider.credential(idToken)
  const cred = await signInWithCredential(auth, credential)
  await ensureUserProfile(cred.user)
  return cred
}

export const logout = () => signOut(auth)
