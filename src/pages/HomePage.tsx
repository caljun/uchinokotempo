import { useNavigate } from 'react-router-dom'
import {
  FileText, Dog, CalendarDays, ShoppingBag, Briefcase,
  Package, Clock, CreditCard, ScrollText, Info,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'

const GRID_ITEMS = [
  { label: '基本情報', icon: FileText, path: '/home/basic', color: 'text-blue-500' },
  { label: 'カルテ', icon: Dog, path: '/home/karte', color: 'text-green-500' },
  { label: '予約カレンダー', icon: CalendarDays, path: '/home/reservation', color: 'text-purple-500' },
  { label: '注文管理', icon: ShoppingBag, path: '/home/orders', color: 'text-red-500' },
  { label: 'サービス', icon: Briefcase, path: '/home/services', color: 'text-indigo-500' },
  { label: '商品', icon: Package, path: '/home/products', color: 'text-orange-500' },
  { label: '営業時間設定', icon: Clock, path: '/home/hours', color: 'text-teal-500' },
  { label: 'Stripe本人確認', icon: CreditCard, path: '/home/stripe', color: 'text-violet-500' },
  { label: '第一種動物取扱業', icon: ScrollText, path: '/home/license', color: 'text-amber-600' },
  { label: 'ご案内', icon: Info, path: '/home/legal', color: 'text-gray-500' },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
        <h1 className="text-lg font-bold text-gray-800 mb-6">管理メニュー</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {GRID_ITEMS.map(({ label, icon: Icon, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="aspect-square bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className={`${color}`}>
                <Icon size={32} strokeWidth={1.5} />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center px-2 leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
