import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PawPrint, ChevronLeft, X, Menu, LogOut, Globe, EyeOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import type { ShopProfile } from '../../contexts/AuthContext'

interface HeaderProps {
  showBack?: boolean
  title?: string
}

function getDraftLabel(shop: ShopProfile): string {
  if (!shop.photoUrls || shop.photoUrls.length < 1) return '下書き（写真未設定）'
  if (!shop.services || shop.services.length < 1) return '下書き（サービス未登録）'
  const hasOpenHours =
    (shop.openHours && Object.values(shop.openHours).some(d => d !== null)) ||
    (!!shop.openHoursDisplay && shop.openHoursDisplay.trim() !== '')
  if (!hasOpenHours) return '下書き（営業時間未設定）'
  if (!shop.stripeAccountId) return '下書き（Stripe未連携）'
  if (shop.license?.status === 'pending') return '下書き（審査中）'
  if (shop.license?.status === 'rejected') return '下書き（審査却下）'
  return '下書き'
}

export default function Header({ showBack = false, title }: HeaderProps) {
  const { shop, loading, signOut, togglePublish } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [errors, setErrors] = useState<string[] | null>(null)

  const handleSignOut = async () => {
    setMenuOpen(false)
    if (!confirm('ログアウトしますか？')) return
    await signOut()
    navigate('/')
  }

  const handleTogglePublish = async () => {
    setMenuOpen(false)
    if (publishing) return
    const action = shop?.isPublished ? '非公開にしますか？' : '公開しますか？'
    if (!confirm(action)) return
    setPublishing(true)
    setErrors(null)
    try {
      const result = await togglePublish()
      if (result.error) setErrors(result.error)
    } finally {
      setPublishing(false)
    }
  }

  const badgeLabel = !shop ? null : shop.isPublished ? '公開中' : getDraftLabel(shop)
  const badgeCls = shop?.isPublished
    ? 'bg-green-50 text-green-700 border border-green-200'
    : 'bg-gray-100 text-gray-500 border border-gray-200'

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="h-14 px-4 flex items-center justify-between gap-2">

          {/* 左: 戻るボタン */}
          <div className="w-20 flex items-center shrink-0">
            {showBack && (
              <button
                onClick={() => navigate('/home')}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft size={20} />
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

          {/* 右: デスクトップはバッジ+ボタン、モバイルはメニュー */}
          <div className="flex items-center gap-2 shrink-0">

            {/* デスクトップのみ: バッジ */}
            {loading ? (
              <span className="hidden sm:inline text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-300 border border-gray-200">···</span>
            ) : shop ? (
              <span className={`hidden sm:inline text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${badgeCls}`}>
                {badgeLabel}
              </span>
            ) : null}

            {/* デスクトップのみ: 公開切り替えボタン */}
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

            {/* デスクトップのみ: ログアウト */}
            <button
              onClick={handleSignOut}
              className="hidden sm:flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors"
              title="ログアウト"
            >
              <LogOut size={16} />
            </button>

            {/* モバイルのみ: メニューボタン */}
            <div className="sm:hidden relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="p-1.5 text-gray-500 hover:text-gray-800 transition-colors"
              >
                <Menu size={20} />
              </button>

              {menuOpen && (
                <div className="absolute top-10 right-0 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50">
                  {/* ステータス */}
                  {!loading && shop && (
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">ステータス</p>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgeCls}`}>
                        {badgeLabel}
                      </span>
                    </div>
                  )}

                  {/* 公開切り替え */}
                  {!loading && shop && (
                    <button
                      onClick={handleTogglePublish}
                      disabled={publishing}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors border-b border-gray-100 disabled:opacity-50"
                    >
                      {shop.isPublished
                        ? <><EyeOff size={16} className="text-gray-400 shrink-0" /><span className="text-gray-700">{publishing ? '処理中...' : '非公開にする'}</span></>
                        : <><Globe size={16} className="text-[#FF8F0D] shrink-0" /><span className="text-[#FF8F0D] font-medium">{publishing ? '処理中...' : '公開する'}</span></>
                      }
                    </button>
                  )}

                  {/* ログアウト */}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors"
                  >
                    <LogOut size={16} className="text-red-400 shrink-0" />
                    <span className="text-red-500">ログアウト</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メニュー外クリックで閉じる */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}

      {/* 公開エラーモーダル */}
      {errors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setErrors(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">公開できません</h3>
              <button onClick={() => setErrors(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">以下の項目を設定してください：</p>
            <ul className="space-y-2">
              {errors.map(e => (
                <li key={e} className="flex items-start gap-2 text-sm text-red-600">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setErrors(null)}
              className="mt-5 w-full py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  )
}
