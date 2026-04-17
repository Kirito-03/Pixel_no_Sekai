import { auth, db } from './firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, GoogleAuthProvider, signInWithPopup, signInWithCredential, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth'
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
  const expoClientId = (process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID) as string
  if (!expoClientId) throw new Error('GOOGLE_CLIENT_ID_MISSING')
  const proxyRedirect = (AuthSession.makeRedirectUri as any)({ useProxy: true })
  console.log('Google OAuth redirect URI', proxyRedirect)
  const buildAuthUrl = (redirect: string) =>
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(expoClientId)}&response_type=id_token&scope=${encodeURIComponent('openid email profile')}&redirect_uri=${encodeURIComponent(redirect)}&prompt=consent&nonce=${Date.now()}`

  const result: any = await WebBrowser.openAuthSessionAsync(buildAuthUrl(proxyRedirect), proxyRedirect)
  const url: string = (result && result.url) ? result.url : ''
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

export const requestPasswordReset = async (email: string) => {
  await sendPasswordResetEmail(auth, email)
  return { ok: true }
}

export const requestEmailVerification = async () => {
  if (!auth.currentUser) throw new Error('No user logged in')
  await sendEmailVerification(auth.currentUser)
  return { ok: true }
}

export const getUserDetails = async () => {
  if (!auth.currentUser) throw new Error('No user logged in');
  const token = await auth.currentUser.getIdToken();
  const response = await fetch('/api/user/details', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user details');
  }
  return response.json();
};
