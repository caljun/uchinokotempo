import { useNavigate } from 'react-router-dom'
import { PawPrint } from 'lucide-react'

const CATEGORIES = [
  { emoji: '🎓', label: 'しつけ教室' },
  { emoji: '🏨', label: 'ホテル' },
  { emoji: '✂️', label: 'トリミング' },
  { emoji: '🏥', label: '病院' },
  { emoji: '🛍️', label: '商品・物販' },
  { emoji: '🎪', label: 'サービス・イベント' },
]

export default function StartPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-gray-900">
          <PawPrint size={18} className="text-[#FF8F0D]" />
          <span>ウチの子 Business</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 px-4 py-1.5 rounded-full transition-colors"
        >
          ログイン
        </button>
      </header>

      {/* ヒーロー */}
      <section className="bg-gradient-to-br from-orange-50 to-amber-50 px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-6">
            <PawPrint size={40} className="text-[#FF8F0D]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
            あなたのサービスを、<br />
            必要なわんちゃんに届ける
          </h1>
          <p className="text-gray-500 text-base mb-8">
            予約・販売・決済をひとつに。<br className="md:hidden" />
            無料で始められる店舗管理プラットフォーム
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="bg-[#FF8F0D] hover:bg-[#E67D0B] text-white font-bold px-8 py-3.5 rounded-full text-base transition-colors shadow-md"
          >
            無料で掲載を始める
          </button>
        </div>
      </section>

      {/* カテゴリ */}
      <section className="px-6 py-16 max-w-3xl mx-auto w-full">
        <h2 className="text-xl font-bold text-center text-gray-800 mb-8">対応業種</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.label}
              className="bg-white border border-gray-100 rounded-xl p-5 text-center shadow-sm"
            >
              <div className="text-3xl mb-2">{cat.emoji}</div>
              <div className="text-sm font-medium text-gray-700">{cat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-orange-50 px-6 py-14 text-center mt-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-3">今すぐ無料で始めよう</h2>
        <p className="text-gray-500 text-sm mb-6">初期費用・月額費用 0円</p>
        <button
          onClick={() => navigate('/signup')}
          className="bg-[#FF8F0D] hover:bg-[#E67D0B] text-white font-bold px-8 py-3 rounded-full transition-colors"
        >
          新規登録
        </button>
      </section>

      {/* フッター */}
      <footer className="border-t border-gray-100 px-6 py-6 text-center">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} uchinoko Inc.</p>
      </footer>
    </div>
  )
}
