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
  image_url: string | null
  download_url: string | null
  author_email: string | null
  author_wallet: string | null
  media_type: 'image' | 'written'
  work_type: string | null
  language: string | null
  word_count: number | null
  page_count: number | null
  preview_text: string | null
  license: string
  visibility: string
  show_public_preview: boolean
  allow_download: boolean
  created_at: string
  /** Server-computed against the bearer token sent with listArtworks. */
  is_owner?: boolean
}

export type WorkDetail = {
  id: number
  title: string
  description: string
  tags: string[]
  kind: 'image' | 'written'
  owner_address: string | null
  created_at: string
  status: string
  sha256: string
  phash: string
  tx_hash: string | null
  contract_address: string | null
  image_url: string | null
  work_type: string | null
  originality: number
  is_owner?: boolean
}

export type VerifyResult = {
  sha256: string
  registered: boolean
  artwork_id?: number | null
  similarity_percent: number
  suspected_artwork_id?: number | null
  suspected_artwork_title?: string | null
  suspected_artwork_image_url?: string | null
  suspected_artwork_media_type?: 'image' | 'written' | null
  matched_title?: string | null
  matched_wallet?: string | null
  matched_created_at?: string | null
  matched_status?: string | null
  matched_tx_hash?: string | null
  matched_image_url?: string | null
  matched_block_number?: number | null
  matched_block_timestamp?: string | null
  on_chain_registered: boolean
  message: string
  media_type: 'image' | 'written'
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'
export const AUTH_TOKEN_KEY = 'mediaguard_token'
export const WALLET_ADDRESS_KEY = 'mediaguard_wallet'

export function resolveApiAsset(value: string | null | undefined): string | null {
  if (!value) return null
  // FastAPI uses /api paths for the default proxy; preserve custom API origins.
  return value.startsWith('/api/') ? `${API_BASE.replace(/\/$/, '')}${value.slice(4)}` : value
}

function resolveArtworkAssets(artwork: Artwork): Artwork {
  return { ...artwork, image_url: resolveApiAsset(artwork.image_url), download_url: resolveApiAsset(artwork.download_url) }
}

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
    const similarity = typeof record.similarity_percent === 'number' ? `Độ tương đồng: ${record.similarity_percent.toFixed(1)}%.` : null
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
  listArtworks: () => request<Artwork[]>('/artworks').then((items) => items.map(resolveArtworkAssets)),
  getArtwork: (id: number) => request<WorkDetail>(`/artworks/${id}`).then((work) => ({ ...work, image_url: resolveApiAsset(work.image_url) })),
  retryChain: (id: number) => request<Artwork>(`/artworks/${id}/retry-chain`, { method: 'POST' }).then(resolveArtworkAssets),
  walletNonce: () => request<{ nonce: string; message: string; expires_at: string }>('/auth/wallet/nonce', { method: 'POST' }),
  walletVerify: (wallet_address: string, signature: string, nonce: string) => request<{ access_token: string }>('/auth/wallet/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet_address, signature, nonce }) }),
  registerArtwork: (file: File, title: string, description: string, tags: string[], showContactEmail: boolean, options: { mediaType: string; workType: string; language: string; license: string; visibility: string; showPublicPreview: boolean; allowDownload: boolean }) => {
    const form = new FormData()
    form.append('file', file); form.append('title', title); form.append('description', description); form.append('tags', JSON.stringify(tags)); form.append('show_contact_email', String(showContactEmail)); form.append('media_type', options.mediaType); form.append('work_type', options.workType); form.append('language', options.language); form.append('license', options.license); form.append('visibility', options.visibility); form.append('show_public_preview', String(options.showPublicPreview)); form.append('allow_download', String(options.allowDownload))
    return request<Artwork>('/artworks/register', { method: 'POST', body: form }).then(resolveArtworkAssets)
  },
  verify: (file: File) => {
    const form = new FormData(); form.append('file', file)
    return request<VerifyResult>('/verify', { method: 'POST', body: form }).then((result) => ({ ...result, matched_image_url: resolveApiAsset(result.matched_image_url), suspected_artwork_image_url: resolveApiAsset(result.suspected_artwork_image_url) }))
  },
}
