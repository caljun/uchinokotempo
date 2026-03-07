import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="利用規約" />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <p className="text-sm text-gray-400 mb-10">最終更新日：2026年1月31日</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-gray-900 mb-2">第1条（適用）</h2>
            <p>本規約は、ウチの子（以下「当社」）が提供するアプリ「ウチの子」（以下「本サービス」）の利用条件を定めるものです。ユーザーは本規約に同意の上、本サービスをご利用ください。</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">第2条（サービス内容）</h2>
            <p className="mb-2">本サービスは以下の機能を提供します。</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>飼い主が犬の情報を登録し、診断結果を取得する機能</li>
              <li>登録情報に基づく店舗・商品のレコメンド機能</li>
              <li>店舗へのサービス予約機能</li>
              <li>商品の購入機能</li>
              <li>日記の作成・共有機能</li>
              <li>店舗向けの管理機能（Webアプリ）</li>
            </ol>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">第3条（アカウント登録）</h2>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>ユーザーは正確な情報を登録するものとします。</li>
              <li>アカウントの管理責任はユーザーにあります。</li>
              <li>アカウントの第三者への譲渡・貸与は禁止します。</li>
            </ol>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">第4条（決済）</h2>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>本サービス内の決済はStripe社の決済システムを利用します。</li>
              <li>商品購入時には商品代金の10%、サービス予約時には代金の20%がプラットフォーム手数料として発生します。</li>
              <li>決済に関するトラブルは、当該店舗とユーザー間で解決するものとします。</li>
              <li>返金・キャンセルポリシーは各店舗の規定に従います。</li>
            </ol>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">第5条（店舗の責任）</h2>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>店舗は、特定商取引法に基づく表記を自ら行う義務があります。</li>
              <li>店舗は、動物取扱業の登録が必要な場合、適切な登録を行うものとします。</li>
              <li>商品・サービスの品質については、各店舗が責任を負います。</li>
            </ol>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">第6条（禁止事項）</h2>
            <p className="mb-2">以下の行為を禁止します。</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>虚偽の情報を登録する行為</li>
              <li>他のユーザーまたは店舗に迷惑をかける行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>不正アクセス、リバースエンジニアリング</li>
              <li>法令または公序良俗に違反する行為</li>
              <li>動物虐待につながる行為</li>
            </ol>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">第7条（サービスの変更・停止）</h2>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>当社は、事前の通知なくサービス内容を変更できます。</li>
              <li>システム障害、メンテナンス等によりサービスを一時停止する場合があります。</li>
            </ol>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">第8条（アカウント停止）</h2>
            <p>本規約に違反した場合、当社はアカウントを停止または削除できます。</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">第9条（免責事項）</h2>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>当社は、ユーザーと店舗間の取引について一切の責任を負いません。</li>
              <li>本サービスの利用により生じた損害について、当社の故意または重過失による場合を除き、責任を負いません。</li>
              <li>推奨される店舗・商品の適合性を保証するものではありません。</li>
            </ol>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">第10条（知的財産権）</h2>
            <p>本サービスに関する著作権、商標権その他の知的財産権は当社に帰属します。</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">第11条（準拠法・管轄裁判所）</h2>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>本規約は日本法に準拠します。</li>
              <li>紛争が生じた場合、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</li>
            </ol>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">第12条（お問い合わせ）</h2>
            <p className="mb-2">本サービスに関するお問い合わせは下記までご連絡ください。</p>
            <div className="text-gray-600 space-y-1">
              <p>事業者名：ウチの子</p>
              <p>メールアドレス：<a href="mailto:calderonjunya0602@gmail.com" className="text-orange-500 hover:underline">calderonjunya0602@gmail.com</a></p>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  )
}
