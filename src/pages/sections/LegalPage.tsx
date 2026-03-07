import { useNavigate } from 'react-router-dom'
import { Mail, FileText, Shield, ShoppingBag, ChevronRight } from 'lucide-react'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'

const ITEMS = [
  {
    icon: FileText,
    label: '利用規約',
    path: '/terms',
    color: 'text-blue-500',
  },
  {
    icon: Shield,
    label: 'プライバシーポリシー',
    path: '/privacy',
    color: 'text-green-500',
  },
  {
    icon: ShoppingBag,
    label: '特定商取引法に基づく表記',
    path: '/commercial',
    color: 'text-orange-500',
  },
  {
    icon: Mail,
    label: 'サポートへのお問い合わせ',
    href: 'mailto:calderonjunya0602@gmail.com',
    color: 'text-purple-500',
  },
]

export default function LegalPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="ご案内" />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {ITEMS.map(({ icon: Icon, label, path, href, color }, i) => {
            const isLast = i === ITEMS.length - 1
            const handleClick = () => {
              if (href) {
                window.location.href = href
              } else if (path) {
                navigate(path)
              }
            }
            return (
              <button
                key={label}
                onClick={handleClick}
                className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left ${!isLast ? 'border-b border-gray-100' : ''}`}
              >
                <Icon size={20} className={`shrink-0 ${color}`} />
                <span className="flex-1 text-sm font-medium text-gray-800">{label}</span>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </button>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          © {new Date().getFullYear()} uchinoko Inc.
        </p>
      </main>

      <Footer />
    </div>
  )
}
