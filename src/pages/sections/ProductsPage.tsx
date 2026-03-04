import { useState, useRef } from 'react'
import { Plus, Pencil, Package, ImagePlus, X } from 'lucide-react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'

interface ProductItem {
  productId: string
  name: string
  description: string
  price: number
  stock: number
  isActive: boolean
  soldOut: boolean
  photos: string[]
  productCategory: string
  targetSizes: string[]
  targetAges: string[]
}

const CATEGORIES = ['ドッグフード', 'おもちゃ・グッズ', '消耗品']
const SIZES = ['小型', '中型', '大型']
const AGES = ['パピー期', '成犬期', 'シニア期']
const MAX_PHOTOS = 5

const emptyForm = (): Omit<ProductItem, 'productId' | 'soldOut'> => ({
  name: '',
  description: '',
  price: 0,
  stock: 0,
  isActive: true,
  photos: [],
  productCategory: '',
  targetSizes: [],
  targetAges: [],
})

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'

function CheckGroup({ label, values, options, onChange }: {
  label: string
  values: string[]
  options: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (val: string) =>
    onChange(values.includes(val) ? values.filter(v => v !== val) : [...values, val])
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${values.includes(opt) ? 'bg-[#FF8F0D] text-white border-[#FF8F0D]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const { shop, updateShop } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductItem | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)

  const products = (shop?.products ?? []) as ProductItem[]

  const openAdd = () => {
    setForm(emptyForm())
    setEditing(null)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (p: ProductItem) => {
    setForm({
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      isActive: p.isActive,
      photos: [...p.photos],
      productCategory: p.productCategory,
      targetSizes: [...p.targetSizes],
      targetAges: [...p.targetAges],
    })
    setEditing(p)
    setError('')
    setModalOpen(true)
  }

  const closeModal = () => setModalOpen(false)

  const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !shop) return
    const remaining = MAX_PHOTOS - form.photos.length
    if (remaining <= 0) return
    setUploading(true)
    try {
      const newUrls: string[] = []
      for (const file of files.slice(0, remaining)) {
        const productId = editing?.productId ?? `product-${Date.now()}`
        const storageRef = ref(storage, `shops/${shop.shopId}/products/${productId}/${Date.now()}_${file.name}`)
        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)
        newUrls.push(url)
      }
      setForm(p => ({ ...p, photos: [...p.photos, ...newUrls] }))
    } finally {
      setUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const handlePhotoRemove = (url: string) => {
    setForm(p => ({ ...p, photos: p.photos.filter(u => u !== url) }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('商品名を入力してください'); return }
    if (!form.productCategory) { setError('カテゴリを選択してください'); return }
    if (form.targetSizes.length === 0) { setError('対象サイズを1つ以上選択してください'); return }
    if (form.targetAges.length === 0) { setError('対象年齢を1つ以上選択してください'); return }
    setSaving(true)
    try {
      const item: ProductItem = {
        productId: editing?.productId ?? `product-${Date.now()}`,
        ...form,
        soldOut: form.stock === 0,
      }
      const updated = editing
        ? products.map(p => p.productId === editing.productId ? item : p)
        : [...products, item]
      await updateShop({ products: updated })
      closeModal()
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editing) return
    if (!confirm(`「${editing.name}」を削除しますか？`)) return
    setSaving(true)
    try {
      await updateShop({ products: products.filter(p => p.productId !== editing.productId) })
      closeModal()
    } catch {
      setError('削除に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack title="商品" />

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full pb-8">

        <button
          onClick={openAdd}
          className="w-full flex items-center justify-center gap-2 bg-[#FF8F0D] hover:bg-[#E67D0B] text-white font-bold py-3 rounded-2xl text-sm transition-colors mb-4"
        >
          <Plus size={16} />
          商品を追加
        </button>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center gap-3 text-center">
            <Package size={40} strokeWidth={1.2} className="text-gray-300" />
            <p className="text-sm text-gray-400">商品がまだありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => (
              <div key={p.productId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* 画像 */}
                <div className="aspect-square bg-gray-50 relative">
                  {p.photos[0] ? (
                    <img src={p.photos[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={32} strokeWidth={1} className="text-gray-300" />
                    </div>
                  )}
                  {/* バッジ */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {p.isActive ? '販売中' : '非公開'}
                    </span>
                    {p.soldOut && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-500">売切</span>
                    )}
                  </div>
                  <button
                    onClick={() => openEdit(p)}
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white p-1.5 rounded-lg text-gray-500 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
                {/* 情報 */}
                <div className="p-3">
                  <p className="text-xs text-gray-400 mb-0.5">{p.productCategory}</p>
                  <p className="text-sm font-bold text-gray-800 leading-snug line-clamp-2">{p.name}</p>
                  <p className="text-sm font-bold text-[#FF8F0D] mt-1">¥{p.price.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">在庫 {p.stock}個</p>
                </div>
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
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900">
              {editing ? '商品を編集' : '商品を追加'}
            </h3>

            {/* 写真 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                写真（最大{MAX_PHOTOS}枚）
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {form.photos.map(url => (
                  <div key={url} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-100">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handlePhotoRemove(url)}
                      className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {form.photos.length < MAX_PHOTOS && (
                  <label className={`shrink-0 w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${uploading ? 'border-gray-200 text-gray-300' : 'border-gray-300 text-gray-400 hover:border-[#FF8F0D] hover:text-[#FF8F0D]'}`}>
                    <ImagePlus size={18} />
                    <span className="text-xs">{uploading ? '...' : '追加'}</span>
                    <input ref={photoInputRef} type="file" accept="image/*" multiple disabled={uploading} onChange={handlePhotoAdd} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">商品名 <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="例：プレミアムドッグフード 1kg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ <span className="text-red-500">*</span></label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, productCategory: c }))}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${form.productCategory === c ? 'bg-[#FF8F0D] text-white border-[#FF8F0D]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={`${inputClass} resize-none`} placeholder="商品の説明を入力してください" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">価格（円）<span className="text-red-500">*</span></label>
                  <input type="number" min={0} value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} className={inputClass} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">在庫数</label>
                  <input type="number" min={0} value={form.stock} onChange={e => setForm(p => ({ ...p, stock: Number(e.target.value) }))} className={inputClass} />
                </div>
              </div>

              <CheckGroup label="対象サイズ *" values={form.targetSizes} options={SIZES} onChange={v => setForm(p => ({ ...p, targetSizes: v }))} />
              <CheckGroup label="対象年齢 *" values={form.targetAges} options={AGES} onChange={v => setForm(p => ({ ...p, targetAges: v }))} />

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-gray-700">販売中</p>
                  <p className="text-xs text-gray-400">オフにすると非公開になります</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                  className={`shrink-0 w-14 h-7 rounded-full transition-colors relative ${form.isActive ? 'bg-[#FF8F0D]' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${form.isActive ? 'left-[calc(100%-26px)]' : 'left-0.5'}`} />
                </button>
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
              <button onClick={handleSave} disabled={saving || uploading} className="flex-1 py-2.5 rounded-full text-sm font-bold bg-[#FF8F0D] hover:bg-[#E67D0B] text-white transition-colors disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
