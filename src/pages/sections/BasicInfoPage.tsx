import { useState, useEffect, useRef } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { ImagePlus, X } from 'lucide-react'
import { storage } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'

const CATEGORIES = [
  { value: 'training', label: 'しつけ教室' },
  { value: 'hotel', label: 'ホテル' },
  { value: 'trimming', label: 'トリミング' },
  { value: 'hospital', label: '病院' },
  { value: 'products', label: '商品・物販' },
  { value: 'event', label: 'サービス・イベント' },
]
const DIFFICULTY = [
  { value: 'A', label: 'A: 環境に順応しやすい犬' },
  { value: 'B', label: 'B: 一般的な犬' },
  { value: 'C', label: 'C: 慎重な対応が必要な犬' },
]
const SIZES = [
  { value: '小型', label: '小型' },
  { value: '中型', label: '中型' },
  { value: '大型', label: '大型' },
]
const AGES = [
  { value: 'パピー期', label: 'パピー期（0歳）' },
  { value: '成犬期', label: '成犬期（1〜6歳）' },
  { value: 'シニア期', label: 'シニア期（7歳〜）' },
]
const DAYS = ['月', '火', '水', '木', '金', '土', '日']

const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const total = 360 + i * 30
  const h = Math.floor(total / 60).toString().padStart(2, '0')
  const m = (total % 60).toString().padStart(2, '0')
  return `${h}:${m}`
})

function parseOpenHours(openHoursDisplay?: string): { openTime: string; closeTime: string } {
  if (!openHoursDisplay) return { openTime: '10:00', closeTime: '18:00' }
  const parts = openHoursDisplay.split('〜')
  if (parts.length === 2 && TIME_OPTIONS.includes(parts[0]) && TIME_OPTIONS.includes(parts[1])) {
    return { openTime: parts[0], closeTime: parts[1] }
  }
  return { openTime: '10:00', closeTime: '18:00' }
}

function parseHoliday(holiday?: string): string[] {
  if (!holiday || holiday === 'なし') return []
  return holiday.replace('曜日', '').split('・').filter(d => DAYS.includes(d))
}

interface FormState {
  name: string
  address: string
  openTime: string
  closeTime: string
  holiday: string[]
  phone: string
  email: string
  description: string
  categories: string[]
  acceptedDifficulty: string[]
  acceptedSizes: string[]
  acceptedAges: string[]
  snsInstagram: string
  snsX: string
  snsYoutube: string
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
    >
      {TIME_OPTIONS.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  )
}

function DayToggle({ selected, onChange }: { selected: string[]; onChange: (days: string[]) => void }) {
  const toggle = (day: string) => {
    onChange(selected.includes(day) ? selected.filter(d => d !== day) : [...selected, day])
  }
  return (
    <div className="flex gap-2 flex-wrap">
      {DAYS.map(day => {
        const active = selected.includes(day)
        const isWeekend = day === '土' || day === '日'
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggle(day)}
            className={`w-10 h-10 rounded-full text-sm font-medium transition-all border ${
              active
                ? 'bg-[#FF8F0D] text-white border-[#FF8F0D]'
                : isWeekend
                ? 'bg-white text-red-400 border-gray-200 hover:border-red-300'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {day}
          </button>
        )
      })}
    </div>
  )
}

function CheckGroup({ values, options, onChange }: {
  values: string[]
  options: { value: string; label: string }[]
  onChange: (v: string[]) => void
}) {
  const toggle = (val: string) => {
    onChange(values.includes(val) ? values.filter(v => v !== val) : [...values, val])
  }
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={values.includes(opt.value)}
            onChange={() => toggle(opt.value)}
            className="w-4 h-4 accent-[#FF8F0D]"
          />
          <span className="text-sm text-gray-700">{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-sm font-bold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'

export default function BasicInfoPage() {
  const { shop, updateShop, loading: authLoading } = useAuth()
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !shop) return
    setUploading(true)
    try {
      const newUrls: string[] = []
      for (const file of files) {
        const storageRef = ref(storage, `shops/${shop.shopId}/photos/${Date.now()}_${file.name}`)
        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)
        newUrls.push(url)
      }
      await updateShop({ photoUrls: [...(shop.photoUrls ?? []), ...newUrls] })
    } finally {
      setUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const handlePhotoDelete = async (urlToRemove: string) => {
    if (!shop) return
    await updateShop({ photoUrls: (shop.photoUrls ?? []).filter(u => u !== urlToRemove) })
  }

  useEffect(() => {
    if (!shop) return
    const { openTime, closeTime } = parseOpenHours(shop.openHoursDisplay)
    setForm({
      name: shop.name ?? '',
      address: shop.address ?? '',
      openTime,
      closeTime,
      holiday: parseHoliday(shop.holiday),
      phone: shop.phone ?? '',
      email: shop.email ?? '',
      description: shop.description ?? '',
      categories: shop.categories ?? [],
      acceptedDifficulty: shop.accepted?.difficulty ?? [],
      acceptedSizes: shop.accepted?.sizes ?? [],
      acceptedAges: shop.accepted?.ages ?? [],
      snsInstagram: shop.sns?.instagram ?? '',
      snsX: shop.sns?.x ?? '',
      snsYoutube: shop.sns?.youtube ?? '',
    })
  }, [shop])

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => prev ? { ...prev, [field]: e.target.value } : prev)
  }

  const handleSave = async () => {
    if (!form) return
    if (!form.name || !form.address || !form.email) {
      setError('店舗名・住所・メールアドレスは必須です')
      return
    }
    setSaving(true)
    setError('')
    try {
      const openHoursDisplay = `${form.openTime}〜${form.closeTime}`
      const holiday = form.holiday.length > 0 ? form.holiday.join('・') + '曜日' : 'なし'
      await updateShop({
        name: form.name,
        address: form.address,
        openHoursDisplay,
        holiday,
        phone: form.phone,
        email: form.email,
        description: form.description,
        categories: form.categories,
        accepted: {
          difficulty: form.acceptedDifficulty,
          sizes: form.acceptedSizes,
          ages: form.acceptedAges,
        },
        sns: {
          instagram: form.snsInstagram,
          x: form.snsX,
          youtube: form.snsYoutube,
        },
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('保存に失敗しました。もう一度お試しください')
    } finally {
      setSaving(false)
    }
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header showBack title="基本情報" />
        <main className="flex-1 flex items-center justify-center">
          {!authLoading && !shop
            ? <p className="text-sm text-red-400">店舗データが取得できませんでした</p>
            : <p className="text-sm text-gray-400">読み込み中...</p>
          }
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="基本情報" />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full space-y-4 pb-28">

        {/* 写真管理 */}
        <SectionCard title="店舗写真">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {(shop?.photoUrls ?? []).map(url => (
              <div key={url} className="relative shrink-0 w-32 h-32 rounded-xl overflow-hidden border border-gray-100">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handlePhotoDelete(url)}
                  className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <label className={`shrink-0 w-32 h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${uploading ? 'border-gray-200 text-gray-300' : 'border-gray-300 text-gray-400 hover:border-[#FF8F0D] hover:text-[#FF8F0D]'}`}>
              <ImagePlus size={24} />
              <span className="text-xs">{uploading ? 'アップロード中...' : '写真を追加'}</span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={handlePhotoAdd}
                className="hidden"
              />
            </label>
          </div>
        </SectionCard>

        {/* 受け入れ設定 */}
        <SectionCard title="受け入れ設定">
          <div className="space-y-5">
            <Field label="難易度">
              <CheckGroup
                values={form.acceptedDifficulty}
                options={DIFFICULTY}
                onChange={v => setForm(p => p ? { ...p, acceptedDifficulty: v } : p)}
              />
            </Field>
            <Field label="サイズ">
              <CheckGroup
                values={form.acceptedSizes}
                options={SIZES}
                onChange={v => setForm(p => p ? { ...p, acceptedSizes: v } : p)}
              />
            </Field>
            <Field label="年齢">
              <CheckGroup
                values={form.acceptedAges}
                options={AGES}
                onChange={v => setForm(p => p ? { ...p, acceptedAges: v } : p)}
              />
            </Field>
          </div>
        </SectionCard>

        {/* 基本情報 */}
        <SectionCard title="基本情報">
          <div className="space-y-4">
            <Field label="店舗名" required>
              <input type="text" value={form.name} onChange={set('name')} className={inputClass} placeholder="例：わんにゃんサロン" />
            </Field>

            <Field label="カテゴリ">
              <CheckGroup
                values={form.categories}
                options={CATEGORIES}
                onChange={v => setForm(p => p ? { ...p, categories: v } : p)}
              />
            </Field>

            <Field label="住所" required>
              <input type="text" value={form.address} onChange={set('address')} className={inputClass} placeholder="例：東京都渋谷区..." />
            </Field>

            <Field label="営業時間">
              <div className="flex items-center gap-3">
                <TimeSelect value={form.openTime} onChange={v => setForm(p => p ? { ...p, openTime: v } : p)} />
                <span className="text-gray-400 text-sm">〜</span>
                <TimeSelect value={form.closeTime} onChange={v => setForm(p => p ? { ...p, closeTime: v } : p)} />
              </div>
            </Field>

            <Field label="定休日">
              <DayToggle
                selected={form.holiday}
                onChange={days => setForm(p => p ? { ...p, holiday: days } : p)}
              />
            </Field>

            <Field label="電話番号">
              <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} placeholder="例：03-1234-5678" />
            </Field>

            <Field label="メールアドレス" required>
              <input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="info@shop.com" />
            </Field>

            <Field label="SNS">
              <div className="space-y-2">
                {[
                  { field: 'snsInstagram' as const, label: 'Instagram', placeholder: 'https://instagram.com/...' },
                  { field: 'snsX' as const, label: 'X（旧Twitter）', placeholder: 'https://x.com/...' },
                  { field: 'snsYoutube' as const, label: 'YouTube', placeholder: 'https://youtube.com/...' },
                ].map(({ field, label, placeholder }) => (
                  <div key={field} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
                    <input type="url" value={form[field]} onChange={set(field)} className={inputClass} placeholder={placeholder} />
                  </div>
                ))}
              </div>
            </Field>

            <Field label="店舗説明">
              <textarea value={form.description} onChange={set('description')} rows={5} className={`${inputClass} resize-none`} placeholder="店舗の特徴や雰囲気を教えてください" />
            </Field>
          </div>
        </SectionCard>

      </main>

      {/* 固定保存バー */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-safe-bar flex items-center gap-3 max-w-2xl mx-auto w-full">
        {error && <p className="text-xs text-red-500 flex-1">{error}</p>}
        {saved && <p className="text-xs text-green-600 flex-1">保存しました</p>}
        {!error && !saved && <div className="flex-1" />}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#FF8F0D] hover:bg-[#E67D0B] disabled:opacity-50 text-white font-bold px-8 py-2.5 rounded-full text-sm transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      <Footer />
    </div>
  )
}
