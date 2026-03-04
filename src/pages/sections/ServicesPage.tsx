import { useState } from 'react'
import { Plus, Pencil, Clock, Store, Car } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'

type ServiceType = 'inStore' | 'visit'

interface ServiceItem {
  serviceId: string
  serviceName: string
  name: string
  description: string
  serviceType: ServiceType
  price: number
  duration: number | null
  isPublic: boolean
}

const emptyForm = () => ({
  serviceName: '',
  description: '',
  serviceType: 'inStore' as ServiceType,
  price: 0,
  duration: null as number | null,
})

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'

export default function ServicesPage() {
  const { shop, updateShop } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceItem | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const services = (shop?.services ?? []) as ServiceItem[]

  const openAdd = () => {
    setForm(emptyForm())
    setEditing(null)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (s: ServiceItem) => {
    setForm({
      serviceName: s.serviceName,
      description: s.description,
      serviceType: s.serviceType,
      price: s.price,
      duration: s.duration,
    })
    setEditing(s)
    setError('')
    setModalOpen(true)
  }

  const closeModal = () => setModalOpen(false)

  const handleSave = async () => {
    if (!form.serviceName.trim()) { setError('プラン名を入力してください'); return }
    setSaving(true)
    try {
      let updated: ServiceItem[]
      if (editing) {
        updated = services.map(s =>
          s.serviceId === editing.serviceId
            ? { ...s, ...form, name: form.serviceName }
            : s
        )
      } else {
        updated = [...services, {
          serviceId: `service-${Date.now()}`,
          ...form,
          name: form.serviceName,
          isPublic: true,
        }]
      }
      await updateShop({ services: updated })
      closeModal()
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editing) return
    if (!confirm(`「${editing.serviceName}」を削除しますか？`)) return
    setSaving(true)
    try {
      await updateShop({ services: services.filter(s => s.serviceId !== editing.serviceId) })
      closeModal()
    } catch {
      setError('削除に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="サービス" />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full pb-8">

        <button
          onClick={openAdd}
          className="w-full flex items-center justify-center gap-2 bg-[#FF8F0D] hover:bg-[#E67D0B] text-white font-bold py-3 rounded-2xl text-sm transition-colors mb-4"
        >
          <Plus size={16} />
          サービスを追加
        </button>

        {services.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center gap-3 text-center">
            <Store size={40} strokeWidth={1.2} className="text-gray-300" />
            <p className="text-sm text-gray-400">サービスがまだありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(s => (
              <div key={s.serviceId} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.serviceType === 'inStore' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      {s.serviceType === 'inStore' ? '来店型' : '出張型'}
                    </span>
                    {s.duration && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} />{s.duration}分
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-800">{s.serviceName}</p>
                  {s.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>}
                  <p className="text-sm font-bold text-[#FF8F0D] mt-1.5">¥{s.price.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => openEdit(s)}
                  className="shrink-0 p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <Pencil size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* モーダル */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900">
              {editing ? 'サービスを編集' : 'サービスを追加'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">プラン名 <span className="text-red-500">*</span></label>
                <input type="text" value={form.serviceName} onChange={e => setForm(p => ({ ...p, serviceName: e.target.value }))} className={inputClass} placeholder="例：トリミングコース（シャンプー込み）" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">サービス種別 <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  {(['inStore', 'visit'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, serviceType: t }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${form.serviceType === t ? 'bg-[#FF8F0D] text-white border-[#FF8F0D]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                    >
                      {t === 'inStore' ? <Store size={14} /> : <Car size={14} />}
                      {t === 'inStore' ? '来店型' : '出張型'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">料金（円）<span className="text-red-500">*</span></label>
                <input type="number" min={0} value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} className={inputClass} placeholder="5000" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所要時間（分）</label>
                <input type="number" min={1} value={form.duration ?? ''} onChange={e => setForm(p => ({ ...p, duration: e.target.value ? Number(e.target.value) : null }))} className={inputClass} placeholder="60（任意）" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className={`${inputClass} resize-none`} placeholder="サービスの内容を入力してください" />
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              {editing && (
                <button onClick={handleDelete} disabled={saving} className="px-4 py-2.5 rounded-full text-sm font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                  削除
                </button>
              )}
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-full text-sm font-bold bg-[#FF8F0D] hover:bg-[#E67D0B] text-white transition-colors disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
