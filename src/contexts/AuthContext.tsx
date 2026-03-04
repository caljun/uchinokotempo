import { createContext, useContext, useEffect, useState } from 'react'
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export interface ShopProfile {
  shopId: string
  ownerId: string
  name: string
  email: string
  address: string
  openHoursDisplay: string
  holiday: string
  phone: string
  description: string
  categories: string[]
  accepted: {
    difficulty: string[]
    sizes: string[]
    ages: string[]
  }
  sns: {
    instagram: string
    x: string
    youtube: string
  }
  isPublished: boolean
  photoUrls?: string[]
  openHours?: {
    monday: { open: string; close: string } | null
    tuesday: { open: string; close: string } | null
    wednesday: { open: string; close: string } | null
    thursday: { open: string; close: string } | null
    friday: { open: string; close: string } | null
    saturday: { open: string; close: string } | null
    sunday: { open: string; close: string } | null
  }
  isAcceptingReservations?: boolean
  stripeAccountId?: string
  license?: {
    registrationNumber: string
    name: string
    address: string
    manager: string
    registrationDate: string
    validUntil: string
    category: string[]
    status: 'pending' | 'approved' | 'rejected'
    reason?: string
  }
  products?: {
    productId: string
    name: string
    description: string
    price: number
    stock: number
    isActive: boolean
    soldOut: boolean
    photos: string[]
    productCategory: string
    targetSizes: string[]
    targetAges: string[]
  }[]
  services?: {
    serviceId: string
    serviceName: string
    name: string
    description: string
    serviceType: 'inStore' | 'visit'
    price: number
    duration: number | null
    isPublic: boolean
  }[]
}

type NewShopData = Omit<ShopProfile, 'shopId' | 'ownerId' | 'isPublished'>

interface AuthContextType {
  user: User | null
  shop: ShopProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, shopData: NewShopData) => Promise<void>
  signOut: () => Promise<void>
  reloadShop: () => Promise<void>
  togglePublish: () => Promise<void>
  updateShop: (data: Partial<Omit<ShopProfile, 'shopId' | 'ownerId'>>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [shop, setShop] = useState<ShopProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchShop = async (uid: string) => {
    const q = query(collection(db, 'shops'), where('ownerId', '==', uid))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const docSnap = snap.docs[0]
      setShop({ shopId: docSnap.id, ...docSnap.data() } as ShopProfile)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        await fetchShop(u.uid)
      } else {
        setShop(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, shopData: NewShopData) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const uid = cred.user.uid
    const profile = { ...shopData, ownerId: uid, isPublished: false }
    const docRef = await addDoc(collection(db, 'shops'), profile)
    setShop({ shopId: docRef.id, ...profile })
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setShop(null)
  }

  const reloadShop = async () => {
    if (user) await fetchShop(user.uid)
  }

  const togglePublish = async () => {
    if (!user || !shop) return
    const next = !shop.isPublished
    await updateDoc(doc(db, 'shops', shop.shopId), { isPublished: next })
    setShop(prev => prev ? { ...prev, isPublished: next } : prev)
  }

  const updateShop = async (data: Partial<Omit<ShopProfile, 'shopId' | 'ownerId'>>) => {
    if (!user || !shop) return
    await updateDoc(doc(db, 'shops', shop.shopId), data)
    await fetchShop(user.uid)
  }

  return (
    <AuthContext.Provider value={{ user, shop, loading, signIn, signUp, signOut, reloadShop, togglePublish, updateShop }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
