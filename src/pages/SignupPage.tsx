import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PawPrint, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const TOTAL_STEPS = 5

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

// 30分刻みの時間リスト（06:00〜23:30）
const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const total = 360 + i * 30 // 6時間 = 360分 スタート
  const h = Math.floor(total / 60).toString().padStart(2, '0')
  const m = (total % 60).toString().padStart(2, '0')
  return `${h}:${m}`
})

interface FormData {
  email: string
  password: string
  agreedToTerms: boolean
  shopName: string
  address: string
  openTime: string
  closeTime: string
  holiday: string[]
  phone: string
  shopEmail: string
  description: string
  categories: string[]
  acceptedDifficulty: string[]
  acceptedSize: string[]
  acceptedAge: string[]
}

const initialData: FormData = {
  email: '', password: '', agreedToTerms: false,
  shopName: '', address: '', openTime: '10:00', closeTime: '18:00',
  holiday: [],
  phone: '', shopEmail: '', description: '',
  categories: [],
  acceptedDifficulty: [], acceptedSize: [], acceptedAge: [],
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              i + 1 < step
                ? 'bg-[#FF8F0D] text-white'
                : i + 1 === step
                ? 'bg-[#FF8F0D] text-white ring-4 ring-orange-100'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {i + 1 < step ? <Check size={14} /> : i + 1}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div className={`w-6 h-0.5 ${i + 1 < step ? 'bg-[#FF8F0D]' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function Toggle({ values, options, onChange }: {
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

function DayToggle({ selected, onChange }: {
  selected: string[]
  onChange: (days: string[]) => void
}) {
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

export default function SignupPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormData>(initialData)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setData(prev => ({ ...prev, [field]: e.target.value }))
  }

  const needsAcceptance = data.categories.some(c => ['training', 'hotel', 'trimming', 'hospital'].includes(c))

  const handleNext = () => {
    setError('')
    if (step === 1) {
      if (!data.email || !data.password) { setError('メールアドレスとパスワードを入力してください'); return }
      if (data.password.length < 6) { setError('パスワードは6文字以上で入力してください'); return }
      if (!data.agreedToTerms) { setError('利用規約に同意してください'); return }
    }
    if (step === 2) {
      if (!data.shopName || !data.address || !data.shopEmail) {
        setError('必須項目を入力してください'); return
      }
    }
    if (step === 3) {
      if (data.categories.length === 0) { setError('カテゴリを1つ以上選択してください'); return }
    }
    if (step === 4 && !needsAcceptance) {
      setStep(5); return
    }
    setStep(s => s + 1)
  }

  const handleBack = () => {
    if (step === 5 && !needsAcceptance) { setStep(3); return }
    setStep(s => s - 1)
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    const openHours = `${data.openTime}〜${data.closeTime}`
    const holiday = data.holiday.length > 0 ? data.holiday.join('・') + '曜日' : 'なし'
    try {
      await signUp(data.email, data.password, {
        name: data.shopName,
        email: data.shopEmail,
        address: data.address,
        openHoursDisplay: openHours,
        holiday,
        phone: data.phone,
        description: data.description,
        categories: data.categories,
        accepted: {
          difficulty: data.acceptedDifficulty,
          sizes: data.acceptedSize,
          ages: data.acceptedAge,
        },
        sns: { instagram: '', x: '', youtube: '' },
      })
      navigate('/home')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('email-already-in-use')) {
        setError('このメールアドレスはすでに使用されています')
      } else {
        setError('登録に失敗しました。もう一度お試しください')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronLeft size={18} />
          トップ
        </Link>
        <div className="flex items-center gap-1.5 font-bold text-gray-900">
          <PawPrint size={17} className="text-[#FF8F0D]" />
          <span>新規登録</span>
        </div>
        <div className="w-16" />
      </header>

      {/* コンテンツ */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8 w-full max-w-md">
          <StepIndicator step={step} />

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">アカウント作成</h2>
              <p className="text-sm text-gray-500 mb-5">ログイン用のメールアドレスとパスワードを設定します</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス <span className="text-red-500">*</span></label>
                  <input type="email" value={data.email} onChange={set('email')} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="shop@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">パスワード <span className="text-red-500">*</span></label>
                  <input type="password" value={data.password} onChange={set('password')} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="6文字以上" />
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={data.agreedToTerms} onChange={(e) => setData(p => ({ ...p, agreedToTerms: e.target.checked }))} className="mt-0.5 w-4 h-4 accent-[#FF8F0D]" />
                  <span className="text-sm text-gray-600">利用規約およびプライバシーポリシーに同意します</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">基本情報</h2>
              <p className="text-sm text-gray-500 mb-5">店舗の基本情報を入力してください</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">店舗名 <span className="text-red-500">*</span></label>
                  <input type="text" value={data.shopName} onChange={set('shopName')} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="例：わんにゃんサロン" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">住所 <span className="text-red-500">*</span></label>
                  <input type="text" value={data.address} onChange={set('address')} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="例：東京都渋谷区..." />
                </div>

                {/* 営業時間 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">営業時間</label>
                  <div className="flex items-center gap-3">
                    <TimeSelect value={data.openTime} onChange={v => setData(p => ({ ...p, openTime: v }))} />
                    <span className="text-gray-400 text-sm">〜</span>
                    <TimeSelect value={data.closeTime} onChange={v => setData(p => ({ ...p, closeTime: v }))} />
                  </div>
                </div>

                {/* 定休日 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    定休日
                    <span className="text-xs text-gray-400 font-normal ml-2">（なければ選択不要）</span>
                  </label>
                  <DayToggle
                    selected={data.holiday}
                    onChange={days => setData(p => ({ ...p, holiday: days }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                  <input type="tel" value={data.phone} onChange={set('phone')} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="例：03-1234-5678" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">店舗メールアドレス <span className="text-red-500">*</span></label>
                  <input type="email" value={data.shopEmail} onChange={set('shopEmail')} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="info@shop.com" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">店舗説明</label>
                  <textarea value={data.description} onChange={set('description')} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" placeholder="店舗の特徴や雰囲気を教えてください" />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">カテゴリ選択</h2>
              <p className="text-sm text-gray-500 mb-5">提供するサービスのカテゴリを選択してください（複数選択可）</p>
              <Toggle
                values={data.categories}
                options={CATEGORIES}
                onChange={(v) => setData(p => ({ ...p, categories: v }))}
              />
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">受け入れ設定</h2>
              <p className="text-sm text-gray-500 mb-5">対応できる犬の条件を選択してください（複数選択可）</p>
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">難易度</p>
                  <Toggle values={data.acceptedDifficulty} options={DIFFICULTY} onChange={(v) => setData(p => ({ ...p, acceptedDifficulty: v }))} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">サイズ</p>
                  <Toggle values={data.acceptedSize} options={SIZES} onChange={(v) => setData(p => ({ ...p, acceptedSize: v }))} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">年齢</p>
                  <Toggle values={data.acceptedAge} options={AGES} onChange={(v) => setData(p => ({ ...p, acceptedAge: v }))} />
                </div>
              </div>
            </div>
          )}

          {/* Step 5 */}
          {step === 5 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">確認・登録</h2>
              <p className="text-sm text-gray-500 mb-5">入力内容を確認して登録してください</p>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'メールアドレス', value: data.email },
                  { label: '店舗名', value: data.shopName },
                  { label: '住所', value: data.address },
                  { label: '営業時間', value: `${data.openTime}〜${data.closeTime}` },
                  { label: '定休日', value: data.holiday.length > 0 ? data.holiday.join('・') + '曜日' : 'なし' },
                  { label: 'カテゴリ', value: data.categories.map(c => CATEGORIES.find(x => x.value === c)?.label).join('、') },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-3 py-2 border-b border-gray-100">
                    <span className="text-gray-500 w-28 shrink-0">{label}</span>
                    <span className="text-gray-900 font-medium">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-4">{error}</p>
          )}

          {/* ボタン */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 flex items-center justify-center gap-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-full hover:bg-gray-50 transition-colors text-sm"
              >
                <ChevronLeft size={16} />
                戻る
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-1 bg-[#FF8F0D] hover:bg-[#E67D0B] text-white font-bold py-3 rounded-full transition-colors text-sm"
              >
                次へ
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-[#FF8F0D] hover:bg-[#E67D0B] disabled:opacity-50 text-white font-bold py-3 rounded-full transition-colors text-sm"
              >
                {loading ? '登録中...' : '登録する'}
              </button>
            )}
          </div>

          {step === 1 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              すでにアカウントをお持ちの方は{' '}
              <Link to="/login" className="text-[#FF8F0D] font-medium hover:underline">ログイン</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
