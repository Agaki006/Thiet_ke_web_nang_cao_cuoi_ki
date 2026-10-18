export type Artwork = {
  id: number
  title: string
  description: string
  tags: string[]
  sha256: string
  phash: string
  originality: number
  status: string
  tx_hash: string | null
  created_at: string
}

export type VerifyResult = {
  sha256: string
  registered: boolean
  artwork_id?: number | null
  similarity_percent: number
  suspected_artwork_id?: number | null
  on_chain_registered: boolean
  message: string
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'
export const AUTH_TOKEN_KEY = 'mediaguard_token'

export class AuthExpiredError extends Error {
  constructor(message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.') {
    super(message)
    this.name = 'AuthExpiredError'
  }
}

function detailToMessage(detail: unknown): string | null {
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'msg' in item && typeof item.msg === 'string') return item.msg
      return null
    }).filter((message): message is string => Boolean(message))
    if (messages.length) return messages.join(' · ')
  }
  if (detail && typeof detail === 'object') {
    const record = detail as Record<string, unknown>
    const message = typeof record.message === 'string' ? record.message : typeof record.msg === 'string' ? record.msg : null
    const similarity = typeof record.similarity_percent === 'number' ? `Độ tương đồng: ${Math.round(record.similarity_percent)}%.` : null
    if (message || similarity) return [message, similarity].filter(Boolean).join(' ')
    try { return JSON.stringify(detail) } catch { return null }
  }
  return null
}

export function formatApiError(body: unknown): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    return detailToMessage((body as { detail: unknown }).detail) ?? 'Có lỗi xảy ra, vui lòng thử lại.'
  }
  return detailToMessage(body) ?? 'Có lỗi xảy ra, vui lòng thử lại.'
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = formatApiError(body)
    const isAuthRequest = path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/auth/token')
    if (response.status === 401 && token && !isAuthRequest) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      window.dispatchEvent(new CustomEvent('mediaguard:auth-expired', { detail: { message } }))
      throw new AuthExpiredError()
    }
    throw new Error(message)
  }
  return body as T
}

export const api = {
  register: (email: string, password: string) => request<{ access_token: string }>('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => request<{ access_token: string }>('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }),
  listArtworks: () => request<Artwork[]>('/artworks'),
  walletNonce: () => request<{ nonce: string; message: string; expires_at: string }>('/auth/wallet/nonce', { method: 'POST' }),
  walletVerify: (wallet_address: string, signature: string, nonce: string) => request<{ access_token: string }>('/auth/wallet/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet_address, signature, nonce }) }),
  registerArtwork: (file: File, title: string, description: string, tags: string[]) => {
    const form = new FormData()
    form.append('file', file); form.append('title', title); form.append('description', description); form.append('tags', JSON.stringify(tags))
    return request<Artwork>('/artworks/register', { method: 'POST', body: form })
  },
  verify: (file: File) => {
    const form = new FormData(); form.append('file', file)
    return request<VerifyResult>('/verify', { method: 'POST', body: form })
  },
}
