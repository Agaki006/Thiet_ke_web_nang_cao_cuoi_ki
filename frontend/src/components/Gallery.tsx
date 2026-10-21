import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Clock3, FileCheck2, FileText, ImagePlus, Loader2, ShieldCheck, Sparkles, X } from 'lucide-react'
import { api, Artwork } from '../api'

type View = 'gallery' | 'protect' | 'verify'
type Toast = { type: 'success' | 'error'; message: string } | null
type CardProps = { artwork: Artwork; authenticated: boolean; onRefresh: () => void; notify: (toast: Toast) => void; onOpenWork: (id: number) => void }
const shortHash = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`
const statusLabel = (status: string) => ({ protected: 'Protected', approved_local: 'Local proof', pending_chain: 'Pending on-chain', chain_failed: 'Chain failed' } as Record<string, string>)[status] ?? status

function StatusBadge({ status }: { status: string }) {
  const Icon = status === 'protected' ? ShieldCheck : status === 'pending_chain' ? Clock3 : status === 'chain_failed' ? AlertTriangle : FileCheck2
  return <div className={`proof-stamp status-${status}`}><Icon size={14} />{statusLabel(status)}</div>
}

function ChainActions({ artwork, authenticated, onRefresh, notify }: CardProps) {
  const [retrying, setRetrying] = useState(false)
  const retry = async () => {
    setRetrying(true)
    try {
      const updated = await api.retryChain(artwork.id)
      notify({ type: 'success', message: updated.tx_hash ? 'Đã cập nhật bằng chứng on-chain.' : 'Đã thử ghi on-chain. Bằng chứng local vẫn được giữ nguyên.' })
      onRefresh()
    } catch (error) {
      notify({ type: 'error', message: error instanceof Error ? error.message : 'Không thể thử lại giao dịch.' })
    } finally { setRetrying(false) }
  }
  if (!artwork.tx_hash && !(authenticated && artwork.is_owner)) return null
  return <div className="chain-actions">
    {artwork.tx_hash ? <a href={`https://sepolia.etherscan.io/tx/${artwork.tx_hash}`} target="_blank" rel="noreferrer">Etherscan <ArrowUpRight size={14} /></a> : <button className="retry-chain" disabled={retrying} onClick={() => void retry()}>{retrying ? <><Loader2 size={14} className="spin" /> Retrying…</> : <><Clock3 size={14} /> Retry on-chain</>}</button>}
  </div>
}

function AuthorContact({ artwork }: { artwork: Artwork }) {
  return artwork.author_email ? <div className="author-row"><span>Verified creator</span><a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(artwork.author_email)}&su=${encodeURIComponent(`MediaGuard: ${artwork.title}`)}`} target="_blank" rel="noreferrer">Contact <ArrowUpRight size={12} /></a></div> : <div className="author-row private-author"><span>By verified creator</span><span>Email private</span></div>
}

function CardTitle({ artwork }: { artwork: Artwork }) {
  return <div className="art-title-row"><div><h3>{artwork.title}</h3><span className="art-date">{new Date(artwork.created_at).toLocaleDateString('vi-VN')}</span></div></div>
}

function ArtworkCard({ artwork, index, ...actions }: CardProps & { index: number }) {
  const tone = ['violet', 'blue', 'orange', 'mint'][index % 4]
  return <article className="art-card">
    <div className={`art-visual ${tone}`}>
      {artwork.image_url && <img className="art-image" src={artwork.image_url} alt={artwork.title} />}
      <div className="visual-grid" /><span className="art-index">#{String(artwork.id).padStart(3, '0')}</span><div className="visual-shape" />
      <StatusBadge status={artwork.status} />
    </div>
    <div className="art-body"><CardTitle artwork={artwork} /><div className="tag-row">{artwork.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div><div className="art-meta"><span><span className="meta-label">SHA</span> {shortHash(artwork.sha256)}</span><button className="text-link" onClick={() => actions.onOpenWork(artwork.id)}>View work <ArrowUpRight size={12} /></button></div><AuthorContact artwork={artwork} /><ChainActions artwork={artwork} {...actions} /></div>
  </article>
}

function WrittenWorkCard({ artwork, ...actions }: CardProps) {
  const [open, setOpen] = useState(false)
  return <>
    <article className="art-card written-card">
      <button className="written-cover" onClick={() => setOpen(true)}><span className="written-label"><FileText size={14} /> WRITTEN WORK</span><strong>{artwork.title}</strong><span>{artwork.work_type || 'Essay'} · {artwork.language || 'Text'}</span><small>{artwork.word_count ?? 0} words · {artwork.page_count ?? 1} page</small><StatusBadge status={artwork.status} /></button>
      <div className="art-body"><CardTitle artwork={artwork} /><p className="written-excerpt">{artwork.preview_text || artwork.description || 'Tác giả chưa công khai đoạn preview.'}</p><div className="art-meta"><span><span className="meta-label">SHA</span> {shortHash(artwork.sha256)}</span><button className="text-link" onClick={() => actions.onOpenWork(artwork.id)}>View work <ArrowUpRight size={12} /></button></div><AuthorContact artwork={artwork} /><ChainActions artwork={artwork} {...actions} /></div>
    </article>
    {open && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><div className="work-modal"><button className="modal-close" onClick={() => setOpen(false)} aria-label="Đóng tác phẩm"><X size={18} /></button><div className="eyebrow"><FileText size={14} /> WRITTEN WORK</div><h2>{artwork.title}</h2><p className="work-subtitle">{artwork.work_type || 'Written work'} · {artwork.language || 'Text'} · {artwork.word_count ?? 0} words</p><div className="work-proof"><span className={`status-${artwork.status}`}>{statusLabel(artwork.status)}</span><span>{artwork.license}</span><code>{shortHash(artwork.sha256)}</code></div>{artwork.preview_text ? <div className="work-preview">{artwork.preview_text}</div> : <div className="private-preview">This work is registered, but the author has not made a reading preview public.</div>}<div className="work-meta"><span>Registered {new Date(artwork.created_at).toLocaleDateString('vi-VN')}</span><span className="work-actions">{artwork.download_url && <a href={artwork.download_url}>Download <ArrowUpRight size={13} /></a>}{artwork.author_email && <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(artwork.author_email)}&su=${encodeURIComponent(`MediaGuard: ${artwork.title}`)}`} target="_blank" rel="noreferrer">Contact author <ArrowUpRight size={13} /></a>}</span></div></div></div>}
  </>
}

type GalleryFilter = 'all' | 'images' | 'written' | 'on-chain'

function Metric({ value, label, tone = '' }: { value: number; label: string; tone?: string }) {
  return <div className={`metric-card ${tone}`}><div className="metric-copy"><span>{label}</span><strong>{value}</strong></div></div>
}

export default function Gallery({ artworks, loading, authenticated, onRefresh, onNavigate, onOpenWork, notify }: { artworks: Artwork[]; loading: boolean; authenticated: boolean; onRefresh: () => void; onNavigate: (view: View) => void; onOpenWork: (id: number) => void; notify: (toast: Toast) => void }) {
  const [filter, setFilter] = useState<GalleryFilter>('all')
  const exhibition = useMemo(() => artworks.filter((artwork) => artwork.visibility === 'public' && ['protected', 'approved_local', 'pending_chain', 'chain_failed'].includes(artwork.status)), [artworks])
  const filtered = useMemo(() => exhibition.filter((artwork) => filter === 'all' || (filter === 'images' && artwork.media_type === 'image') || (filter === 'written' && artwork.media_type === 'written') || (filter === 'on-chain' && artwork.status === 'protected')), [exhibition, filter])
  const protectedCount = exhibition.filter((artwork) => artwork.status === 'protected').length
  const awaitingCount = exhibition.filter((artwork) => artwork.status !== 'protected').length
  const filters: Array<[GalleryFilter, string]> = [['all', 'All'], ['images', 'Images'], ['written', 'Written'], ['on-chain', 'On-chain']]
  return <section className="page-section">
    <div className="page-heading"><div><div className="eyebrow"><Sparkles size={14} /> PUBLIC DIGITAL EXHIBITION</div><h1>Proof, not promises.</h1><p>Không gian trưng bày ảnh và tác phẩm viết đã xác minh, kèm bằng chứng SHA-256 và thông tin liên hệ tác giả.</p></div><button className="primary-button" onClick={() => onNavigate('protect')}><ImagePlus size={17} /> Protect a work</button></div>
    <div className="metric-grid"><Metric value={exhibition.length} label="Verified works" /><Metric value={protectedCount} label="Confirmed on-chain" tone="metric-accent" /><Metric value={awaitingCount} label="Awaiting transaction" /></div>
    <div className="section-title-row"><div><h2>Verified exhibition</h2><p>Mới nhất trước · liên hệ trực tiếp tác giả</p></div><div className="gallery-filters" role="group" aria-label="Lọc tác phẩm">{filters.map(([value, label]) => <button key={value} type="button" className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
    {loading ? <div className="empty-state"><Loader2 className="spin" size={24} /><p>Đang tải registry…</p></div> : filtered.length === 0 ? <div className="empty-state empty-border"><div className="empty-icon"><ImagePlus size={24} /></div><h3>Chưa có tác phẩm nào trong mục này</h3><p>Thử chọn bộ lọc khác hoặc đăng ký tác phẩm đầu tiên.</p></div> : <div className="art-grid">{filtered.map((artwork, index) => artwork.media_type === 'written' ? <WrittenWorkCard key={artwork.id} artwork={artwork} authenticated={authenticated} onRefresh={onRefresh} onOpenWork={onOpenWork} notify={notify} /> : <ArtworkCard key={artwork.id} artwork={artwork} index={index} authenticated={authenticated} onRefresh={onRefresh} onOpenWork={onOpenWork} notify={notify} />)}</div>}
  </section>
}
