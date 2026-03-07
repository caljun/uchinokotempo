import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'

const ROWS = [
  { label: '販売事業者', value: 'ウチの子' },
  { label: '運営統括責任者', value: 'カルデロン純矢' },
  { label: '所在地', value: '〒561-0804 大阪府豊中市曽根南町1丁目5-26' },
  { label: '電話番号', value: '080-9875-1388' },
  {
    label: 'メールアドレス',
    value: <a href="mailto:calderonjunya0602@gmail.com" className="text-orange-500 hover:underline">calderonjunya0602@gmail.com</a>,
  },
  {
    label: '販売URL',
    value: <a href="https://web-uchinoko.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">web-uchinoko.vercel.app</a>,
  },
  {
    label: '事業内容',
    value: '犬向けサービス（しつけ教室・ホテル・トリミング・病院・イベント等）の予約仲介および犬関連商品の販売仲介プラットフォームの運営',
  },
  { label: '販売価格', value: '各サービス・商品の詳細ページに表示' },
  {
    label: '商品代金以外の必要料金',
    value: 'インターネット接続にかかる通信料（お客様負担）',
  },
  {
    label: '支払い方法',
    value: 'クレジットカード（VISA、MasterCard、American Express、JCB）※Stripe決済を利用',
  },
  {
    label: '支払い時期',
    value: (
      <ul className="space-y-1">
        <li>サービス予約：予約確定時</li>
        <li>商品購入：注文確定時</li>
      </ul>
    ),
  },
  {
    label: 'サービス提供時期',
    value: (
      <ul className="space-y-1">
        <li>サービス予約：予約日当日</li>
        <li>商品購入：各店舗の発送スケジュールに準じる</li>
      </ul>
    ),
  },
  {
    label: '返品・キャンセルについて',
    value: 'サービスの性質上、原則として返品・キャンセルはお受けしておりません。商品に瑕疵があった場合は、到着後7日以内にご連絡ください。',
  },
  {
    label: '返金について',
    value: '商品の瑕疵が認められた場合に限り、全額返金いたします。',
  },
  {
    label: '動作環境',
    value: 'iOS 16以降 / 最新のWebブラウザ',
  },
]

export default function CommercialPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="特定商取引法に基づく表記" />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <p className="text-sm text-gray-400 mb-8">最終更新日：2026年1月31日</p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {ROWS.map((row, i) => (
            <div
              key={row.label}
              className={`flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-5 py-4 text-sm ${i !== ROWS.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <span className="font-medium text-gray-500 shrink-0 sm:w-44">{row.label}</span>
              <span className="text-gray-800 leading-relaxed">{row.value}</span>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
