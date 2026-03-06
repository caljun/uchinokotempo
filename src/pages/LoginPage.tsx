import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PawPrint, ChevronLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/home')
    } catch {
      setError('メールアドレスまたはパスワードが正しくありません')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronLeft size={18} />
          トップ
        </Link>
        <div className="flex items-center gap-1.5 font-bold text-gray-900">
          <PawPrint size={17} className="text-[#FF8F0D]" />
          <span>ウチの子 Business</span>
        </div>
        <div className="w-16" />
      </header>

      {/* フォーム */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">ログイン</h1>
          <p className="text-sm text-gray-500 mb-6">店舗管理画面にアクセスするにはログインが必要です</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"
                placeholder="shop@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF8F0D] hover:bg-[#E67D0B] disabled:opacity-50 text-white font-bold py-3 rounded-full transition-colors mt-2"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            アカウントをお持ちでない方は{' '}
            <Link to="/signup" className="text-[#FF8F0D] font-medium hover:underline">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
