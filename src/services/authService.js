import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

const googleProvider = new GoogleAuthProvider()
const DEV_FALLBACK_EMAIL = 'acrmax.dev@gmail.com'

function requireAuth() {
  if (!auth) {
    throw new Error('Firebase Auth is not configured. Check the Vite Firebase env variables.')
  }

  return auth
}

function requireDb() {
  if (!db) {
    throw new Error('Firestore is not configured. Check the Vite Firebase env variables.')
  }

  return db
}

async function persistSession() {
  await setPersistence(requireAuth(), browserLocalPersistence)
}

function isDevFallbackUser(user) {
  return import.meta.env.DEV === true && user?.email === DEV_FALLBACK_EMAIL
}

function getAdminDocRef(uid) {
  return doc(requireDb(), 'admins', uid)
}

function getAdminDocPath(uid) {
  return `admins/${uid}`
}

function getProjectId() {
  return db?.app?.options?.projectId || auth?.app?.options?.projectId || 'unknown-project'
}

function logAdminAccessDiagnostic(event, payload) {
  if (import.meta.env.DEV !== true) {
    return
  }

  console.log(`[AquaGate admin auth] ${event}`, payload)
}

export async function signInAdminWithEmail(email, password) {
  await persistSession()
  return signInWithEmailAndPassword(requireAuth(), email, password)
}

export async function signInAdminWithGoogle() {
  await persistSession()
  return signInWithPopup(requireAuth(), googleProvider)
}

export async function signOutAdmin() {
  return signOut(requireAuth())
}

export function listenToAuthState(callback) {
  return onAuthStateChanged(requireAuth(), callback)
}

export function getCurrentUser() {
  return requireAuth().currentUser
}

function evaluateAdminProfile(snapshot, uid, user) {
  if (!snapshot.exists()) {
    if (isDevFallbackUser(user)) {
      return {
        allowed: true,
        adminProfile: {
          id: uid,
          role: 'admin',
          active: true,
          email: user.email,
          source: 'dev_email_fallback',
        },
        reason: '',
      }
    }

    return {
      allowed: false,
      adminProfile: null,
      reason: `Admin doc not found at ${getAdminDocPath(uid)}`,
    }
  }

  const adminProfile = {
    id: snapshot.id,
    ...snapshot.data(),
    source: 'firestore_admin_doc',
  }

  if (adminProfile.role !== 'admin') {
    return {
      allowed: false,
      adminProfile,
      reason: 'role_mismatch',
    }
  }

  if (adminProfile.active !== true) {
    return {
      allowed: false,
      adminProfile,
      reason: 'inactive_admin',
    }
  }

  return {
    allowed: true,
    adminProfile,
    reason: '',
  }
}

export async function checkAdminAccess(uid) {
  if (!uid) {
    return {
      allowed: false,
      adminProfile: null,
      reason: 'missing_uid',
    }
  }

  return checkAdminAccessForUser({ uid })
}

export async function checkAdminAccessForUser(user) {
  const uid = user?.uid

  if (!uid) {
    return {
      allowed: false,
      adminProfile: null,
      reason: 'Firebase user UID is missing.',
    }
  }

  const adminDocPath = getAdminDocPath(uid)
  logAdminAccessDiagnostic('check:start', {
    uid,
    email: user?.email || '',
    path: adminDocPath,
    projectId: getProjectId(),
  })

  try {
    const snapshot = await getDoc(getAdminDocRef(uid))
    logAdminAccessDiagnostic('check:success', {
      uid,
      email: user?.email || '',
      path: adminDocPath,
      projectId: getProjectId(),
      exists: snapshot.exists(),
      data: snapshot.exists() ? snapshot.data() : null,
    })
    return evaluateAdminProfile(snapshot, uid, user)
  } catch (error) {
    logAdminAccessDiagnostic('check:error', {
      uid,
      email: user?.email || '',
      path: adminDocPath,
      projectId: getProjectId(),
      code: error?.code || '',
      message: error?.message || '',
    })

    if (isDevFallbackUser(user)) {
      return {
        allowed: true,
        adminProfile: {
          id: uid,
          role: 'admin',
          active: true,
          email: user.email,
          source: 'dev_email_fallback',
        },
        reason: '',
      }
    }

    return {
      allowed: false,
      adminProfile: null,
      reason:
        error?.code === 'firestore/permission-denied'
          ? `Firestore permission denied reading ${adminDocPath}`
          : error?.message || `Unable to read ${adminDocPath}`,
    }
  }
}

export function listenToAdminAccess(uid, callback, onError) {
  if (!uid) {
    callback({
      allowed: false,
      adminProfile: null,
      reason: 'missing_uid',
    })
    return () => {}
  }

  const adminDocPath = getAdminDocPath(uid)

  return onSnapshot(
    getAdminDocRef(uid),
    (snapshot) => {
      logAdminAccessDiagnostic('listen:update', {
        uid,
        path: adminDocPath,
        projectId: getProjectId(),
        exists: snapshot.exists(),
        data: snapshot.exists() ? snapshot.data() : null,
      })
      callback(snapshot)
    },
    (error) => {
      logAdminAccessDiagnostic('listen:error', {
        uid,
        path: adminDocPath,
        projectId: getProjectId(),
        code: error?.code || '',
        message: error?.message || '',
      })
      onError?.(error)
    },
  )
}

export function getAdminAccessReasonMessage(reason) {
  if (
    typeof reason === 'string' &&
    (reason.startsWith('Admin doc not found at ') ||
      reason.startsWith('Firestore permission denied reading ') ||
      reason.startsWith('Unable to read ') ||
      reason === 'Firebase user UID is missing.')
  ) {
    return reason
  }

  switch (reason) {
    case 'admin_doc_not_found':
      return 'Admin document not found in Firestore.'
    case 'role_mismatch':
      return 'Admin document exists, but role is not set to "admin".'
    case 'inactive_admin':
      return 'Admin document exists, but active is not true.'
    case 'missing_uid':
      return 'Firebase user UID is missing.'
    case 'firestore/permission-denied':
    case 'permission_denied':
    case 'firestore_access_error':
      return 'Firestore denied access to the admins collection.'
    case 'firebase_auth_not_configured':
      return 'Firebase Auth is not configured in this environment.'
    default:
      return reason ? `Admin access check failed: ${reason}` : ''
  }
}

export function resolveAdminAccessSnapshot(snapshot, user) {
  return evaluateAdminProfile(snapshot, user?.uid, user)
}

export function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'The email or password is incorrect.'
    case 'auth/user-not-found':
      return 'No account was found for that email address.'
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in window was closed before completing sign-in.'
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was interrupted. Please try again.'
    case 'auth/popup-blocked':
      return 'The browser blocked the Google sign-in popup. Please allow popups and try again.'
    case 'auth/network-request-failed':
      return 'Firebase could not be reached. Check your connection and try again.'
    default:
      return error?.message || 'Unable to sign in right now.'
  }
}
