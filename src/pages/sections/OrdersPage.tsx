import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, RefreshCw, X, ChevronRight } from 'lucide-react'
import {
  collection, query, where, orderBy, getDocs,
  doc, getDoc, onSnapshot,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db, app } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'

type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'shipped' | 'completed' | 'cancelled'

interface OrderItem {
  name: string
  price: number
  quantity: number
}

interface OrderAddress {
  name?: string
  phone?: string
  postalCode?: string
  prefecture?: string
  city?: string
  street?: string
  building?: string
}

interface Order {
  id: string
  status: OrderStatus
  createdAt: { toDate: () => Date } | string | null
  amount: number
  subtotal?: number
  appFee?: number
  dogName?: string
  dogPhoto?: string
  userName?: string
  address?: OrderAddress
  items?: OrderItem[]
  trackingNumber?: string
}

type FilterStatus = 'all' | OrderStatus

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'paid', label: '支払完了' },
  { key: 'preparing', label: '準備中' },
  { key: 'shipped', label: '発送済み' },
  { key: 'completed', label: '完了' },
  { key: 'cancelled', label: 'キャンセル' },
]

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: '支払い待ち',
  paid: '支払完了',
  preparing: '準備中',
  shipped: '発送済み',
  completed: '完了',
  cancelled: 'キャンセル',
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment: 'bg-gray-100 text-gray-600',
  paid: 'bg-blue-50 text-blue-600',
  preparing: 'bg-amber-50 text-amber-600',
  shipped: 'bg-purple-50 text-purple-600',
  completed: 'bg-green-50 text-green-600',
  cancelled: 'bg-red-50 text-red-500',
}

function formatDate(date: Date | string | { toDate: () => Date } | null): string {
  if (!date) return '-'
  const d = typeof (date as { toDate?: () => Date }).toDate === 'function'
    ? (date as { toDate: () => Date }).toDate()
    : new Date(date as string)
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d)
}

// 発送モーダル
function ShippingModal({ orderId, onClose, onConfirm }: {
  orderId: string
  onClose: () => void
  onConfirm: (orderId: string, trackingNumber: string | null) => Promise<void>
}) {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(orderId, trackingNumber.trim() || null)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">発送情報入力</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">配送伝票番号（任意）</label>
          <input
            type="text"
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            placeholder="例：1234-5678-9012"
          />
          <p className="text-xs text-gray-400 mt-2">入力すると購入者に通知されます</p>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600">
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full text-sm font-bold bg-[#FF8F0D] hover:bg-[#E67D0B] text-white disabled:opacity-50"
          >
            {loading ? '処理中...' : '発送済みにする'}
          </button>
        </div>
      </div>
    </div>
  )
}

// 注文詳細モーダル
function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">注文詳細</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 注文情報 */}
          <section>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">注文情報</h4>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">注文ID</span>
                <span className="font-mono text-xs text-gray-700 truncate max-w-[160px]">{order.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">ステータス</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status]}`}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">注文日時</span>
                <span className="text-gray-700">{formatDate(order.createdAt)}</span>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">伝票番号</span>
                  <span className="text-gray-700">{order.trackingNumber}</span>
                </div>
              )}
            </div>
          </section>

          {/* うちの子 */}
          <section>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">うちの子</h4>
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
              {order.dogPhoto
                ? <img src={order.dogPhoto} alt={order.dogName} className="w-12 h-12 rounded-full object-cover shrink-0" />
                : <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
              }
              <p className="text-sm font-bold text-gray-800">{order.dogName || '未設定'}</p>
            </div>
          </section>

          {/* 飼い主 */}
          {order.userName && (
            <section>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">飼い主</h4>
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
                {order.userName}
              </div>
            </section>
          )}

          {/* 商品 */}
          <section>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">商品</h4>
            <div className="space-y-2">
              {(order.items ?? []).map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm font-bold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ¥{item.price.toLocaleString()} × {item.quantity}個 ＝ ¥{(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 配送先 */}
          {order.address && (
            <section>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">配送先</h4>
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-0.5">
                <p className="text-gray-700">〒{order.address.postalCode}</p>
                <p className="text-gray-700">
                  {order.address.prefecture}{order.address.city}{order.address.street}{order.address.building}
                </p>
                <p className="text-gray-500 text-xs">{order.address.name} / {order.address.phone}</p>
              </div>
            </section>
          )}

          {/* 金額内訳 */}
          <section>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">金額内訳</h4>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>小計</span>
                <span>¥{(order.subtotal ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>手数料（10%）</span>
                <span>¥{(order.appFee ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1">
                <span>合計</span>
                <span>¥{(order.amount ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// 注文カード
function OrderCard({ order, onDetail, onPreparing, onShipping }: {
  order: Order
  onDetail: (o: Order) => void
  onPreparing: (id: string) => void
  onShipping: (id: string) => void
}) {
  const itemsSummary = (order.items ?? []).map(i => `${i.name}×${i.quantity}`).join(', ')

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-4">
        {/* top row */}
        <div className="flex items-center gap-3 mb-3">
          {order.dogPhoto
            ? <img src={order.dogPhoto} alt={order.dogName} className="w-10 h-10 rounded-full object-cover shrink-0" />
            : <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800">{order.dogName || '未設定'}</p>
            <p className="text-xs text-gray-400 truncate">{itemsSummary || '商品なし'}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>

        {/* meta */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <span>{formatDate(order.createdAt)}</span>
          <span className="font-bold text-[#FF8F0D] text-sm">¥{(order.amount ?? 0).toLocaleString()}</span>
        </div>

        {/* actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onDetail(order)}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            詳細 <ChevronRight size={12} />
          </button>
          {order.status === 'paid' && (
            <button
              onClick={() => onPreparing(order.id)}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#FF8F0D] hover:bg-[#E67D0B] text-white"
            >
              準備中へ
            </button>
          )}
          {order.status === 'preparing' && (
            <button
              onClick={() => onShipping(order.id)}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#FF8F0D] hover:bg-[#E67D0B] text-white"
            >
              発送済みへ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const { shop } = useAuth()
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadOrders = useCallback(async (status: FilterStatus) => {
    if (!shop) return
    setLoading(true)
    setError('')
    try {
      const ref = collection(db, 'shops', shop.shopId, 'orders')
      const q = status === 'all'
        ? query(ref, orderBy('createdAt', 'desc'))
        : query(ref, where('status', '==', status), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)

      const fetched: Order[] = []
      for (const d of snap.docs) {
        const refData = d.data()
        const orderId = refData.orderId as string | undefined
        if (!orderId) continue
        const detailSnap = await getDoc(doc(db, 'orders', orderId))
        if (detailSnap.exists()) {
          fetched.push({ id: orderId, ...detailSnap.data() } as Order)
        }
      }

      fetched.sort((a, b) => {
        const toMs = (v: Order['createdAt']) => {
          if (!v) return 0
          if (typeof (v as { toDate?: () => Date }).toDate === 'function') return (v as { toDate: () => Date }).toDate().getTime()
          return new Date(v as string).getTime()
        }
        return toMs(b.createdAt) - toMs(a.createdAt)
      })

      setOrders(fetched)
    } catch {
      setError('注文の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [shop])

  // 新規注文バッジ（paid件数）のリアルタイム監視
  useEffect(() => {
    if (!shop) return
    const q = query(collection(db, 'shops', shop.shopId, 'orders'), where('status', '==', 'paid'))
    const unsub = onSnapshot(q, snap => setNewCount(snap.size))
    return unsub
  }, [shop])

  useEffect(() => {
    loadOrders(filter)
  }, [filter, loadOrders])

  const handleStatusUpdate = async (orderId: string, newStatus: string, trackingNumber?: string | null) => {
    if (!shop) return
    if (!confirm('注文ステータスを更新しますか？')) return
    try {
      const functions = getFunctions(app, 'us-central1')
      const updateOrderStatus = httpsCallable(functions, 'updateOrderStatus')
      await updateOrderStatus({ orderId, status: newStatus, shopId: shop.shopId, ...(trackingNumber ? { trackingNumber } : {}) })
      await loadOrders(filter)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '不明なエラー'
      alert('ステータスの更新に失敗しました: ' + msg)
    }
  }

  const handleShippingConfirm = async (orderId: string, trackingNumber: string | null) => {
    await handleStatusUpdate(orderId, 'shipped', trackingNumber)
    setShippingOrderId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="注文管理" />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full pb-8">

        {/* フィルター */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.key
                  ? 'bg-[#FF8F0D] text-white border-[#FF8F0D]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {f.label}
              {f.key === 'paid' && newCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {newCount}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => loadOrders(filter)}
            className="shrink-0 ml-auto p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* リスト */}
        {loading ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 rounded-xl p-4 text-xs text-red-600">{error}</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center gap-3 text-center">
            <ShoppingBag size={40} strokeWidth={1.2} className="text-gray-300" />
            <p className="text-sm text-gray-400">注文がありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onDetail={setDetailOrder}
                onPreparing={id => handleStatusUpdate(id, 'preparing')}
                onShipping={id => setShippingOrderId(id)}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* 詳細モーダル */}
      {detailOrder && (
        <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />
      )}

      {/* 発送モーダル */}
      {shippingOrderId && (
        <ShippingModal
          orderId={shippingOrderId}
          onClose={() => setShippingOrderId(null)}
          onConfirm={handleShippingConfirm}
        />
      )}
    </div>
  )
}
