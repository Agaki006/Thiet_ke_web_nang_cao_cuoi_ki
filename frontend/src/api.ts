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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('mediaguard_token')
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : 'Có lỗi xảy ra, vui lòng thử lại.'
    throw new Error(detail)
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
