import { api } from './apiClient'
import { shippingMethods as fallbackShippingMethods } from '../data/mockData'

// Bảng dự phòng giúp checkout vẫn dùng được khi máy chủ chưa chạy migration
// hoặc đang tạm mất kết nối. Khi API hoạt động, giá trong DB luôn được ưu tiên.
const FALLBACK_METHODS = [
  ...fallbackShippingMethods,
]

const toNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export const normalizeShippingMethod = (raw = {}) => {
  const code = String(raw.code ?? raw.MethodCode ?? raw.method_code ?? 'STANDARD').trim().toUpperCase()
  const pricePerKm = Math.max(0, toNumber(raw.pricePerKm ?? raw.PricePerKm, 0))
  return {
    id: raw.id ?? raw.ShippingMethodID ?? raw.shipping_method_id ?? null,
    code,
    name: raw.name ?? raw.MethodName ?? raw.method_name ?? 'Giao hàng tiêu chuẩn',
    basePrice: Math.max(0, toNumber(raw.basePrice ?? raw.BasePrice, 0)),
    pricePerKm,
    eta: raw.eta ?? raw.EstimatedTimeText ?? raw.estimated_time_text ?? '2 - 3 ngày',
    originCity: raw.originCity ?? raw.OriginCity ?? 'Hai Bà Trưng, Hà Nội',
    desc: raw.desc ?? 'Tính theo khoảng cách từ kho Hai Bà Trưng, Hà Nội.',
  }
}

const fallback = () => {
  const byCode = new Map()
  FALLBACK_METHODS.map(normalizeShippingMethod).forEach((method) => byCode.set(method.code, method))
  return [...byCode.values()]
}

export const shippingApi = {
  async methods() {
    try {
      const rows = await api.get('/shippingmethods')
      const methods = Array.isArray(rows)
        ? rows.map(normalizeShippingMethod).filter((method) => method.code)
        : []
      return methods.length ? methods : fallback()
    } catch (_) {
      return fallback()
    }
  },

  async quote({ methodCode = 'STANDARD', province = '', district = '', ward = '', address = '' } = {}) {
    const result = await api.post('/shipping/quote', {
      methodCode,
      province,
      district,
      ward,
      address,
    })
    return {
      ...result,
      methodCode: String(result?.methodCode ?? methodCode).trim().toUpperCase(),
      fee: Math.max(0, toNumber(result?.fee, 0)),
      distanceKm: Math.max(0, toNumber(result?.distanceKm, 0)),
      basePrice: Math.max(0, toNumber(result?.basePrice, 0)),
      pricePerKm: Math.max(0, toNumber(result?.pricePerKm, 0)),
    }
  },
}

export { fallback as fallbackShippingMethods }
