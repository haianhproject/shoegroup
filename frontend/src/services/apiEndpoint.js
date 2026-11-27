// Chọn bản API tương thích trước khi nạp store; không chuyển máy chủ hay gửi lại thao tác ghi giữa phiên.
export async function resolveDevelopmentApi(base, { development = false, fetcher = fetch } = {}) {
  if (!development) return base
  let url
  try { url = new URL(base) } catch { return base }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.port !== '5000' || url.pathname !== '/api') return base
  const health = async target => {
    try {
      const response = await fetcher(`${target}/health`, { cache: 'no-store', signal: AbortSignal.timeout(2500) })
      return response.ok ? await response.json() : null
    } catch { return null }
  }
  const primary = await health(base)
  const compatible = value => value?.success === true && value.application === 'shoegroup' && value.apiContract >= 4 && value.db === 'connected'
  if (compatible(primary)) return base
  const alternateUrl = new URL(url); alternateUrl.port = '5001'
  const alternate = alternateUrl.href.replace(/\/$/, ''), candidate = await health(alternate)
  if (compatible(candidate) && (!primary?.database || primary.database === candidate.database)
    && (!primary?.catalogIdentity?.revision || primary.catalogIdentity.revision === candidate.catalogIdentity?.revision)) return alternate
  return base
}
