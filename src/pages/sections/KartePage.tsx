import { useState } from 'react'
import { Search, X, Plus, Dog, ChevronRight } from 'lucide-react'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'

// ダミーデータ確認用（実データ接続後はfalseに）
const USE_DUMMY = true

interface Memo {
  date: string
  text: string
}

interface VisitingDog {
  id: string
  name: string
  breed: string
  photo?: string
  age?: number
  gender?: 'male' | 'female'
  ownerName?: string
  visitCount: number
  lastVisitDate: string
  memos: Memo[]
}

// ─── ダミーデータ ─────────────────────────────────────────────
const DUMMY_DOGS: VisitingDog[] = [
  {
    id: 'd1',
    name: 'ポチ',
    breed: 'トイプードル',
    age: 3,
    gender: 'male',
    ownerName: '田中 太郎',
    visitCount: 5,
    lastVisitDate: '2026-03-02',
    memos: [
      { date: '2026-03-02', text: 'シャンプー・カット完了。毛並み良好。次回は4週間後を推奨。' },
      { date: '2026-02-01', text: '耳の汚れが少しあったためクリーニング。本人はとても元気。' },
    ],
  },
  {
    id: 'd2',
    name: 'さくら',
    breed: '柴犬',
    age: 2,
    gender: 'female',
    ownerName: '山田 花子',
    visitCount: 2,
    lastVisitDate: '2026-03-02',
    memos: [
      { date: '2026-03-02', text: '初めてのトリミング。少し緊張気味だったが最後は落ち着いた。' },
    ],
  },
  {
    id: 'd3',
    name: 'まる',
    breed: 'チワワ',
    age: 5,
    gender: 'male',
    ownerName: '鈴木 次郎',
    visitCount: 8,
    lastVisitDate: '2026-02-20',
    memos: [
      { date: '2026-02-20', text: '体重2.1kg。前回より少し増加。食事量の見直しを飼い主に提案。' },
      { date: '2026-01-18', text: '爪切り・耳掃除のみ。元気。' },
      { date: '2025-12-10', text: '年末ケア。全身カット。とても良い子。' },
    ],
  },
  {
    id: 'd4',
    name: 'ハナ',
    breed: 'ポメラニアン',
    age: 4,
    gender: 'female',
    ownerName: '佐藤 美咲',
    visitCount: 3,
    lastVisitDate: '2026-01-15',
    memos: [
      { date: '2026-01-15', text: '毛量が多く念入りにブラッシング。次回は2週間後推奨。' },
    ],
  },
]
// ────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

const genderLabel = (g?: 'male' | 'female') =>
  g === 'male' ? 'オス' : g === 'female' ? 'メス' : '-'

// ─── 犬カード ─────────────────────────────────────────────────
function DogCard({ dog, onClick }: { dog: VisitingDog; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
    >
      {dog.photo
        ? <img src={dog.photo} alt={dog.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
        : <div className="w-14 h-14 rounded-full bg-orange-50 shrink-0 flex items-center justify-center text-2xl">🐕</div>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-bold text-gray-900">{dog.name}</p>
          <p className="text-xs text-gray-400">{dog.breed}</p>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{dog.ownerName}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-gray-500">来店 <span className="font-bold text-gray-800">{dog.visitCount}</span>回</span>
          <span className="text-xs text-gray-400">最終: {formatDate(dog.lastVisitDate)}</span>
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </button>
  )
}

// ─── 犬詳細モーダル ───────────────────────────────────────────
function DogDetailModal({ dog, onClose }: { dog: VisitingDog; onClose: () => void }) {
  const [newMemo, setNewMemo] = useState('')
  const [memos, setMemos] = useState<Memo[]>(dog.memos)
  const [addingMemo, setAddingMemo] = useState(false)

  const handleAddMemo = () => {
    if (!newMemo.trim()) return
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setMemos([{ date: dateStr, text: newMemo.trim() }, ...memos])
    setNewMemo('')
    setAddingMemo(false)
    // TODO: Firestore保存
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900">カルテ</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* 犬の基本情報 */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
            {dog.photo
              ? <img src={dog.photo} alt={dog.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
              : <div className="w-16 h-16 rounded-full bg-orange-50 shrink-0 flex items-center justify-center text-2xl">🐕</div>
            }
            <div>
              <p className="text-lg font-bold text-gray-900">{dog.name}</p>
              <p className="text-xs text-gray-400">{dog.breed}　{dog.age != null ? `${dog.age}歳` : ''}　{genderLabel(dog.gender)}</p>
              {dog.ownerName && <p className="text-xs text-gray-400 mt-0.5">飼い主: {dog.ownerName}</p>}
            </div>
          </div>

          {/* 来店サマリー */}
          <div className="flex divide-x divide-gray-100 border-b border-gray-50">
            <div className="flex-1 py-3 text-center">
              <p className="text-xl font-bold text-gray-900">{dog.visitCount}</p>
              <p className="text-xs text-gray-400">来店回数</p>
            </div>
            <div className="flex-1 py-3 text-center">
              <p className="text-sm font-bold text-gray-900">{formatDate(dog.lastVisitDate)}</p>
              <p className="text-xs text-gray-400">最終来店</p>
            </div>
          </div>

          {/* メモセクション */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">メモ</p>
              <button
                onClick={() => setAddingMemo(v => !v)}
                className="flex items-center gap-1 text-xs font-bold text-[#FF8F0D] hover:text-[#E67D0B]"
              >
                <Plus size={13} />追加
              </button>
            </div>

            {/* メモ入力欄 */}
            {addingMemo && (
              <div className="bg-orange-50 rounded-xl p-3 space-y-2">
                <p className="text-xs text-gray-400">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <textarea
                  value={newMemo}
                  onChange={e => setNewMemo(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="施術内容・気になったことなど"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAddingMemo(false); setNewMemo('') }}
                    className="flex-1 py-2 rounded-lg text-xs text-gray-500 border border-gray-200"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddMemo}
                    disabled={!newMemo.trim()}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-[#FF8F0D] text-white disabled:opacity-40"
                  >
                    保存
                  </button>
                </div>
              </div>
            )}

            {/* メモ一覧 */}
            {memos.length === 0 ? (
              <p className="text-xs text-gray-300 text-center py-6">メモはありません</p>
            ) : (
              <div className="space-y-2">
                {memos.map((m, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">{formatDate(m.date)}</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
// ────────────────────────────────────────────────────────────

export default function KartePage() {
  const [search, setSearch] = useState('')
  const [selectedDog, setSelectedDog] = useState<VisitingDog | null>(null)

  const dogs = USE_DUMMY ? DUMMY_DOGS : []

  const filtered = dogs.filter(d =>
    d.name.includes(search) || d.breed.includes(search) || (d.ownerName ?? '').includes(search)
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="カルテ" />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full pb-8 space-y-3">

        {USE_DUMMY && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <p className="text-xs text-amber-700">ダミーデータ表示中</p>
          </div>
        )}

        {/* 検索 */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="名前・犬種・飼い主で検索"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={14} />
            </button>
          )}
        </div>

        {/* リスト */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center gap-3 text-center">
            <Dog size={40} strokeWidth={1.2} className="text-gray-300" />
            <p className="text-sm text-gray-400">
              {search ? '該当する来店犬がいません' : '来店犬がまだいません'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(dog => (
              <DogCard key={dog.id} dog={dog} onClick={() => setSelectedDog(dog)} />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {selectedDog && (
        <DogDetailModal dog={selectedDog} onClose={() => setSelectedDog(null)} />
      )}
    </div>
  )
}
