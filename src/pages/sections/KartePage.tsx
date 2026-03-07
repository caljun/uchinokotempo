import { useState, useEffect, useCallback } from 'react'
import { Search, X, Plus, Dog, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  collection, query, where, getDocs,
  doc, setDoc, updateDoc, deleteField, serverTimestamp,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db, app } from '../../lib/firebase'
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
  originalDogId?: string
  isManual: boolean
}

interface FullDogData {
  name?: string
  breed?: string
  photoUrl?: string
  gender?: string
  neutered?: boolean
  weight?: number
  temperamentType?: string
  difficultyRank?: string
  difficultyDescription?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
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

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 gap-3">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">{value}</span>
    </div>
  )
}

// ─── DogInfoTab ───────────────────────────────────────────────────────────────

function DogInfoTab({
  dog,
  fullDog,
  loading,
}: {
  dog: VisitingDogDisplay
  fullDog: FullDogData | null
  loading: boolean
}) {
  const data = fullDog ?? {}
  const name = data.name ?? dog.displayName
  const breed = data.breed ?? dog.displayBreed
  const photo = data.photoUrl ?? dog.displayPhoto

  const genderLabel = (g?: string, n?: boolean): string | null => {
    if (!g) return null
    const base = g === 'male' ? 'オス' : 'メス'
    return n == null ? base : `${base}（${n ? '去勢/避妊済み' : '未去勢/未避妊'}）`
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">読み込み中...</div>
  }

  const gl = genderLabel(data.gender, data.neutered)

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-4">
        {photo
          ? <img src={photo} alt={name} className="w-20 h-20 rounded-full object-cover shrink-0" />
          : <div className="w-20 h-20 rounded-full bg-orange-50 shrink-0 flex items-center justify-center text-3xl">🐕</div>
        }
        <div>
          <p className="text-lg font-bold text-gray-900">{name}</p>
          {breed && <p className="text-xs text-gray-400">{breed}</p>}
          <div className="flex gap-3 mt-1.5">
            <span className="text-xs text-gray-500">来店 <span className="font-bold text-gray-800">{dog.visitCount}</span>回</span>
            {dog.lastVisitDate && (
              <span className="text-xs text-gray-400">最終: {formatDateLabel(dog.lastVisitDate)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
        {gl && <Row label="性別" value={gl} />}
        {data.weight != null && <Row label="体重" value={`${data.weight}kg`} />}
        {dog.ownerName && <Row label="飼い主" value={dog.ownerName} />}
        {dog.ownerPhone && <Row label="電話" value={dog.ownerPhone} />}
      </div>

      {(data.temperamentType || data.difficultyRank) && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">診断</p>
          <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
            {data.temperamentType && <Row label="性格タイプ" value={data.temperamentType} />}
            {data.difficultyRank && (
              <Row label="難易度" value={
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  data.difficultyRank === 'A' ? 'bg-green-50 text-green-600' :
                  data.difficultyRank === 'B' ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-500'
                }`}>{data.difficultyRank}</span>
              } />
            )}
            {data.difficultyDescription && (
              <div className="px-3 py-2.5">
                <p className="text-xs text-gray-400 mb-1">診断結果</p>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{data.difficultyDescription}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {dog.isManual && (
        <p className="text-xs text-gray-300 text-center">手動追加された来店犬です</p>
      )}
    </div>
  )
}

// ─── CalendarMemoTab ──────────────────────────────────────────────────────────

function CalendarMemoTab({
  dog,
  onSaveMemo,
}: {
  dog: VisitingDogDisplay
  onSaveMemo: (dogId: string, dateStr: string, text: string) => Promise<void>
}) {
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [editDate, setEditDate] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

  const firstDow = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const openEdit = (dateStr: string) => {
    setEditDate(dateStr)
    setEditText(dog.memos[dateStr]?.text ?? '')
  }

  const handleSave = async () => {
    if (!editDate) return
    setSaving(true)
    try {
      await onSaveMemo(dog.id, editDate, editText)
      setEditDate(null)
    } finally {
      setSaving(false)
    }
  }

  const sortedMemos = Object.entries(dog.memos).sort(([a], [b]) => b.localeCompare(a))

  return (
    <div className="p-4 space-y-4">

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-gray-900">{calYear}年{calMonth + 1}月</span>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={`text-center text-xs font-medium py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`e${i}`} className="min-h-[52px] border-b border-r border-gray-50" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dow = (firstDow + i) % 7
            const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`
            const hasMemo = !!dog.memos[dateStr]
            const isToday = dateStr === todayStr
            const isLastCol = (firstDow + i + 1) % 7 === 0
            return (
              <button
                key={dateStr}
                onClick={() => openEdit(dateStr)}
                className={`relative min-h-[52px] border-b border-r border-gray-50 p-1.5 flex flex-col items-center transition-colors hover:bg-orange-50/40
                  ${isLastCol ? 'border-r-0' : ''}
                  ${hasMemo ? 'bg-orange-50/60' : ''}`}
              >
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-0.5
                  ${isToday ? 'bg-[#FF8F0D] text-white' : dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-800'}`}>
                  {day}
                </span>
                {hasMemo && <span className="w-1.5 h-1.5 rounded-full bg-[#FF8F0D]" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Memo list */}
      {sortedMemos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">メモ一覧</p>
          {sortedMemos.map(([dateStr, memo]) => (
            <button
              key={dateStr}
              onClick={() => openEdit(dateStr)}
              className="w-full text-left bg-gray-50 rounded-xl p-3 hover:bg-orange-50/40 transition-colors"
            >
              <p className="text-xs text-gray-400 mb-1">{formatDateLabel(dateStr)}</p>
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{memo.text}</p>
            </button>
          ))}
        </div>
      )}

      {/* Memo edit overlay */}
      {editDate && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditDate(null)} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">{formatDateLabel(editDate)}</p>
              <button onClick={() => setEditDate(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="施術内容・気になったことなど"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditDate(null)}
                className="flex-1 py-2.5 rounded-full text-sm border border-gray-200 text-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-full text-sm font-bold bg-[#FF8F0D] text-white disabled:opacity-50"
              >
                {saving ? '保存中...' : editText.trim() ? '保存' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DogDetailModal ───────────────────────────────────────────────────────────

function DogDetailModal({
  dog,
  shopId,
  onClose,
  onSaveMemo,
}: {
  dog: VisitingDogDisplay
  shopId: string
  onClose: () => void
  onSaveMemo: (dogId: string, dateStr: string, text: string) => Promise<void>
}) {
  const [tab, setTab] = useState<'memo' | 'info'>('memo')
  const [fullDog, setFullDog] = useState<FullDogData | null>(null)
  const [loadingDog, setLoadingDog] = useState(false)

  useEffect(() => {
    if (dog.isManual || !dog.ownerId) return
    setLoadingDog(true)
    const fn = httpsCallable(getFunctions(app, 'us-central1'), 'getDogForShop')
    fn({ shopId, dogId: dog.id, type: 'visitingDogs' })
      .then(res => {
        const data = res.data as { dogData: FullDogData }
        setFullDog(data.dogData)
      })
      .catch(err => console.warn('getDogForShop:', err))
      .finally(() => setLoadingDog(false))
  }, [dog.id, dog.isManual, dog.ownerId, shopId])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900">{dog.displayName}のカルテ</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex border-b border-gray-100 shrink-0">
          {(['memo', 'info'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t ? 'text-[#FF8F0D] border-b-2 border-[#FF8F0D]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'memo' ? 'メモ' : 'ウチの子情報'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === 'memo'
            ? <CalendarMemoTab dog={dog} onSaveMemo={onSaveMemo} />
            : <DogInfoTab dog={dog} fullDog={fullDog} loading={loadingDog} />
          }
        </div>
      </div>
    </div>
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
  const [dogs, setDogs] = useState<VisitingDogDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDog, setSelectedDog] = useState<VisitingDogDisplay | null>(null)
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
          originalDogId: (meta.originalDogId as string | undefined) ?? dogId,
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

  // Save or delete a memo
  const saveMemo = async (dogId: string, dateStr: string, text: string) => {
    if (!shop) return
    const docRef = doc(db, 'shops', shop.shopId, 'visitingDogs', dogId)
    if (text.trim()) {
      await updateDoc(docRef, {
        [`memos.${dateStr}`]: { text: text.trim() },
        updatedAt: serverTimestamp(),
      })
    } else {
      await updateDoc(docRef, {
        [`memos.${dateStr}`]: deleteField(),
        updatedAt: serverTimestamp(),
      })
    }
    const applyMemo = (d: VisitingDogDisplay): VisitingDogDisplay => {
      if (d.id !== dogId) return d
      const memos = { ...d.memos }
      if (text.trim()) memos[dateStr] = { text: text.trim() }
      else delete memos[dateStr]
      return { ...d, memos }
    }
    setDogs(prev => prev.map(applyMemo))
    setSelectedDog(prev => prev?.id === dogId ? applyMemo(prev) : prev)
  }

  // Add manual dog
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
              <DogCard key={dog.id} dog={dog} onClick={() => setSelectedDog(dog)} />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {selectedDog && shop && (
        <DogDetailModal
          dog={selectedDog}
          shopId={shop.shopId}
          onClose={() => setSelectedDog(null)}
          onSaveMemo={saveMemo}
        />
      )}

      {addOpen && (
        <ManualAddModal
          onClose={() => setAddOpen(false)}
          onAdd={handleManualAdd}
        />
      )}
    </div>
  )
}
