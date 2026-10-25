// Muc dich: Phan biet cung so kich co thuoc EU/US/UK khi chon bien the.
export function variantSizeLabel(variant) {
  const size = String(variant.size ?? variant.size_name ?? variant.SizeName ?? '').trim();
  const standard = String(variant.standard ?? variant.SizeStandard ?? '').trim().toUpperCase();
  return standard ? `${standard} ${size}` : size;
}
