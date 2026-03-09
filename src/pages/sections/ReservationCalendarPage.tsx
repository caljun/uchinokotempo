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

type DayKey = typeof DAY_KEYS[number]

interface DogInfo {
  name?: string
  breed?: string
  age?: number
  gender?: 'male' | 'female'
  neutered?: boolean
  weight?: number
  temperamentType?: string
  difficultyRank?: string
}

interface OwnerInfo {
  name?: string
  phone?: string
  email?: string
}

interface PaymentInfo {
  status?: 'succeeded' | 'pending'
  amount?: number
  clientSecret?: string
}

interface Reservation {
  id: string
  status: string
  userId?: string
  dogId?: string
  // フラットフィールド（旧形式）
  dogName?: string
  dogPhoto?: string
  ownerName?: string
  ownerPhone?: string
  selectedTime?: string
  // ISO8601形式の selectedDate（iOSから来る）
  selectedDate: { toDate: () => Date } | string | null
  serviceType?: string
  serviceName?: string
  servicePrice?: number
  createdAt?: { toDate: () => Date } | string | null
  paymentInfo?: PaymentInfo | null
  address?: string
  // ネストされたオブジェクト（iOS形式）
  dogInfo?: DogInfo
  ownerInfo?: OwnerInfo
}

// ─── フィールド正規化ヘルパー ──────────────────────────────────────────────────

/** 予約データからフラットな dogName を取得 */
function getDogName(r: Reservation): string {
  return r.dogName || r.dogInfo?.name || '未設定'
}

/** 予約データからフラットな ownerName を取得 */
function getOwnerName(r: Reservation): string {
  return r.ownerName || r.ownerInfo?.name || '-'
}

/** 予約データからフラットな ownerPhone を取得 */
function getOwnerPhone(r: Reservation): string {
  return r.ownerPhone || r.ownerInfo?.phone || '-'
}

/**
 * ISO8601文字列または Firestore Timestamp から YYYY-MM-DD を取得
 * iOS: "2025-12-29T10:00:00+09:00" → "2025-12-29"
 */
function toDateStr(val: Reservation['selectedDate']): string | null {
  if (!val) return null
  if (typeof val === 'string') return val.substring(0, 10)
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    const d = (val as { toDate: () => Date }).toDate()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return null
}

/**
 * ISO8601文字列から時刻 HH:mm を抽出
 * 例: "2025-12-29T10:00:00+09:00" → "10:00"
 */
function extractTime(val: Reservation['selectedDate']): string | null {
  if (!val) return null
  // 既に selectedTime フィールドがある場合（旧形式）はそちらを使う
  const str = typeof val === 'string' ? val : null
  if (!str) return null
  const tIdx = str.indexOf('T')
  if (tIdx < 0) return null
  const timePart = str.substring(tIdx + 1, tIdx + 6) // "HH:mm"
  return timePart.length === 5 ? timePart : null
}

const pad = (n: number) => String(n).padStart(2, '0')

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

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label: '申請中', cls: 'bg-amber-50 text-amber-600' },
  confirmed: { label: '確定',   cls: 'bg-blue-50 text-blue-600' },
  completed: { label: '完了',   cls: 'bg-green-50 text-green-600' },
  cancelled: { label: 'キャンセル', cls: 'bg-red-50 text-red-500' },
  canceled:  { label: 'キャンセル', cls: 'bg-red-50 text-red-500' },
}

function StatusBadge({ status, paymentStatus }: { status: string; paymentStatus?: string }) {
  // paymentInfo.succeeded → 実質 completed
  const effectiveStatus = (status === 'confirmed' && paymentStatus === 'succeeded') ? 'completed' : status
  const s = STATUS_MAP[effectiveStatus] ?? { label: effectiveStatus, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
}

// ─── 予約詳細モーダル ────────────────────────────────────────────────────────

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
  const isPaid = payment?.status === 'succeeded'
  const effectiveStatus = (r.status === 'confirmed' && isPaid) ? 'completed' : r.status

  // 日時ラベル（selectedDate ISO8601 または selectedTime フィールド）
  const dateLabel = (() => {
    const ds = toDateStr(r.selectedDate)
    if (!ds) return '-'
    const d = new Date(ds)
    const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
    const time = r.selectedTime || extractTime(r.selectedDate)
    return `${d.getMonth() + 1}月${d.getDate()}日（${dow}）${time ? ' ' + time : ''}`
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
              ? <img src={r.dogPhoto} alt={getDogName(r)} className="w-16 h-16 rounded-full object-cover shrink-0" />
              : <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 shrink-0 flex items-center justify-center text-2xl">🐕</div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-gray-900">{getDogName(r)}</p>
              {(dog?.breed) && <p className="text-xs text-gray-400">{dog.breed}</p>}
            </div>
            <StatusBadge status={r.status} paymentStatus={payment?.status} />
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
                <Row label="氏名" value={getOwnerName(r)} />
                <Row label="電話" value={getOwnerPhone(r)} />
              </div>
            </section>

            {/* 支払い */}
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">支払い</p>
              <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                <Row label="状況" value={
                  isPaid
                    ? <span className="text-xs font-bold text-green-600">支払い完了</span>
                    : sent || payment?.status === 'pending'
                    ? <span className="text-xs font-bold text-amber-600">支払い待ち</span>
                    : <span className="text-xs text-gray-400">未請求</span>
                } />
                {payment?.amount != null && (
                  <Row label="金額" value={`¥${payment.amount.toLocaleString()}`} />
                )}
                {r.servicePrice != null && payment?.amount == null && (
                  <Row label="サービス料金" value={`¥${r.servicePrice.toLocaleString()}`} />
                )}
              </div>
              {/* 請求書ボタン: 未請求（paymentInfo なし）かつ 来店型かつ未送信 */}
              {!payment && !sent && r.serviceType !== 'visit' && (
                <button
                  onClick={handleSendInvoice}
                  disabled={sending}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-[#FF8F0D] hover:bg-[#E67D0B] disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                >
                  <Send size={14} />
                  {sending ? '送信中...' : '請求書を送る'}
                </button>
              )}
              {/* payment.status === 'pending'（未払い）でも再送可能にする */}
              {payment?.status === 'pending' && !sent && !isPaid && (
                <button
                  onClick={handleSendInvoice}
                  disabled={sending}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                >
                  <Send size={14} />
                  {sending ? '送信中...' : '請求書を再送する'}
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
                  {dog.gender && <Row label="性別" value={`${genderLabel}${neuteredLabel ? '　' + neuteredLabel : ''}`} />}
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

            {/* ステータスが完了の場合のカルテ案内 */}
            {effectiveStatus === 'completed' && (
              <div className="bg-green-50 rounded-xl px-4 py-3">
                <p className="text-xs text-green-700 font-medium">支払い完了 — カルテに来店記録が追加されています</p>
              </div>
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

// ────────────────────────────────────────────────────────────────────────────

export default function ReservationCalendarPage() {
  const { shop } = useAuth()
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const [currentMonth, setCurrentMonth] = useState(
    new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  )
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [inStoreCapacity, setInStoreCapacity] = useState(DEFAULT_CAPACITY)
  const [visitCapacity, setVisitCapacity] = useState(DEFAULT_CAPACITY)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [detailReservation, setDetailReservation] = useState<Reservation | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newInStoreCapacity, setNewInStoreCapacity] = useState(DEFAULT_CAPACITY)
  const [newVisitCapacity, setNewVisitCapacity] = useState(DEFAULT_CAPACITY)
  const [savingCapacity, setSavingCapacity] = useState(false)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const monthStr = `${year}-${pad(month + 1)}`

  const loadMonthData = useCallback(async () => {
    if (!shop) return
    setLoading(true)
    try {
      // 月別枠数（inStoreCapacity / visitCapacity）
      const capSnap = await getDoc(doc(db, 'shops', shop.shopId, 'monthlyCapacities', monthStr))
      const capData = capSnap.exists() ? capSnap.data() : {}
      const inStore = (capData.inStoreCapacity ?? capData.capacity ?? DEFAULT_CAPACITY) as number
      const visit = (capData.visitCapacity ?? capData.capacity ?? DEFAULT_CAPACITY) as number
      setInStoreCapacity(inStore)
      setVisitCapacity(visit)
      setNewInStoreCapacity(inStore)
      setNewVisitCapacity(visit)

      // 予約一覧（この店舗の全予約 → クライアントで当月フィルタ）
      const snap = await getDocs(
        query(collection(db, 'reservations'), where('storeId', '==', shop.shopId))
      )
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Reservation))
        .filter(r => {
          const s = r.status
          if (s === 'cancelled' || s === 'canceled') return false
          return toDateStr(r.selectedDate)?.startsWith(monthStr) ?? false
        })
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
        { inStoreCapacity: newInStoreCapacity, visitCapacity: newVisitCapacity, updatedAt: serverTimestamp() },
        { merge: true }
      )
      setInStoreCapacity(newInStoreCapacity)
      setVisitCapacity(newVisitCapacity)
      setSettingsOpen(false)
    } finally {
      setSavingCapacity(false)
    }
  }

  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = `${todayDate.getFullYear()}-${pad(todayDate.getMonth() + 1)}-${pad(todayDate.getDate())}`

  const byDateInStore = new Map<string, Reservation[]>()
  const byDateVisit = new Map<string, Reservation[]>()
  for (const r of reservations) {
    const ds = toDateStr(r.selectedDate)
    if (!ds) continue
    const map = r.serviceType === 'visit' ? byDateVisit : byDateInStore
    if (!map.has(ds)) map.set(ds, [])
    map.get(ds)!.push(r)
  }

  const selectedReservations = selectedDate
    ? [...(byDateInStore.get(selectedDate) ?? []), ...(byDateVisit.get(selectedDate) ?? [])]
    : []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="予約カレンダー" />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full pb-8 space-y-4">

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
                onClick={() => { setSettingsOpen(true); setNewInStoreCapacity(inStoreCapacity); setNewVisitCapacity(visitCapacity) }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Settings size={11} />枠数設定
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
                const inStoreCount = byDateInStore.get(dateStr)?.length ?? 0
                const visitCount = byDateVisit.get(dateStr)?.length ?? 0
                const hasAny = inStoreCount > 0 || visitCount > 0
                const isLastCol = (firstDow + i + 1) % 7 === 0

                return (
                  <button
                    key={dateStr}
                    onClick={() => !closed && setSelectedDate(isSelected ? null : dateStr)}
                    disabled={closed}
                    className={`relative min-h-[76px] border-b border-r border-gray-50 p-1.5 flex flex-col transition-colors
                      ${isLastCol ? 'border-r-0' : ''}
                      ${isSelected ? 'bg-orange-50' : closed ? 'bg-gray-50 cursor-default' : 'hover:bg-orange-50/40'}`}
                  >
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1
                      ${isToday ? 'bg-[#FF8F0D] text-white' : closed ? 'text-gray-300' : isPast ? 'text-gray-300' : dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-800'}`}>
                      {day}
                    </span>
                    {closed ? (
                      <span className="text-[9px] text-gray-300">休</span>
                    ) : hasAny ? (
                      <div className="flex flex-col gap-0.5">
                        {inStoreCount > 0 && (
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded self-start ${inStoreCount >= inStoreCapacity ? 'bg-red-500 text-white' : 'bg-[#FF8F0D] text-white'}`}>
                            来{inStoreCount}/{inStoreCapacity}
                          </span>
                        )}
                        {visitCount > 0 && (
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded self-start ${visitCount >= visitCapacity ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                            出{visitCount}/{visitCapacity}
                          </span>
                        )}
                      </div>
                    ) : !isPast ? (
                      <span className="text-[9px] text-gray-300 leading-tight">来{inStoreCapacity}<br/>出{visitCapacity}</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 凡例 */}
        <div className="flex gap-4 px-1">
          {[['bg-[#FF8F0D]', '来店型'], ['bg-green-500', '出張型'], ['bg-red-500', '満枠'], ['bg-gray-100', '休業日']].map(([color, label]) => (
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
                <span className="text-gray-400 font-normal ml-2 text-xs">
                  来店 {byDateInStore.get(selectedDate)?.length ?? 0}/{inStoreCapacity}　出張 {byDateVisit.get(selectedDate)?.length ?? 0}/{visitCapacity}
                </span>
              </p>
              <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>

            {selectedReservations.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">予約はありません</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {selectedReservations
                  .slice()
                  .sort((a, b) => {
                    const ta = extractTime(a.selectedDate) ?? a.selectedTime ?? ''
                    const tb = extractTime(b.selectedDate) ?? b.selectedTime ?? ''
                    return ta.localeCompare(tb)
                  })
                  .map(r => {
                    const time = r.selectedTime || extractTime(r.selectedDate)
                    const isPaid = r.paymentInfo?.status === 'succeeded'
                    return (
                      <button
                        key={r.id}
                        onClick={() => setDetailReservation(r)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        {r.dogPhoto
                          ? <img src={r.dogPhoto} alt={getDogName(r)} className="w-10 h-10 rounded-full object-cover shrink-0" />
                          : <div className="w-10 h-10 rounded-full bg-orange-50 shrink-0 flex items-center justify-center text-lg">🐕</div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800">{getDogName(r)}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {time && `${time}　`}{r.serviceName || (r.serviceType === 'visit' ? '出張型' : '来店型')}
                          </p>
                          {!isPaid && r.serviceType !== 'visit' && r.status !== 'completed' && (
                            <p className="text-[10px] text-amber-500 font-medium mt-0.5">
                              {r.paymentInfo?.status === 'pending' ? '支払い待ち' : '未請求'}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={r.status} paymentStatus={r.paymentInfo?.status} />
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* 予約なし・初期状態 */}
        {!loading && reservations.length === 0 && !selectedDate && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-12 text-center">
            <p className="text-sm text-gray-400">この月の予約はありません</p>
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
            <p className="text-xs text-gray-400 -mt-2">1日あたりのサービス種別ごとの受付可能件数</p>

            {/* 来店型 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Store size={13} className="text-[#FF8F0D]" />
                <p className="text-sm font-bold text-gray-700">来店型</p>
              </div>
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => setNewInStoreCapacity(c => Math.max(1, c - 1))} className="w-11 h-11 rounded-full border border-gray-200 text-xl font-bold text-gray-600 hover:bg-gray-50">−</button>
                <span className="text-3xl font-bold text-gray-900 w-10 text-center">{newInStoreCapacity}</span>
                <button onClick={() => setNewInStoreCapacity(c => Math.min(10, c + 1))} className="w-11 h-11 rounded-full border border-gray-200 text-xl font-bold text-gray-600 hover:bg-gray-50">＋</button>
              </div>
            </div>

            {/* 出張型 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Car size={13} className="text-green-500" />
                <p className="text-sm font-bold text-gray-700">出張型</p>
              </div>
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => setNewVisitCapacity(c => Math.max(1, c - 1))} className="w-11 h-11 rounded-full border border-gray-200 text-xl font-bold text-gray-600 hover:bg-gray-50">−</button>
                <span className="text-3xl font-bold text-gray-900 w-10 text-center">{newVisitCapacity}</span>
                <button onClick={() => setNewVisitCapacity(c => Math.min(10, c + 1))} className="w-11 h-11 rounded-full border border-gray-200 text-xl font-bold text-gray-600 hover:bg-gray-50">＋</button>
              </div>
            </div>
            <p className="text-xs text-gray-300 text-center">各 1〜10枠</p>

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
