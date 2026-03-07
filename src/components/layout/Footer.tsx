export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} uchinoko Inc. All rights reserved.</p>
        <div className="flex items-center gap-5">
          <a href="mailto:support@uchinoko.jp" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            サポート
          </a>
          <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            利用規約
          </a>
          <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            プライバシーポリシー
          </a>
        </div>
      </div>
    </footer>
  )
}
