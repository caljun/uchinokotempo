import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PawPrint, LogOut, ChevronLeft } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface HeaderProps {
  showBack?: boolean
  title?: string
}

export default function Header({ showBack = false, title }: HeaderProps) {
  const { shop, loading, signOut, togglePublish } = useAuth()
  const navigate = useNavigate()
  const [publishing, setPublishing] = useState(false)

  const handleSignOut = async () => {
    if (!confirm('ログアウトしますか？')) return
    await signOut()
    navigate('/')
  }

  const handleTogglePublish = async () => {
    if (publishing) return
    const action = shop?.isPublished ? '非公開にしますか？' : '公開しますか？'
    if (!confirm(action)) return
    setPublishing(true)
    try {
      await togglePublish()
    } finally {
      setPublishing(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="h-14 px-4 flex items-center justify-between gap-2">

        {/* 左: 戻るボタン */}
        <div className="w-20 flex items-center shrink-0">
          {showBack && (
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">ホーム</span>
            </button>
          )}
        </div>

        {/* 中央: ロゴ + タイトル */}
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-1.5 font-bold text-gray-900 shrink-0"
        >
          <PawPrint size={18} className="text-[#FF8F0D]" />
          <span className="text-sm">{title ?? 'ウチの子 Business'}</span>
        </button>

        {/* 右: 公開ステータス + ログアウト */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 公開ステータスバッジ */}
          {loading ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-300 border border-gray-200 whitespace-nowrap">
              ···
            </span>
          ) : shop ? (
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                shop.isPublished
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}
            >
              {shop.isPublished ? '公開中' : '非公開'}
            </span>
          ) : null}

          {/* 公開切り替えボタン（smから表示） */}
          {!loading && shop && (
            <button
              onClick={handleTogglePublish}
              disabled={publishing}
              className={`hidden sm:block text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap disabled:opacity-50 ${
                shop.isPublished
                  ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  : 'border-[#FF8F0D] text-[#FF8F0D] hover:bg-orange-50'
              }`}
            >
              {publishing ? '...' : shop.isPublished ? '非公開にする' : '公開する'}
            </button>
          )}

          {/* ログアウト */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors ml-1"
            title="ログアウト"
          >
            <LogOut size={16} />
          </button>
        </div>

      </div>

      {/* モバイル: 公開切り替えボタン（sm未満のみ、バッジの下に細帯で表示） */}
      {!loading && shop && (
        <div className="sm:hidden border-t border-gray-100 px-4 py-1.5 flex justify-end">
          <button
            onClick={handleTogglePublish}
            disabled={publishing}
            className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors disabled:opacity-50 ${
              shop.isPublished
                ? 'border-gray-300 text-gray-600'
                : 'border-[#FF8F0D] text-[#FF8F0D]'
            }`}
          >
            {publishing ? '処理中...' : shop.isPublished ? '非公開にする' : '公開する'}
          </button>
        </div>
      )}
    </header>
  )
}
