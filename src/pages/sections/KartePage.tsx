import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Plus, Dog, ChevronRight } from 'lucide-react'
import {
  collection, query, where, getDocs,
  doc, setDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DogMemo {
  text: string
}

interface VisitingDogDisplay {
  id: string
  displayName: string
  displayBreed?: string
  displayPhoto?: string
  ownerName?: string
  ownerPhone?: string
  visitCount: number
  lastVisitDate: string | null
  memos: Record<string, DogMemo>
  ownerId?: string
  isManual: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

function toDateStr(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'string') return val.substring(0, 10)
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    const d = (val as { toDate: () => Date }).toDate()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return null
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

// ─── DogCard ──────────────────────────────────────────────────────────────────

function DogCard({ dog, onClick }: { dog: VisitingDogDisplay; onClick: () => void }) {
  const memoCount = Object.keys(dog.memos).length
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
    >
      {dog.displayPhoto
        ? <img src={dog.displayPhoto} alt={dog.displayName} className="w-14 h-14 rounded-full object-cover shrink-0" />
        : <div className="w-14 h-14 rounded-full bg-orange-50 shrink-0 flex items-center justify-center text-2xl">🐕</div>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-bold text-gray-900">{dog.displayName}</p>
          {dog.displayBreed && <p className="text-xs text-gray-400">{dog.displayBreed}</p>}
        </div>
        {dog.ownerName && <p className="text-xs text-gray-400 mt-0.5">{dog.ownerName}</p>}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-xs text-gray-500">来店 <span className="font-bold text-gray-800">{dog.visitCount}</span>回</span>
          {dog.lastVisitDate && (
            <span className="text-xs text-gray-400">最終: {formatDateLabel(dog.lastVisitDate)}</span>
          )}
          {memoCount > 0 && (
            <span className="text-xs text-[#FF8F0D] font-medium">メモ {memoCount}件</span>
          )}
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </button>
  )
}

// ─── ManualAddModal ───────────────────────────────────────────────────────────

function ManualAddModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (form: { name: string; breed: string; ownerName: string; ownerPhone: string }) => Promise<void>
}) {
  const [form, setForm] = useState({ name: '', breed: '', ownerName: '', ownerPhone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!form.name.trim()) { setError('犬の名前を入力してください'); return }
    setSaving(true)
    try {
      await onAdd(form)
    } catch {
      setError('追加に失敗しました')
      setSaving(false)
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900">来店犬を追加</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">犬の名前 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="例：ポチ" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">犬種</label>
            <input type="text" value={form.breed} onChange={e => setForm(p => ({ ...p, breed: e.target.value }))} className={inputClass} placeholder="例：トイプードル" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">飼い主名</label>
            <input type="text" value={form.ownerName} onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))} className={inputClass} placeholder="例：田中 太郎" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
            <input type="tel" value={form.ownerPhone} onChange={e => setForm(p => ({ ...p, ownerPhone: e.target.value }))} className={inputClass} placeholder="例：090-1234-5678" />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full text-sm border border-gray-200 text-gray-600">
            キャンセル
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-full text-sm font-bold bg-[#FF8F0D] text-white disabled:opacity-50">
            {saving ? '追加中...' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KartePage() {
  const { shop } = useAuth()
  const navigate = useNavigate()
  const [dogs, setDogs] = useState<VisitingDogDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [error, setError] = useState('')

  const loadDogs = useCallback(async () => {
    if (!shop) return
    setLoading(true)
    setError('')
    try {
      // 1. Fetch all reservations for this shop
      const resSnap = await getDocs(
        query(collection(db, 'reservations'), where('storeId', '==', shop.shopId))
      )
      const allRes = resSnap.docs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>))

      // 2. Filter: payment succeeded OR status completed, AND inStore
      const paidRes = allRes.filter(r => {
        const paid =
          (r.paymentInfo as { status?: string } | null)?.status === 'succeeded' ||
          r.status === 'completed'
        const inStore = ((r.serviceType as string | undefined) ?? 'inStore') !== 'visit'
        return paid && inStore
      })

      // 3. Compute visit stats per dogId
      const statsMap = new Map<string, {
        visitCount: number
        lastVisitDate: string | null
        reservation: Record<string, unknown>
      }>()
      for (const r of paidRes) {
        const dogId = r.dogId as string | undefined
        if (!dogId) continue
        const dateStr = toDateStr(r.selectedDate) ?? toDateStr(r.createdAt)
        const existing = statsMap.get(dogId)
        if (existing) {
          existing.visitCount++
          if (dateStr && (!existing.lastVisitDate || dateStr > existing.lastVisitDate)) {
            existing.lastVisitDate = dateStr
          }
        } else {
          statsMap.set(dogId, { visitCount: 1, lastVisitDate: dateStr, reservation: r })
        }
      }

      // 4. Fetch visitingDogs collection
      const vdSnap = await getDocs(collection(db, 'shops', shop.shopId, 'visitingDogs'))
      const vdMap = new Map<string, Record<string, unknown>>()
      vdSnap.docs.forEach(d => vdMap.set(d.id, d.data()))

      // 5. Auto-create visitingDogs docs for paid reservations that don't have one yet
      const creates: Promise<void>[] = []
      for (const [dogId, stats] of statsMap.entries()) {
        if (vdMap.has(dogId)) continue
        const r = stats.reservation
        const ownerId = (r.userId ?? r.ownerId) as string | undefined
        if (!ownerId) continue
        const ownerInfo = r.ownerInfo as { name?: string; phone?: string } | undefined
        const newMeta = {
          ownerId,
          originalDogId: dogId,
          ownerName: ownerInfo?.name ?? null,
          ownerPhone: ownerInfo?.phone ?? null,
          isManual: false,
          memos: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        creates.push(
          setDoc(doc(db, 'shops', shop.shopId, 'visitingDogs', dogId), newMeta)
        )
        vdMap.set(dogId, { ...newMeta, memos: {} })
      }
      await Promise.all(creates)

      // 6. Build display list
      const displayList: VisitingDogDisplay[] = []

      // Dogs from paid reservations
      for (const [dogId, stats] of statsMap.entries()) {
        const meta = vdMap.get(dogId)
        if (!meta) continue
        const r = stats.reservation
        const dogInfo = (r.dogInfo ?? {}) as { name?: string; breed?: string; photoUrl?: string }
        const ownerInfo = (r.ownerInfo ?? {}) as { name?: string; phone?: string }
        displayList.push({
          id: dogId,
          displayName: dogInfo.name ?? (meta.name as string | undefined) ?? '名前未設定',
          displayBreed: dogInfo.breed ?? (meta.breed as string | undefined),
          displayPhoto: dogInfo.photoUrl ?? (meta.photoUrl as string | undefined),
          ownerName: (meta.ownerName as string | undefined) ?? ownerInfo.name,
          ownerPhone: (meta.ownerPhone as string | undefined) ?? ownerInfo.phone,
          visitCount: stats.visitCount,
          lastVisitDate: stats.lastVisitDate,
          memos: (meta.memos as Record<string, DogMemo>) ?? {},
          ownerId: meta.ownerId as string | undefined,
          isManual: false,
        })
      }

      // Manually added dogs
      vdMap.forEach((meta, dogId) => {
        if (!meta.isManual) return
        displayList.push({
          id: dogId,
          displayName: (meta.name as string | undefined) ?? '名前未設定',
          displayBreed: meta.breed as string | undefined,
          displayPhoto: meta.photoUrl as string | undefined,
          ownerName: meta.ownerName as string | undefined,
          ownerPhone: meta.ownerPhone as string | undefined,
          visitCount: 0,
          lastVisitDate: null,
          memos: (meta.memos as Record<string, DogMemo>) ?? {},
          isManual: true,
        })
      })

      // Sort: lastVisitDate desc, then name
      displayList.sort((a, b) => {
        if (a.lastVisitDate && b.lastVisitDate) return b.lastVisitDate.localeCompare(a.lastVisitDate)
        if (a.lastVisitDate) return -1
        if (b.lastVisitDate) return 1
        return a.displayName.localeCompare(b.displayName, 'ja')
      })

      setDogs(displayList)
    } catch (e) {
      console.error(e)
      setError('来店犬の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [shop])

  useEffect(() => { loadDogs() }, [loadDogs])

  const handleManualAdd = async (form: { name: string; breed: string; ownerName: string; ownerPhone: string }) => {
    if (!shop) return
    const docRef = doc(collection(db, 'shops', shop.shopId, 'visitingDogs'))
    await setDoc(docRef, {
      isManual: true,
      name: form.name.trim(),
      breed: form.breed.trim() || null,
      ownerName: form.ownerName.trim() || null,
      ownerPhone: form.ownerPhone.trim() || null,
      memos: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    setAddOpen(false)
    await loadDogs()
  }

  const filtered = dogs.filter(d => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.displayName.toLowerCase().includes(q) ||
      (d.displayBreed ?? '').toLowerCase().includes(q) ||
      (d.ownerName ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="カルテ" />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full pb-8 space-y-3">

        <button
          onClick={() => setAddOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-[#FF8F0D] hover:bg-[#E67D0B] text-white font-bold py-3 rounded-2xl text-sm transition-colors"
        >
          <Plus size={16} />
          来店犬を手動追加
        </button>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="名前・犬種・飼い主で検索"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={14} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-sm text-gray-400">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 rounded-xl p-4 text-xs text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center gap-3 text-center">
            <Dog size={40} strokeWidth={1.2} className="text-gray-300" />
            <p className="text-sm text-gray-400">
              {search ? '該当する来店犬がいません' : '来店犬がまだいません'}
            </p>
            {!search && (
              <p className="text-xs text-gray-300">決済が完了した予約が自動で登録されます</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(dog => (
              <DogCard
                key={dog.id}
                dog={dog}
                onClick={() => navigate(`/home/karte/${dog.id}`, {
                  state: {
                    visitCount: dog.visitCount,
                    lastVisitDate: dog.lastVisitDate,
                    displayName: dog.displayName,
                    displayBreed: dog.displayBreed,
                    displayPhoto: dog.displayPhoto,
                    ownerName: dog.ownerName,
                    ownerPhone: dog.ownerPhone,
                    isManual: dog.isManual,
                    ownerId: dog.ownerId,
                  },
                })}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {addOpen && (
        <ManualAddModal
          onClose={() => setAddOpen(false)}
          onAdd={handleManualAdd}
        />
      )}
    </div>
  )
}
