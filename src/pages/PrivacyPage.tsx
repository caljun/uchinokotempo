import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">プライバシーポリシー</h1>
        </div>
        <p className="text-sm text-gray-400 mb-10">最終更新日：2026年1月31日</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <p>ウチの子（以下「当社」）は、アプリ「ウチの子」（以下「本サービス」）における個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-3">収集する情報</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">1. アカウント情報</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>メールアドレス</li>
                  <li>パスワード（暗号化して保存）</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">2. 店舗オーナー情報</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>店舗名、電話番号、メールアドレス</li>
                  <li>営業時間、定休日</li>
                  <li>店舗写真</li>
                  <li>Stripe連携情報（決済のため）</li>
                  <li>動物取扱業登録証（ライセンス審査のため）</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">3. 来店犬・カルテ情報</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>犬の名前、犬種、体重、性別</li>
                  <li>飼い主名、電話番号</li>
                  <li>来店メモ（日付・テキスト）</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">4. 予約・決済情報</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>予約日時、サービス内容</li>
                  <li>決済状況（Stripe経由）</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-3">利用目的</h2>
            <p className="mb-2">収集した情報は以下の目的で利用します。</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>アカウントの作成・認証</li>
              <li>店舗情報の掲載・管理</li>
              <li>予約・決済の処理</li>
              <li>カルテ機能の提供</li>
              <li>ライセンス審査</li>
              <li>お問い合わせへの対応</li>
              <li>サービスの改善</li>
            </ol>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-3">第三者への提供</h2>
            <p className="mb-2">以下の場合に、必要な情報を提供します。</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li><span className="font-semibold text-gray-800">決済処理</span>：Stripe社に決済に必要な情報を提供します</li>
              <li><span className="font-semibold text-gray-800">法令に基づく場合</span>：法的要請があった場合</li>
            </ol>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-3">利用する外部サービス</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 border border-gray-200">サービス</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 border border-gray-200">提供元</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 border border-gray-200">用途</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr>
                    <td className="px-3 py-2 border border-gray-200">Firebase Authentication</td>
                    <td className="px-3 py-2 border border-gray-200">Google</td>
                    <td className="px-3 py-2 border border-gray-200">ユーザー認証</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200">Cloud Firestore</td>
                    <td className="px-3 py-2 border border-gray-200">Google</td>
                    <td className="px-3 py-2 border border-gray-200">データベース</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-gray-200">Cloud Storage</td>
                    <td className="px-3 py-2 border border-gray-200">Google</td>
                    <td className="px-3 py-2 border border-gray-200">写真の保存</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200">Stripe</td>
                    <td className="px-3 py-2 border border-gray-200">Stripe, Inc.</td>
                    <td className="px-3 py-2 border border-gray-200">決済処理</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1 text-gray-600">
              <p>各サービスのプライバシーポリシー：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Google：<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">https://policies.google.com/privacy</a></li>
                <li>Stripe：<a href="https://stripe.com/jp/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">https://stripe.com/jp/privacy</a></li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">データの保存場所</h2>
            <p className="text-gray-600">データはGoogle Cloud（Firebase）のサーバーに保存されます。サーバーは日本国外に所在する場合があります。</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">データの保持期間</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>アカウント削除により、関連するデータは削除されます</li>
              <li>法令で保存が義務付けられている情報は、必要な期間保持します</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">プライバシーポリシーの変更</h2>
            <p className="text-gray-600">本ポリシーは予告なく変更される場合があります。重要な変更がある場合は、サービス内でお知らせします。</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">お問い合わせ</h2>
            <div className="text-gray-600 space-y-1">
              <p>事業者名：ウチの子</p>
              <p>メールアドレス：<a href="mailto:calderonjunya0602@gmail.com" className="text-orange-500 hover:underline">calderonjunya0602@gmail.com</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
