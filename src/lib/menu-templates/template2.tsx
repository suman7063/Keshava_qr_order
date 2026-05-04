import { MenuItem, CartItem } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Plus, Minus, Leaf } from 'lucide-react'

interface Props {
  items: MenuItem[]
  cart: CartItem[]
  addToCart: (item: MenuItem) => void
  removeFromCart: (itemId: string) => void
}

export default function MenuTemplate2({ items, cart, addToCart, removeFromCart }: Props) {
  return (
    <div className="max-w-lg mx-auto px-3 mt-3 space-y-2">
      {items.map(item => {
        const qty = cart.find(c => c.menu_item.id === item.id)?.quantity || 0
        return (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h3 className="font-bold text-gray-900 text-sm leading-tight">{item.name}</h3>
                {item.is_vegetarian && <Leaf className="w-3.5 h-3.5 text-green-500 shrink-0" />}
              </div>
              {item.description && <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>}
              <span className="text-sm font-bold text-red-500 mt-1 block">{formatCurrency(item.price)}</span>
            </div>
            {qty === 0 ? (
              <button onClick={() => addToCart(item)} className="w-8 h-8 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                <Plus className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                  <Minus className="w-3.5 h-3.5 text-gray-700" />
                </button>
                <span className="text-xs font-bold text-gray-900 w-4 text-center">{qty}</span>
                <button onClick={() => addToCart(item)} className="w-7 h-7 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
