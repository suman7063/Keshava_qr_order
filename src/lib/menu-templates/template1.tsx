import Image from 'next/image'
import { MenuItem, CartItem } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Plus, Minus, Leaf } from 'lucide-react'

interface Props {
  items: MenuItem[]
  cart: CartItem[]
  addToCart: (item: MenuItem) => void
  removeFromCart: (itemId: string) => void
}

export default function MenuTemplate1({ items, cart, addToCart, removeFromCart }: Props) {
  return (
    <div className="max-w-lg mx-auto px-3 mt-3 grid grid-cols-2 gap-3">
      {items.map(item => {
        const qty = cart.find(c => c.menu_item.id === item.id)?.quantity || 0
        return (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="relative w-full h-32 bg-gray-100 overflow-hidden">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  sizes="(max-width: 500px) 50vw, 200px"
                  className="object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-4xl select-none">
                  🍽
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-start gap-1 mb-0.5">
                <h3 className="font-bold text-gray-900 text-sm leading-tight flex-1">{item.name}</h3>
                {item.is_vegetarian && <Leaf className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />}
              </div>
              {item.description && <p className="text-xs text-gray-400 line-clamp-2 mb-2">{item.description}</p>}
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-bold text-red-500">{formatCurrency(item.price)}</span>
                {qty === 0 ? (
                  <button onClick={() => addToCart(item)} className="w-7 h-7 bg-[#7a5c3a] text-white rounded-full flex items-center justify-center shadow-sm">
                    <Plus className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <Minus className="w-3 h-3 text-gray-700" />
                    </button>
                    <span className="text-xs font-bold text-gray-900 w-4 text-center">{qty}</span>
                    <button onClick={() => addToCart(item)} className="w-6 h-6 bg-[#7a5c3a] text-white rounded-full flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
