import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'monday',    label: '月曜日', short: '月' },
  { key: 'tuesday',   label: '火曜日', short: '火' },
  { key: 'wednesday', label: '水曜日', short: '水' },
  { key: 'thursday',  label: '木曜日', short: '木' },
  { key: 'friday',    label: '金曜日', short: '金' },
  { key: 'saturday',  label: '土曜日', short: '土' },
  { key: 'sunday',    label: '日曜日', short: '日' },
]

interface DayHours {
  isOpen: boolean
  open: string
  close: string
}

type HoursFormState = Record<DayKey, DayHours> & {
  isAcceptingReservations: boolean
}

function makeDefault(): HoursFormState {
  const days = Object.fromEntries(
    DAYS.map(d => [d.key, { isOpen: !['saturday', 'sunday'].includes(d.key), open: '09:00', close: '18:00' }])
  ) as Record<DayKey, DayHours>
  return { ...days, isAcceptingReservations: true }
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-sm font-bold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function HoursPage() {
  const { shop, updateShop } = useAuth()
  const [form, setForm] = useState<HoursFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!shop) return
    const base = makeDefault()
    const oh = shop.openHours
    if (oh) {
      DAYS.forEach(({ key }) => {
        const day = oh[key]
        base[key] = day
          ? { isOpen: true, open: day.open, close: day.close }
          : { isOpen: false, open: base[key].open, close: base[key].close }
      })
    }
    base.isAcceptingReservations = shop.isAcceptingReservations ?? true
    setForm(base)
  }, [shop])

  const setDay = (key: DayKey, patch: Partial<DayHours>) => {
    setForm(prev => prev ? { ...prev, [key]: { ...prev[key], ...patch } } : prev)
  }

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setError('')
    try {
      const openHours = Object.fromEntries(
        DAYS.map(({ key }) => [
          key,
          form[key].isOpen ? { open: form[key].open, close: form[key].close } : null,
        ])
      ) as NonNullable<typeof shop>['openHours']
      await updateShop({ openHours, isAcceptingReservations: form.isAcceptingReservations })
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
        <Header showBack title="営業時間設定" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">読み込み中...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="営業時間設定" />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full space-y-4 pb-28">

        {/* 週次営業時間 */}
        <SectionCard title="曜日ごとの営業時間">
          <div className="space-y-3">
            {DAYS.map(({ key, label, short }) => {
              const day = form[key]
              const isWeekend = key === 'saturday' || key === 'sunday'
              return (
                <div key={key} className="flex items-center gap-3">
                  {/* 曜日 */}
                  <span className={`w-8 text-sm font-bold shrink-0 ${isWeekend ? 'text-red-400' : 'text-gray-700'} hidden sm:block`}>
                    {label}
                  </span>
                  <span className={`w-6 text-sm font-bold shrink-0 ${isWeekend ? 'text-red-400' : 'text-gray-700'} sm:hidden`}>
                    {short}
                  </span>

                  {/* 営業トグル */}
                  <button
                    type="button"
                    onClick={() => setDay(key, { isOpen: !day.isOpen })}
                    className={`shrink-0 w-14 h-7 rounded-full transition-colors relative ${day.isOpen ? 'bg-[#FF8F0D]' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${day.isOpen ? 'left-[calc(100%-26px)]' : 'left-0.5'}`} />
                  </button>

                  {/* 営業時間入力 */}
                  {day.isOpen ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={day.open}
                        onChange={e => setDay(key, { open: e.target.value })}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 w-28"
                      />
                      <span className="text-gray-400 text-sm shrink-0">〜</span>
                      <input
                        type="time"
                        value={day.close}
                        onChange={e => setDay(key, { close: e.target.value })}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 w-28"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 flex-1">定休日</span>
                  )}
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* 予約受付 */}
        <SectionCard title="予約受付設定">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">予約を受け付ける</p>
              <p className="text-xs text-gray-400 mt-0.5">オフにすると予約を受け付けなくなります</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(prev => prev ? { ...prev, isAcceptingReservations: !prev.isAcceptingReservations } : prev)}
              className={`shrink-0 w-14 h-7 rounded-full transition-colors relative ${form.isAcceptingReservations ? 'bg-[#FF8F0D]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${form.isAcceptingReservations ? 'left-[calc(100%-26px)]' : 'left-0.5'}`} />
            </button>
          </div>
        </SectionCard>

      </main>

      {/* 固定保存バー */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 max-w-2xl mx-auto w-full">
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
