import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'

type VerificationStatus = 'noAccount' | 'complete' | 'pending' | 'incomplete'

interface AccountStatus {
  status: VerificationStatus
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
}

function StatusCard({ status }: { status: AccountStatus }) {
  if (status.status === 'complete') {
    return (
      <div className="bg-green-50 rounded-2xl p-5 flex items-start gap-3">
        <CheckCircle size={22} className="text-green-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-green-700 mb-1">本人確認完了</p>
          <p className="text-xs text-green-600">決済を受け付ける準備ができています。</p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-green-600">
              決済受付: {status.chargesEnabled ? '✓ 有効' : '無効'}
            </p>
            <p className="text-xs text-green-600">
              振込: {status.payoutsEnabled ? '✓ 有効' : '無効'}
            </p>
          </div>
        </div>
      </div>
    )
  }
  if (status.status === 'pending') {
    return (
      <div className="bg-amber-50 rounded-2xl p-5 flex items-start gap-3">
        <Clock size={22} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-700 mb-1">審査中</p>
          <p className="text-xs text-amber-600">通常1〜2営業日で完了します。</p>
        </div>
      </div>
    )
  }
  if (status.status === 'incomplete') {
    return (
      <div className="bg-red-50 rounded-2xl p-5 flex items-start gap-3">
        <AlertCircle size={22} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-700 mb-1">本人確認未完了</p>
          <p className="text-xs text-red-600">下のボタンから本人確認を完了してください。</p>
        </div>
      </div>
    )
  }
  // noAccount
  return (
    <div className="bg-gray-50 rounded-2xl p-5 flex items-start gap-3">
      <AlertCircle size={22} className="text-gray-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold text-gray-700 mb-1">未登録</p>
        <p className="text-xs text-gray-500">Stripeアカウントがまだ作成されていません。</p>
      </div>
    </div>
  )
}

export default function StripePage() {
  const { shop, reloadShop } = useAuth()
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStatus()
  }, [shop?.stripeAccountId])

  const loadStatus = async () => {
    if (!shop) return
    setLoadingStatus(true)
    try {
      if (!shop.stripeAccountId) {
        setAccountStatus({ status: 'noAccount' })
        return
      }
      const functions = getFunctions(app, 'us-central1')
      const getConnectedAccountStatus = httpsCallable(functions, 'getConnectedAccountStatus')
      const result = await getConnectedAccountStatus({ shopId: shop.shopId })
      const data = result.data as { status: string; chargesEnabled: boolean; payoutsEnabled: boolean }
      const statusMap: Record<string, VerificationStatus> = {
        complete: 'complete',
        pending: 'pending',
      }
      setAccountStatus({
        status: statusMap[data.status] ?? 'incomplete',
        chargesEnabled: data.chargesEnabled,
        payoutsEnabled: data.payoutsEnabled,
      })
    } catch {
      setAccountStatus({ status: shop.stripeAccountId ? 'incomplete' : 'noAccount' })
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleStartVerification = async () => {
    if (!shop) return
    setProcessing(true)
    setError('')
    try {
      const functions = getFunctions(app, 'us-central1')

      // アカウントがなければ作成
      if (!shop.stripeAccountId) {
        const createConnectedAccount = httpsCallable(functions, 'createConnectedAccount')
        await createConnectedAccount({ shopId: shop.shopId })
        await reloadShop()
      }

      // Account Link を取得してリダイレクト
      const createAccountLink = httpsCallable(functions, 'createAccountLink')
      const result = await createAccountLink({ shopId: shop.shopId })
      const data = result.data as { url?: string }
      if (data.url) {
        window.open(data.url, '_blank')
      } else {
        throw new Error('URLの取得に失敗しました')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '不明なエラー'
      setError(`エラーが発生しました: ${msg}`)
    } finally {
      setProcessing(false)
    }
  }

  const buttonLabel = () => {
    if (processing) return '処理中...'
    if (accountStatus?.status === 'complete') return '設定を確認・変更する'
    if (accountStatus?.status === 'pending') return '登録情報を確認する'
    return '本人確認を始める'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="Stripe本人確認" />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full space-y-4 pb-8">

        {/* ステータスカード */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4">本人確認ステータス</h2>
          {loadingStatus ? (
            <p className="text-sm text-gray-400 text-center py-4">確認中...</p>
          ) : accountStatus ? (
            <StatusCard status={accountStatus} />
          ) : null}
        </div>

        {/* 説明 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-800">本人確認について</h2>
          <div className="space-y-2">
            {[
              '決済を受け付けるためにStripeによる本人確認が必要です',
              '確認には身分証明書（運転免許証・パスポートなど）が必要です',
              '審査は通常1〜2営業日で完了します',
              '完了後は売上の振込が可能になります',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[#FF8F0D] text-xs mt-0.5 shrink-0">•</span>
                <p className="text-xs text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* ボタン */}
        <button
          onClick={handleStartVerification}
          disabled={processing || loadingStatus}
          className="w-full flex items-center justify-center gap-2 bg-[#FF8F0D] hover:bg-[#E67D0B] disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm transition-colors"
        >
          <ExternalLink size={16} />
          {buttonLabel()}
        </button>

        {accountStatus?.status === 'complete' && (
          <button
            onClick={loadStatus}
            disabled={loadingStatus}
            className="w-full py-2.5 rounded-2xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ステータスを更新
          </button>
        )}

      </main>

      <Footer />
    </div>
  )
}
