import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, X, Plus, Trash2, Store, User, Pencil } from 'lucide-react'
import {
  doc, getDoc, updateDoc, deleteField, serverTimestamp,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, app, storage } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DogMemo {
  text: string
}

interface VisitingDogData {
  displayName: string
  displayBreed?: string
  displayPhoto?: string
  ownerName?: string
  ownerPhone?: string
  memos: Record<string, DogMemo>
  ownerId?: string
  isManual: boolean
}

interface FullDogData {
  name?: string
  breed?: string
  photoUrl?: string
  gender?: string
  neutered?: boolean
  weight?: number
  temperamentType?: string
  difficultyRank?: string
  difficultyDescription?: string
}

interface LocationState {
  visitCount?: number
  lastVisitDate?: string | null
  displayName?: string
  displayBreed?: string
  displayPhoto?: string
  ownerName?: string
  ownerPhone?: string
  isManual?: boolean
  ownerId?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const pad = (n: number) => String(n).padStart(2, '0')

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 gap-3">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">{value}</span>
    </div>
  )
}

// ─── BasicInfoTab ─────────────────────────────────────────────────────────────

function BasicInfoTab({
  dog,
  fullDog,
  loading,
  visitCount,
  lastVisitDate,
}: {
  dog: VisitingDogData
  fullDog: FullDogData | null
  loading: boolean
  visitCount: number
  lastVisitDate: string | null
}) {
  const data = fullDog ?? {}
  const name = data.name ?? dog.displayName
  const breed = data.breed ?? dog.displayBreed
  const photo = data.photoUrl ?? dog.displayPhoto

  const genderLabel = (g?: string, n?: boolean): string | null => {
    if (!g) return null
    const base = g === 'male' ? 'オス' : 'メス'
    return n == null ? base : `${base}（${n ? '去勢/避妊済み' : '未去勢/未避妊'}）`
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">読み込み中...</div>
  }

  const gl = genderLabel(data.gender, data.neutered)

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-4">
        {photo
          ? <img src={photo} alt={name} className="w-20 h-20 rounded-full object-cover shrink-0" />
          : <div className="w-20 h-20 rounded-full bg-orange-50 shrink-0 flex items-center justify-center text-3xl">🐕</div>
        }
        <div>
          <p className="text-lg font-bold text-gray-900">{name}</p>
          {breed && <p className="text-xs text-gray-400">{breed}</p>}
          <div className="flex gap-3 mt-1.5">
            <span className="text-xs text-gray-500">来店 <span className="font-bold text-gray-800">{visitCount}</span>回</span>
            {lastVisitDate && (
              <span className="text-xs text-gray-400">最終: {formatDateLabel(lastVisitDate)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
        {gl && <Row label="性別" value={gl} />}
        {data.weight != null && <Row label="体重" value={`${data.weight}kg`} />}
        {dog.ownerName && <Row label="飼い主" value={dog.ownerName} />}
        {dog.ownerPhone && <Row label="電話" value={dog.ownerPhone} />}
      </div>

      {(data.temperamentType || data.difficultyRank) && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">診断</p>
          <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
            {data.temperamentType && <Row label="性格タイプ" value={data.temperamentType} />}
            {data.difficultyRank && (
              <Row label="難易度" value={
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  data.difficultyRank === 'A' ? 'bg-green-50 text-green-600' :
                  data.difficultyRank === 'B' ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-500'
                }`}>{data.difficultyRank}</span>
              } />
            )}
            {data.difficultyDescription && (
              <div className="px-3 py-2.5">
                <p className="text-xs text-gray-400 mb-1">診断結果</p>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{data.difficultyDescription}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {dog.isManual && (
        <p className="text-xs text-gray-300 text-center">手動追加された来店犬です</p>
      )}
    </div>
  )
}

// ─── CalendarMemoTab（連絡帳） ─────────────────────────────────────────────────

function CalendarMemoTab({
  memos,
  onSaveMemo,
}: {
  memos: Record<string, DogMemo>
  onSaveMemo: (dateStr: string, text: string) => Promise<void>
}) {
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [editDate, setEditDate] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [deletingDate, setDeletingDate] = useState<string | null>(null)

  const firstDow = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const openEdit = (dateStr: string) => {
    setEditDate(dateStr)
    setEditText(memos[dateStr]?.text ?? '')
  }

  const handleSave = async () => {
    if (!editDate) return
    setSaving(true)
    try {
      await onSaveMemo(editDate, editText)
      setEditDate(null)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (dateStr: string) => {
    setDeletingDate(dateStr)
    try {
      await onSaveMemo(dateStr, '')
      setExpandedDate(null)
    } finally {
      setDeletingDate(null)
    }
  }

  const sortedMemos = Object.entries(memos).sort(([a], [b]) => b.localeCompare(a))

  return (
    <div className="p-4 space-y-4">

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-gray-900">{calYear}年{calMonth + 1}月</span>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={`text-center text-xs font-medium py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`e${i}`} className="min-h-[52px] border-b border-r border-gray-50" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dow = (firstDow + i) % 7
            const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`
            const hasMemo = !!memos[dateStr]
            const isToday = dateStr === todayStr
            const isLastCol = (firstDow + i + 1) % 7 === 0
            return (
              <button
                key={dateStr}
                onClick={() => openEdit(dateStr)}
                className={`relative min-h-[52px] border-b border-r border-gray-50 p-1.5 flex flex-col items-center transition-colors
                  ${isLastCol ? 'border-r-0' : ''}
                  ${hasMemo ? 'bg-orange-50/60 hover:bg-orange-100/60' : 'hover:bg-orange-50/40'}`}
              >
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-0.5
                  ${isToday ? 'bg-[#FF8F0D] text-white' : dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-800'}`}>
                  {day}
                </span>
                {hasMemo && <span className="w-1.5 h-1.5 rounded-full bg-[#FF8F0D]" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Memo accordion list */}
      {sortedMemos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">連絡帳一覧</p>
          {sortedMemos.map(([dateStr, memo]) => {
            const isOpen = expandedDate === dateStr
            return (
              <div key={dateStr} className="bg-gray-50 rounded-xl overflow-hidden">
                {/* Header row — tap to expand/collapse */}
                <button
                  onClick={() => setExpandedDate(isOpen ? null : dateStr)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100/60 transition-colors"
                >
                  <span className="text-xs font-medium text-gray-700">{formatDateLabel(dateStr)}</span>
                  <ChevronDown
                    size={15}
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-4 pb-3 space-y-3 border-t border-gray-100">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pt-3">{memo.text}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(dateStr)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Pencil size={12} />
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(dateStr)}
                        disabled={deletingDate === dateStr}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        {deletingDate === dateStr ? '削除中...' : '削除'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Memo edit modal */}
      {editDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditDate(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">{formatDateLabel(editDate)}</p>
              <button onClick={() => setEditDate(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="施術内容・気になったことなど"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditDate(null)}
                className="flex-1 py-2.5 rounded-full text-sm border border-gray-200 text-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-full text-sm font-bold bg-[#FF8F0D] text-white disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DiaryTab（日記） ──────────────────────────────────────────────────────────

interface ShopDiary {
  id: string
  photos: string[]
  comment: string
  createdAt: string | null
  createdBy?: {
    type: 'owner' | 'shop'
    id: string
    name: string
  }
}

function formatDiaryDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

// ─── Diary Create Modal ───────────────────────────────────────────────────────

function DiaryCreateModal({
  shopId,
  ownerId,
  dogId,
  onClose,
  onCreated,
}: {
  shopId: string
  ownerId: string
  dogId: string
  onClose: () => void
  onCreated: (diary: ShopDiary) => void
}) {
  const [comment, setComment] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const remaining = 3 - photoFiles.length
    const added = files.slice(0, remaining)
    setPhotoFiles(prev => [...prev, ...added])
    setPreviews(prev => [...prev, ...added.map(f => URL.createObjectURL(f))])
  }

  const removePhoto = (i: number) => {
    setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSave = async () => {
    if (!comment.trim()) { setError('コメントを入力してください'); return }
    setSaving(true)
    setError('')
    try {
      // 写真を Storage にアップロード
      const uuid = crypto.randomUUID()
      const uploadedUrls: string[] = []
      for (let i = 0; i < photoFiles.length; i++) {
        const storageRef = ref(storage, `shops/${shopId}/diary_photos/${dogId}/${uuid}/photo_${i}.jpg`)
        await uploadBytes(storageRef, photoFiles[i])
        const url = await getDownloadURL(storageRef)
        uploadedUrls.push(url)
      }

      const fn = httpsCallable(getFunctions(app, 'us-central1'), 'createShopDiary')
      const res = await fn({ shopId, ownerId, dogId, comment: comment.trim(), photoUrls: uploadedUrls })
      const { diaryId } = res.data as { diaryId: string }

      onCreated({
        id: diaryId,
        photos: uploadedUrls,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        createdBy: { type: 'shop', id: shopId, name: '店舗' },
      })
      onClose()
    } catch (e) {
      setError('保存に失敗しました')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">日記を書く</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* 写真 */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">写真（最大3枚）</p>
          <div className="flex gap-2 flex-wrap">
            {previews.map((src, i) => (
              <div key={i} className="relative w-20 h-20">
                <img src={src} alt="" className="w-20 h-20 object-cover rounded-xl" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {photoFiles.length < 3 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50"
              >
                <Plus size={20} />
                <span className="text-xs mt-0.5">追加</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
          </div>
        </div>

        {/* コメント */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">コメント *</p>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 200))}
            rows={4}
            placeholder="今日の様子を記録しましょう..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
            autoFocus
          />
          <p className="text-xs text-gray-400 text-right">{comment.length}/200</p>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full text-sm border border-gray-200 text-gray-600">
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !comment.trim()}
            className="flex-1 py-2.5 rounded-full text-sm font-bold bg-[#FF8F0D] text-white disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DiaryTab ─────────────────────────────────────────────────────────────────

function DiaryTab({
  shopId,
  ownerId,
  dogId,
}: {
  shopId: string
  ownerId: string | undefined
  dogId: string
}) {
  const [diaries, setDiaries] = useState<ShopDiary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDiary, setSelectedDiary] = useState<ShopDiary | null>(null)

  useEffect(() => {
    if (!ownerId) { setLoading(false); return }
    setLoading(true)
    const fn = httpsCallable(getFunctions(app, 'us-central1'), 'getDiariesForShop')
    fn({ shopId, ownerId, dogId })
      .then(res => {
        const { diaries: list } = res.data as { diaries: ShopDiary[] }
        setDiaries(list)
      })
      .catch(e => { console.error(e); setError('日記の読み込みに失敗しました') })
      .finally(() => setLoading(false))
  }, [shopId, ownerId, dogId])

  if (!ownerId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center px-6">
        <p className="text-sm text-gray-400">手動追加された来店犬は日記機能を利用できません</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#FF8F0D] text-white rounded-xl text-sm font-bold"
        >
          <Plus size={14} />
          日記を書く
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">読み込み中...</div>
      ) : error ? (
        <div className="bg-red-50 rounded-xl p-4 text-xs text-red-600">{error}</div>
      ) : diaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-sm text-gray-400">まだ日記がありません</p>
          <p className="text-xs text-gray-300">飼い主・店舗どちらでも書き込めます</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {diaries.map(diary => (
            <button
              key={diary.id}
              onClick={() => setSelectedDiary(diary)}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 text-left hover:border-orange-200 transition-colors"
            >
              <div className="w-full aspect-[3/4] bg-gray-100 relative overflow-hidden">
                {diary.photos[0]
                  ? <img src={diary.photos[0]} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl">📔</div>
                }
                {/* author badge */}
                <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  diary.createdBy?.type === 'shop'
                    ? 'bg-[#FF8F0D] text-white'
                    : 'bg-white/90 text-gray-700'
                }`}>
                  {diary.createdBy?.type === 'shop'
                    ? <><Store size={10} />店舗</>
                    : <><User size={10} />飼い主</>
                  }
                </div>
              </div>
              <div className="p-2.5">
                {diary.createdAt && <p className="text-[10px] text-gray-400 mb-1">{formatDiaryDate(diary.createdAt)}</p>}
                <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{diary.comment}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && ownerId && (
        <DiaryCreateModal
          shopId={shopId}
          ownerId={ownerId}
          dogId={dogId}
          onClose={() => setShowCreate(false)}
          onCreated={diary => {
            setDiaries(prev => [diary, ...prev])
            setShowCreate(false)
          }}
        />
      )}

      {/* 日記詳細モーダル */}
      {selectedDiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedDiary(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  selectedDiary.createdBy?.type === 'shop' ? 'bg-orange-100 text-[#FF8F0D]' : 'bg-gray-100 text-gray-600'
                }`}>
                  {selectedDiary.createdBy?.type === 'shop'
                    ? <><Store size={11} />{selectedDiary.createdBy.name}</>
                    : <><User size={11} />飼い主</>
                  }
                </span>
                {selectedDiary.createdAt && (
                  <p className="text-xs text-gray-400">{formatDiaryDate(selectedDiary.createdAt)}</p>
                )}
              </div>
              <button onClick={() => setSelectedDiary(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {selectedDiary.photos.length > 0 && (
                <div className="flex gap-1 p-2">
                  {selectedDiary.photos.map((url, i) => (
                    <img key={i} src={url} alt="" className="flex-1 aspect-square object-cover rounded-xl" />
                  ))}
                </div>
              )}
              <div className="px-4 py-3">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{selectedDiary.comment}</p>
              </div>
              {/* 自店の日記は削除可能 */}
              {selectedDiary.createdBy?.type === 'shop' && selectedDiary.createdBy.id === shopId && (
                <div className="px-4 pb-4">
                  <button
                    onClick={async () => {
                      if (!confirm('この日記を削除しますか？')) return
                      try {
                        const fn = httpsCallable(getFunctions(app, 'us-central1'), 'deleteShopDiary')
                        await fn({ shopId, ownerId, dogId, diaryId: selectedDiary.id })
                        setDiaries(prev => prev.filter(d => d.id !== selectedDiary.id))
                        setSelectedDiary(null)
                      } catch (e) {
                        console.error(e)
                        alert('削除に失敗しました')
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                    削除
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'info' | 'renrakucho' | 'diary'

const TABS: { key: Tab; label: string }[] = [
  { key: 'info', label: '基本情報' },
  { key: 'renrakucho', label: '連絡帳' },
  { key: 'diary', label: '日記' },
]

export default function KarteDetailPage() {
  const { dogId } = useParams<{ dogId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState | null }
  const { shop } = useAuth()

  // Eagerly initialize from navigation state so UI shows immediately
  const [dog, setDog] = useState<VisitingDogData | null>(() => {
    if (!state) return null
    return {
      displayName: state.displayName ?? '...',
      displayBreed: state.displayBreed,
      displayPhoto: state.displayPhoto,
      ownerName: state.ownerName,
      ownerPhone: state.ownerPhone,
      memos: {},
      ownerId: state.ownerId,
      isManual: state.isManual ?? false,
    }
  })
  const [fullDog, setFullDog] = useState<FullDogData | null>(null)
  const [loadingDog, setLoadingDog] = useState(!state?.isManual && !!state?.ownerId)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('info')

  const visitCount = state?.visitCount ?? 0
  const lastVisitDate = state?.lastVisitDate ?? null

  // Load visitingDog doc AND full dog data in parallel
  useEffect(() => {
    if (!shop || !dogId) return
    setLoading(true)

    const ownerIdFromState = state?.ownerId
    const isManualFromState = state?.isManual ?? false

    // Parallel: visitingDog doc + getDogForShop CF (if applicable)
    const visitingDogPromise = getDoc(doc(db, 'shops', shop.shopId, 'visitingDogs', dogId))
      .then(snap => {
        if (!snap.exists()) { navigate('/home/karte', { replace: true }); return }
        const data = snap.data()
        setDog({
          displayName: (data.name ?? state?.displayName) as string ?? '名前未設定',
          displayBreed: (data.breed ?? state?.displayBreed) as string | undefined,
          displayPhoto: (data.photoUrl ?? state?.displayPhoto) as string | undefined,
          ownerName: data.ownerName as string | undefined,
          ownerPhone: data.ownerPhone as string | undefined,
          memos: (data.memos ?? {}) as Record<string, DogMemo>,
          ownerId: data.ownerId as string | undefined,
          isManual: !!data.isManual,
        })
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))

    // Start getDogForShop immediately using state ownerId (no need to wait for visitingDog)
    if (!isManualFromState && ownerIdFromState) {
      setLoadingDog(true)
      const fn = httpsCallable(getFunctions(app, 'us-central1'), 'getDogForShop')
      fn({ shopId: shop.shopId, dogId, type: 'visitingDogs' })
        .then(res => {
          const data = res.data as { dogData: FullDogData }
          setFullDog(data.dogData)
        })
        .catch(err => console.warn('getDogForShop:', err))
        .finally(() => setLoadingDog(false))
    }

    return () => { void visitingDogPromise }
  }, [shop, dogId]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveMemo = async (dateStr: string, text: string) => {
    if (!shop || !dogId || !dog) return
    const docRef = doc(db, 'shops', shop.shopId, 'visitingDogs', dogId)
    if (text.trim()) {
      await updateDoc(docRef, {
        [`memos.${dateStr}`]: { text: text.trim() },
        updatedAt: serverTimestamp(),
      })
    } else {
      await updateDoc(docRef, {
        [`memos.${dateStr}`]: deleteField(),
        updatedAt: serverTimestamp(),
      })
    }
    setDog(prev => {
      if (!prev) return prev
      const memos = { ...prev.memos }
      if (text.trim()) memos[dateStr] = { text: text.trim() }
      else delete memos[dateStr]
      return { ...prev, memos }
    })
  }

  const displayName = dog?.displayName ?? state?.displayName ?? '...'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        showBack
        backPath="/home/karte"
        title={`${displayName}のカルテ`}
      />

      {loading ? (
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">読み込み中...</p>
        </main>
      ) : !dog ? null : (
        <main className="flex-1 max-w-2xl mx-auto w-full flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-white shrink-0">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === t.key ? 'text-[#FF8F0D] border-b-2 border-[#FF8F0D]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pb-8">
            {tab === 'info' && (
              <BasicInfoTab dog={dog} fullDog={fullDog} loading={loadingDog} visitCount={visitCount} lastVisitDate={lastVisitDate} />
            )}
            {tab === 'renrakucho' && (
              <CalendarMemoTab memos={dog.memos} onSaveMemo={saveMemo} />
            )}
            {tab === 'diary' && (
              <DiaryTab shopId={shop!.shopId} ownerId={dog.ownerId} dogId={dogId!} />
            )}
          </div>
        </main>
      )}

      <Footer />
    </div>
  )
}
