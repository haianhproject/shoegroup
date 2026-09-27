// Bộ logo thương hiệu được đóng gói cùng frontend; không tải ảnh từ website ngoài.
import nikeLogo from '../assets/brands/nike.svg'
import adidasLogo from '../assets/brands/adidas.svg'
import pumaLogo from '../assets/brands/puma.svg'
import mlbLogo from '../assets/brands/mlb.svg'
import newEraLogo from '../assets/brands/new-era.svg'
import vansLogo from '../assets/brands/vans.svg'
import newBalanceLogo from '../assets/brands/new-balance.svg'
import converseLogo from '../assets/brands/converse.svg'
import jordanLogo from '../assets/brands/jordan.svg'
import genericLogo from '../assets/brands/generic.svg'

const normalizeBrandName = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/gi, ' ')
  .trim()
  .toLowerCase()

const localBrandLogos = {
  nike: nikeLogo,
  adidas: adidasLogo,
  puma: pumaLogo,
  mlb: mlbLogo,
  'new era': newEraLogo,
  vans: vansLogo,
  'new balance': newBalanceLogo,
  converse: converseLogo,
  jordan: jordanLogo,
}

const isBundledOrUploadedImage = (value) => {
  const source = String(value || '').trim()
  return /^data:image\//i.test(source) || /^(?:\/|\.\/|\.\.\/)/.test(source)
}

export const genericBrandLogo = genericLogo

export const resolveBrandLogo = (brand) => {
  if (isBundledOrUploadedImage(brand?.logo_url)) return brand.logo_url
  return localBrandLogos[normalizeBrandName(brand?.name)] || genericLogo
}
