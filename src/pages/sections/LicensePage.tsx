import { useState, useEffect } from 'react'
import { CheckCircle, Clock, XCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'

const CATEGORIES = ['販売', '保管', '貸出し', '訓練', '展示']

interface LicenseForm {
  registrationNumber: string
  name: string
  address: string
  manager: string
  registrationDate: string
  validUntil: string
  category: string[]
}

const emptyForm = (): LicenseForm => ({
  registrationNumber: '',
  name: '',
  address: '',
  manager: '',
  registrationDate: '',
  validUntil: '',
  category: [],
})

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'

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

function StatusBadge({ status, reason }: { status: 'pending' | 'approved' | 'rejected'; reason?: string }) {
  if (status === 'approved') {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
        <CheckCircle size={18} className="text-green-500 shrink-0" />
        <div>
          <p className="text-sm font-bold text-green-700">承認済み</p>
          <p className="text-xs text-green-600">登録が確認されました</p>
        </div>
      </div>
    )
  }
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl">
        <XCircle size={18} className="text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-700">却下</p>
          {reason && <p className="text-xs text-red-600">却下理由: {reason}</p>}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
      <Clock size={18} className="text-amber-500 shrink-0" />
      <div>
        <p className="text-sm font-bold text-amber-700">審査中</p>
        <p className="text-xs text-amber-600">内容を確認しています</p>
      </div>
    </div>
  )
}

export default function LicensePage() {
  const { shop, updateShop } = useAuth()
  const [form, setForm] = useState<LicenseForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!shop?.license) return
    const l = shop.license
    setForm({
      registrationNumber: l.registrationNumber ?? '',
      name: l.name ?? '',
      address: l.address ?? '',
      manager: l.manager ?? '',
      registrationDate: l.registrationDate ?? '',
      validUntil: l.validUntil ?? '',
      category: l.category ?? [],
    })
  }, [shop])

  const toggleCategory = (cat: string) => {
    setForm(p => ({
      ...p,
      category: p.category.includes(cat)
        ? p.category.filter(c => c !== cat)
        : [...p.category, cat],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const existingStatus = shop?.license?.status ?? 'pending'
      const existingReason = shop?.license?.reason
      await updateShop({
        license: {
          ...form,
          status: existingStatus,
          ...(existingReason ? { reason: existingReason } : {}),
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

  const license = shop?.license

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="第一種動物取扱業" />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full space-y-4 pb-28">

        {/* ステータス */}
        {license && (
          <SectionCard title="審査ステータス">
            <StatusBadge status={license.status} reason={license.reason} />
          </SectionCard>
        )}

        {/* 登録情報 */}
        <SectionCard title="登録情報">
          <div className="space-y-4">
            <Field label="登録番号">
              <input
                type="text"
                value={form.registrationNumber}
                onChange={e => setForm(p => ({ ...p, registrationNumber: e.target.value }))}
                className={inputClass}
                placeholder="例：東京都第〇〇号"
              />
            </Field>

            <Field label="氏名・事業者名">
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={inputClass}
                placeholder="例：株式会社〇〇"
              />
            </Field>

            <Field label="所在地">
              <input
                type="text"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                className={inputClass}
                placeholder="例：東京都渋谷区..."
              />
            </Field>

            <Field label="動物取扱責任者">
              <input
                type="text"
                value={form.manager}
                onChange={e => setForm(p => ({ ...p, manager: e.target.value }))}
                className={inputClass}
                placeholder="例：山田 太郎"
              />
            </Field>

            <div className="flex gap-3">
              <div className="flex-1">
                <Field label="登録日">
                  <input
                    type="date"
                    value={form.registrationDate}
                    onChange={e => setForm(p => ({ ...p, registrationDate: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="有効期限">
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <Field label="業種区分">
              <div className="flex gap-2 flex-wrap mt-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.category.includes(cat)
                        ? 'bg-[#FF8F0D] text-white border-[#FF8F0D]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </SectionCard>

        {/* 注意書き */}
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs text-amber-700 leading-relaxed">
            第一種動物取扱業の登録証に記載されている情報を正確に入力してください。入力内容は管理者が確認後、承認されます。
          </p>
        </div>

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
