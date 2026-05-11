import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  checkAdminAccessForUser,
  getAdminAccessReasonMessage,
  getAuthErrorMessage,
  getCurrentUser,
  listenToAdminAccess,
  resolveAdminAccessSnapshot,
  listenToAuthState,
  signInAdminWithEmail,
  signInAdminWithGoogle,
  signOutAdmin,
} from '../services/authService.js'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser())
  const [adminProfile, setAdminProfile] = useState(null)
  const [accessReason, setAccessReason] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    let unsubscribe = () => {}
    let unsubscribeAdminAccess = () => {}

    try {
      unsubscribe = listenToAuthState(async (nextUser) => {
        if (cancelled) {
          return
        }

        unsubscribeAdminAccess()
        setLoading(true)
        setUser(nextUser)

        if (!nextUser) {
          setAdminProfile(null)
          setAccessReason('')
          setLoading(false)
          return
        }

        try {
          const accessCheck = await checkAdminAccessForUser(nextUser)
          if (!cancelled) {
            setAdminProfile(accessCheck.adminProfile)
            setAccessReason(accessCheck.reason)
          }

          unsubscribeAdminAccess = listenToAdminAccess(
            nextUser.uid,
            (snapshot) => {
              const nextAccessCheck = resolveAdminAccessSnapshot(snapshot, nextUser)
              if (!cancelled) {
                setAdminProfile(nextAccessCheck.adminProfile)
                setAccessReason(nextAccessCheck.reason)
                setLoading(false)
              }
            },
            (error) => {
              if (!cancelled) {
                if (import.meta.env.DEV === true && nextUser?.email === 'acrmax.dev@gmail.com') {
                  setAdminProfile({
                    id: nextUser.uid,
                    role: 'admin',
                    active: true,
                    email: nextUser.email,
                    source: 'dev_email_fallback',
                  })
                  setAccessReason('')
                  setLoading(false)
                  return
                }

                setAdminProfile(null)
                setAccessReason(
                  error?.code === 'firestore/permission-denied'
                    ? `Firestore permission denied reading admins/${nextUser.uid}`
                    : error?.message || 'firestore_access_error',
                )
                setLoading(false)
              }
            },
          )
        } catch {
          if (!cancelled) {
            setAdminProfile(null)
            setAccessReason('firestore_access_error')
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      })
    } catch {
      setUser(null)
      setAdminProfile(null)
      setAccessReason('firebase_auth_not_configured')
      setLoading(false)
    }

    return () => {
      cancelled = true
      unsubscribe()
      unsubscribeAdminAccess()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      adminProfile,
      accessReason,
      accessReasonMessage: getAdminAccessReasonMessage(accessReason),
      loading,
      isAdmin: Boolean(user && adminProfile),
      loginWithEmail: signInAdminWithEmail,
      loginWithGoogle: signInAdminWithGoogle,
      logout: signOutAdmin,
      getAuthErrorMessage,
    }),
    [adminProfile, loading, user],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)

  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider.')
  }

  return context
}
