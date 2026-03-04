import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Settings, X, Store, Car, Send } from 'lucide-react'
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db, app } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import type { ShopProfile } from '../../contexts/AuthContext'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const DEFAULT_CAPACITY = 3

// ダミーデータ確認用フラグ（実データ接続後はfalseに）
const USE_DUMMY = true

type DayKey = typeof DAY_KEYS[number]

interface DogInfo {
  breed?: string
  age?: number
  gender?: 'male' | 'female'
  neutered?: boolean
  weight?: number
  temperamentType?: string
  difficultyRank?: string
}

interface PaymentInfo {
  status?: 'succeeded' | 'pending'
  amount?: number
}

interface Reservation {
  id: string
  status: string
  dogName?: string
  dogPhoto?: string
  selectedDate: { toDate: () => Date } | string | null
  selectedTime?: string
  serviceType?: string
  serviceName?: string
  ownerName?: string
  ownerPhone?: string
  createdAt?: { toDate: () => Date } | string | null
  paymentInfo?: PaymentInfo | null
  address?: string
  dogInfo?: DogInfo
}

// ─── ダミーデータ ───────────────────────────────────────────
const today = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const ds = (offsetDays: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const DUMMY_RESERVATIONS: Reservation[] = [
  {
    id: 'dummy-1',
    status: 'confirmed',
    dogName: 'ポチ',
    dogPhoto: '',
    selectedDate: ds(0),
    selectedTime: '10:00',
    serviceType: 'inStore',
    serviceName: 'トリミングコース（シャンプー込み）',
    ownerName: '田中 太郎',
    ownerPhone: '090-1234-5678',
    createdAt: ds(-3),
    paymentInfo: { status: 'succeeded', amount: 8000 },
    dogInfo: { breed: 'トイプードル', age: 3, gender: 'male', neutered: true, weight: 3.2, temperamentType: 'リーダー', difficultyRank: 'A' },
  },
  {
    id: 'dummy-2',
    status: 'pending',
    dogName: 'さくら',
    dogPhoto: '',
    selectedDate: ds(0),
    selectedTime: '14:00',
    serviceType: 'visit',
    serviceName: '出張トレーニング',
    ownerName: '山田 花子',
    ownerPhone: '080-9876-5432',
    createdAt: ds(-1),
    paymentInfo: null,
    address: '東京都渋谷区〇〇町1-2-3',
    dogInfo: { breed: '柴犬', age: 2, gender: 'female', neutered: false, weight: 8.5, temperamentType: '市民', difficultyRank: 'B' },
  },
  {
    id: 'dummy-3',
    status: 'confirmed',
    dogName: 'まる',
    dogPhoto: '',
    selectedDate: ds(3),
    selectedTime: '11:00',
    serviceType: 'inStore',
    serviceName: 'シャンプーコース',
    ownerName: '鈴木 次郎',
    ownerPhone: '070-5555-4444',
    createdAt: ds(-2),
    paymentInfo: { status: 'pending', amount: 5000 },
    dogInfo: { breed: 'チワワ', age: 5, gender: 'male', neutered: true, weight: 2.1, temperamentType: '守られ', difficultyRank: 'C' },
  },
  {
    id: 'dummy-4',
    status: 'confirmed',
    dogName: 'ハナ',
    dogPhoto: '',
    selectedDate: ds(3),
    selectedTime: '15:00',
    serviceType: 'inStore',
    serviceName: 'トリミングコース（シャンプー込み）',
    ownerName: '佐藤 美咲',
    ownerPhone: '090-1111-2222',
    createdAt: ds(-5),
    paymentInfo: { status: 'succeeded', amount: 8000 },
    dogInfo: { breed: 'ポメラニアン', age: 4, gender: 'female', neutered: true, weight: 2.8, temperamentType: '右腕', difficultyRank: 'A' },
  },
  {
    id: 'dummy-5',
    status: 'completed',
    dogName: 'コタロウ',
    dogPhoto: '',
    selectedDate: ds(-2),
    selectedTime: '13:00',
    serviceType: 'inStore',
    serviceName: 'カットコース',
    ownerName: '伊藤 健一',
    ownerPhone: '080-3333-4444',
    createdAt: ds(-10),
    paymentInfo: { status: 'succeeded', amount: 6000 },
    dogInfo: { breed: 'ミニチュアシュナウザー', age: 7, gender: 'male', neutered: true, weight: 7.0, temperamentType: 'リーダー', difficultyRank: 'B' },
  },
]
// ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label: '申請中', cls: 'bg-amber-50 text-amber-600' },
  confirmed: { label: '確定',   cls: 'bg-blue-50 text-blue-600' },
  completed: { label: '完了',   cls: 'bg-green-50 text-green-600' },
  cancelled: { label: 'キャンセル', cls: 'bg-red-50 text-red-500' },
}

function toDateStr(val: Reservation['selectedDate']): string | null {
  if (!val) return null
  if (typeof val === 'string') return val.substring(0, 10)
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    const d = (val as { toDate: () => Date }).toDate()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return null
}

function toDisplayDate(val: Reservation['createdAt']): string {
  if (!val) return '-'
  const d = typeof (val as { toDate?: () => Date }).toDate === 'function'
    ? (val as { toDate: () => Date }).toDate()
    : new Date(val as string)
  return isNaN(d.getTime()) ? '-' : new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
}

function isClosedDay(dow: number, openHours: ShopProfile['openHours']): boolean {
  if (!openHours) return false
  return openHours[DAY_KEYS[dow] as DayKey] === null
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
}

// ─── 予約詳細モーダル ────────────────────────────────────────
function ReservationDetailModal({ r, onClose }: { r: Reservation; onClose: () => void }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSendInvoice = async () => {
    if (!confirm('請求書を送信しますか？\nお客様のアプリに支払いが表示されます。')) return
    setSending(true)
    try {
      const fn = httpsCallable(getFunctions(app, 'us-central1'), 'createReservationPayment')
      await fn({ reservationId: r.id })
      setSent(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '不明なエラー'
      alert('送信に失敗しました: ' + msg)
    } finally {
      setSending(false)
    }
  }

  const dog = r.dogInfo
  const payment = r.paymentInfo

  const dateLabel = (() => {
    const ds = toDateStr(r.selectedDate)
    if (!ds) return '-'
    const d = new Date(ds)
    const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
    return `${d.getMonth() + 1}月${d.getDate()}日（${dow}）${r.selectedTime ? ' ' + r.selectedTime : ''}`
  })()

  const genderLabel = dog?.gender === 'male' ? 'オス' : dog?.gender === 'female' ? 'メス' : '-'
  const neuteredLabel = dog?.neutered != null ? (dog.neutered ? '去勢/避妊済み' : '未去勢/未避妊') : ''

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900">予約詳細</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* 犬・ステータス */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
            {r.dogPhoto
              ? <img src={r.dogPhoto} alt={r.dogName} className="w-16 h-16 rounded-full object-cover shrink-0" />
              : <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 shrink-0 flex items-center justify-center text-2xl">🐕</div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-gray-900">{r.dogName || '未設定'}</p>
              {dog?.breed && <p className="text-xs text-gray-400">{dog.breed}</p>}
            </div>
            <StatusBadge status={r.status} />
          </div>

          <div className="p-5 space-y-4">

            {/* 予約情報 */}
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">予約情報</p>
              <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                <Row label="日時" value={dateLabel} />
                <Row label="サービス" value={r.serviceName || '-'} />
                <Row label="種別" value={
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
                    ${r.serviceType === 'visit' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                    {r.serviceType === 'visit' ? <><Car size={10} />出張型</> : <><Store size={10} />来店型</>}
                  </span>
                } />
                <Row label="申込日" value={toDisplayDate(r.createdAt)} />
                {r.serviceType === 'visit' && r.address && (
                  <Row label="訪問先" value={r.address} />
                )}
              </div>
            </section>

            {/* 飼い主 */}
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">飼い主</p>
              <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                <Row label="氏名" value={r.ownerName || '-'} />
                <Row label="電話" value={r.ownerPhone || '-'} />
              </div>
            </section>

            {/* 支払い */}
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">支払い</p>
              <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                <Row label="状況" value={
                  sent
                    ? <span className="text-xs font-bold text-amber-600">支払い待ち</span>
                    : payment?.status === 'succeeded'
                    ? <span className="text-xs font-bold text-green-600">支払い完了</span>
                    : payment?.status === 'pending'
                    ? <span className="text-xs font-bold text-amber-600">支払い待ち</span>
                    : <span className="text-xs text-gray-400">未請求</span>
                } />
                {payment?.amount != null && (
                  <Row label="金額" value={`¥${payment.amount.toLocaleString()}`} />
                )}
              </div>
              {!payment && !sent && (
                <button
                  onClick={handleSendInvoice}
                  disabled={sending}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-[#FF8F0D] hover:bg-[#E67D0B] disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                >
                  <Send size={14} />
                  {sending ? '送信中...' : '請求書を送る'}
                </button>
              )}
              {sent && (
                <p className="mt-2 text-xs text-green-600 text-center">送信しました。お客様のアプリに支払いが届きます。</p>
              )}
            </section>

            {/* 犬の情報 */}
            {dog && (
              <section>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">ウチの子情報</p>
                <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                  {dog.age != null && <Row label="年齢" value={`${dog.age}歳`} />}
                  <Row label="性別" value={`${genderLabel}${neuteredLabel ? '　' + neuteredLabel : ''}`} />
                  {dog.weight != null && <Row label="体重" value={`${dog.weight}kg`} />}
                  {dog.temperamentType && <Row label="性格タイプ" value={dog.temperamentType} />}
                  {dog.difficultyRank && (
                    <Row label="難易度" value={
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                        ${dog.difficultyRank === 'A' ? 'bg-green-50 text-green-600' :
                          dog.difficultyRank === 'B' ? 'bg-amber-50 text-amber-600' :
                          'bg-red-50 text-red-500'}`}>
                        {dog.difficultyRank}
                      </span>
                    } />
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 gap-3">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">{value}</span>
    </div>
  )
}
// ────────────────────────────────────────────────────────────

export default function ReservationCalendarPage() {
  const { shop } = useAuth()
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const [currentMonth, setCurrentMonth] = useState(
    new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  )
  const [reservations, setReservations] = useState<Reservation[]>(USE_DUMMY ? DUMMY_RESERVATIONS : [])
  const [monthCapacity, setMonthCapacity] = useState(DEFAULT_CAPACITY)
  const [loading, setLoading] = useState(!USE_DUMMY)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [detailReservation, setDetailReservation] = useState<Reservation | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newCapacity, setNewCapacity] = useState(DEFAULT_CAPACITY)
  const [savingCapacity, setSavingCapacity] = useState(false)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const monthStr = `${year}-${pad(month + 1)}`

  const loadMonthData = useCallback(async () => {
    if (!shop || USE_DUMMY) return
    setLoading(true)
    try {
      const capSnap = await getDoc(doc(db, 'shops', shop.shopId, 'monthlyCapacities', monthStr))
      const cap = capSnap.exists() ? (capSnap.data().capacity ?? DEFAULT_CAPACITY) : DEFAULT_CAPACITY
      setMonthCapacity(cap)
      setNewCapacity(cap)

      const snap = await getDocs(
        query(collection(db, 'reservations'), where('storeId', '==', shop.shopId))
      )
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Reservation))
        .filter(r => r.status !== 'cancelled' && toDateStr(r.selectedDate)?.startsWith(monthStr))
      setReservations(all)
    } catch (e) {
      console.error('予約の読み込みエラー:', e)
    } finally {
      setLoading(false)
    }
  }, [shop, monthStr])

  useEffect(() => { loadMonthData() }, [loadMonthData])

  const saveCapacity = async () => {
    if (!shop) return
    setSavingCapacity(true)
    try {
      await setDoc(
        doc(db, 'shops', shop.shopId, 'monthlyCapacities', monthStr),
        { capacity: newCapacity, updatedAt: serverTimestamp() },
        { merge: true }
      )
      setMonthCapacity(newCapacity)
      setSettingsOpen(false)
    } finally {
      setSavingCapacity(false)
    }
  }

  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = `${todayDate.getFullYear()}-${pad(todayDate.getMonth() + 1)}-${pad(todayDate.getDate())}`

  const byDate = new Map<string, Reservation[]>()
  for (const r of reservations) {
    const ds = toDateStr(r.selectedDate)
    if (!ds) continue
    if (!byDate.has(ds)) byDate.set(ds, [])
    byDate.get(ds)!.push(r)
  }

  const selectedReservations = selectedDate ? (byDate.get(selectedDate) ?? []) : []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="予約カレンダー" />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full pb-8 space-y-4">

        {USE_DUMMY && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <p className="text-xs text-amber-700">ダミーデータ表示中</p>
          </div>
        )}

        {/* カレンダー本体 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* 月ナビ */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-900">{year}年{month + 1}月</span>
              <button
                onClick={() => { setSettingsOpen(true); setNewCapacity(monthCapacity) }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Settings size={11} />枠数: {monthCapacity}
              </button>
            </div>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_LABELS.map((label, i) => (
              <div key={label} className={`text-center text-xs font-medium py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
                {label}
              </div>
            ))}
          </div>

          {/* グリッド */}
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">読み込み中...</div>
          ) : (
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`e${i}`} className="border-b border-r border-gray-50 min-h-[68px]" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dow = (firstDow + i) % 7
                const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
                const closed = isClosedDay(dow, shop?.openHours)
                const isToday = dateStr === todayStr
                const isPast = dateStr < todayStr
                const isSelected = dateStr === selectedDate
                const count = byDate.get(dateStr)?.length ?? 0
                const isFull = count >= monthCapacity
                const isLastCol = (firstDow + i + 1) % 7 === 0

                return (
                  <button
                    key={dateStr}
                    onClick={() => !closed && setSelectedDate(isSelected ? null : dateStr)}
                    disabled={closed}
                    className={`relative min-h-[68px] border-b border-r border-gray-50 p-1.5 flex flex-col transition-colors
                      ${isLastCol ? 'border-r-0' : ''}
                      ${isSelected ? 'bg-orange-50' : closed ? 'bg-gray-50 cursor-default' : 'hover:bg-orange-50/40'}`}
                  >
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1
                      ${isToday ? 'bg-[#FF8F0D] text-white' : closed ? 'text-gray-300' : isPast ? 'text-gray-300' : dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-800'}`}>
                      {day}
                    </span>
                    {closed ? (
                      <span className="text-[9px] text-gray-300">休</span>
                    ) : count > 0 ? (
                      <span className={`text-[10px] font-bold px-1 py-0.5 rounded self-start ${isFull ? 'bg-red-500 text-white' : 'bg-[#FF8F0D] text-white'}`}>
                        {count}/{monthCapacity}
                      </span>
                    ) : !isPast ? (
                      <span className="text-[9px] text-gray-300">枠{monthCapacity}</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 凡例 */}
        <div className="flex gap-4 px-1">
          {[['bg-[#FF8F0D]', '予約あり'], ['bg-red-500', '満枠'], ['bg-gray-100', '休業日']].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm ${color}`} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>

        {/* 選択日の予約一覧 */}
        {selectedDate && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-800">
                {parseInt(selectedDate.split('-')[1])}月{parseInt(selectedDate.split('-')[2])}日
                <span className="text-gray-400 font-normal ml-2">{selectedReservations.length}件 / 枠{monthCapacity}</span>
              </p>
              <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>

            {selectedReservations.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">予約はありません</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {selectedReservations.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setDetailReservation(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    {r.dogPhoto
                      ? <img src={r.dogPhoto} alt={r.dogName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      : <div className="w-10 h-10 rounded-full bg-orange-50 shrink-0 flex items-center justify-center text-lg">🐕</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{r.dogName || '未設定'}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {r.selectedTime && `${r.selectedTime}　`}{r.serviceName || (r.serviceType === 'visit' ? '出張型' : '来店型')}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* 予約詳細モーダル */}
      {detailReservation && (
        <ReservationDetailModal r={detailReservation} onClose={() => setDetailReservation(null)} />
      )}

      {/* 枠数設定モーダル */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSettingsOpen(false)} />
          <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">{year}年{month + 1}月の枠数</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-gray-400"><X size={18} /></button>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-3">1日あたりの受付可能件数</p>
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => setNewCapacity(c => Math.max(1, c - 1))} className="w-11 h-11 rounded-full border border-gray-200 text-xl font-bold text-gray-600 hover:bg-gray-50">−</button>
                <span className="text-3xl font-bold text-gray-900 w-10 text-center">{newCapacity}</span>
                <button onClick={() => setNewCapacity(c => Math.min(10, c + 1))} className="w-11 h-11 rounded-full border border-gray-200 text-xl font-bold text-gray-600 hover:bg-gray-50">＋</button>
              </div>
              <p className="text-xs text-gray-300 text-center mt-2">1〜10枠</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSettingsOpen(false)} className="flex-1 py-2.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600">キャンセル</button>
              <button onClick={saveCapacity} disabled={savingCapacity} className="flex-1 py-2.5 rounded-full text-sm font-bold bg-[#FF8F0D] hover:bg-[#E67D0B] text-white disabled:opacity-50">
                {savingCapacity ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
