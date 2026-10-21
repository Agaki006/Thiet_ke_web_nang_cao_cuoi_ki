import { AlertTriangle, ArrowUpRight, Copy, FileText, ImagePlus, ScanLine, ShieldCheck } from 'lucide-react'
import { VerifyResult } from '../api'

type View = 'gallery' | 'protect' | 'verify'
const shortHash = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`
const shortWallet = (value?: string | null) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : 'Chưa kết nối'
const percent = (value: number) => `${value.toFixed(1)}%`

function HashLine({ sha256 }: { sha256: string }) {
  return <div className="hash-line"><span>SHA-256</span><code>{sha256}</code><button aria-label="Sao chép hash" onClick={() => void navigator.clipboard?.writeText(sha256)}><Copy size={14} /></button></div>
}

function SimilarityBar({ score, threshold, tone }: { score: number; threshold: number; tone: 'blue' | 'amber' }) {
  return <><div className={`similarity-track similarity-${tone}`} role="meter" aria-label="Độ tương đồng" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}><div className="similarity-fill" style={{ width: `${score}%` }} /><span className="threshold-marker" style={{ left: `${threshold}%` }} /></div><div className="similarity-legend"><span>{percent(0)}</span><span className="threshold-label" style={{ left: `${threshold}%` }}>Ngưỡng cảnh báo {percent(threshold)}</span><span>{percent(100)}</span></div></>
}

export default function VerifyResultCard({ result, previewUrl, onNavigate }: { result: VerifyResult; previewUrl: string | null; onNavigate: (view: View) => void }) {
  const threshold = 85
  const exact = result.registered
  const similar = !exact && result.similarity_percent >= threshold
  const score = Math.min(100, Math.max(0, result.similarity_percent))
  const matchedDate = result.matched_created_at ? new Date(result.matched_created_at).toLocaleDateString('vi-VN') : null
  const chainConfirmed = result.on_chain_registered || result.matched_status === 'protected'
  if (exact) return <div className="verify-result verified exact-result">
    <div className="result-card-head"><div className="result-icon result-thumb">{result.matched_image_url || previewUrl ? <img src={result.matched_image_url || previewUrl || undefined} alt={result.matched_title || 'Registered work'} /> : <FileText size={24} />}</div><div className="result-title"><span className="result-kicker">VERIFIED RECORD</span><h2>This exact file is registered.</h2><p>#{String(result.artwork_id ?? 0).padStart(3, '0')} · “{result.matched_title || 'Registered work'}” · by {shortWallet(result.matched_wallet)}{matchedDate ? ` · ${matchedDate}` : ''}</p></div><strong className="exact-badge">EXACT MATCH</strong></div>
    <div className="proof-summary"><div><span className="proof-dot">●</span><b>{chainConfirmed ? 'On-chain confirmed · Sepolia' : 'Local proof only'}</b></div>{result.matched_tx_hash ? <a href={`https://sepolia.etherscan.io/tx/${result.matched_tx_hash}`} target="_blank" rel="noreferrer">Tx: {shortHash(result.matched_tx_hash)} <ArrowUpRight size={13} /></a> : <span className="proof-muted">No blockchain transaction</span>}</div>
    <p className="exact-message">Mã SHA-256 của file khớp hoàn toàn với tác phẩm đã đăng ký. File này giống hệt bản gốc.</p><HashLine sha256={result.sha256} /><div className="result-actions"><button className="ghost-button" onClick={() => void navigator.clipboard?.writeText(result.sha256)}>Copy hash</button><button className="ghost-button" onClick={() => onNavigate('gallery')}>View in gallery <ArrowUpRight size={15} /></button></div>
  </div>

  return <div className={`verify-result ${similar ? 'suspected' : 'neutral'}`}>
    <div className="result-card-head"><div className="result-icon">{similar ? <AlertTriangle size={20} /> : <ScanLine size={20} />}</div><div className="result-title"><span className="result-kicker">{similar ? 'SIMILAR WORK FOUND' : 'NOT REGISTERED'}</span><h2>{similar ? 'This looks like a registered work.' : 'No match found in registry.'}</h2><p>{similar ? `Không trùng tuyệt đối nhưng có độ tương đồng cao với tác phẩm #${String(result.suspected_artwork_id ?? 0).padStart(3, '0')}.` : 'Không có bản trùng SHA-256 và không có tác phẩm nào vượt ngưỡng tương đồng.'}</p></div><strong className="result-score">{percent(score)}<small>{similar ? 'SIMILAR' : 'CLOSEST MATCH'}</small></strong></div>
    {similar ? <div className="compare-block"><div className="compare-grid"><div><div className="compare-thumb">{previewUrl ? <img src={previewUrl} alt="Your file" /> : <ImagePlus size={24} />}</div><span>Your file</span></div><div className="compare-divider">≈</div><div><div className="compare-thumb">{result.suspected_artwork_image_url ? <img src={result.suspected_artwork_image_url} alt={result.suspected_artwork_title || 'Registered work'} /> : <ImagePlus size={24} />}</div><span>Registered #{String(result.suspected_artwork_id ?? 0).padStart(3, '0')}</span></div></div><div className="closest-line"><span>Closest match: {result.suspected_artwork_title || 'Registered work'}</span><b>{percent(score)}</b></div><SimilarityBar score={score} threshold={threshold} tone="amber" /></div> : <div className="not-registered-panel"><div className="closest-artwork"><div className="closest-thumb">{result.suspected_artwork_image_url ? <img src={result.suspected_artwork_image_url} alt={result.suspected_artwork_title || 'Closest registered work'} /> : result.media_type === 'written' ? <FileText size={24} /> : <ImagePlus size={24} />}</div><div className="closest-copy"><span>Closest match</span><b>{result.suspected_artwork_id ? `#${String(result.suspected_artwork_id).padStart(3, '0')} ${result.suspected_artwork_title || ''}` : 'No registered work'}</b></div><strong>{percent(score)}</strong></div><SimilarityBar score={score} threshold={threshold} tone="blue" /></div>}
    <div className="result-footer"><span>{result.message}</span>{!similar && <button className="secondary-button" onClick={() => onNavigate('protect')}>Protect this work <ArrowUpRight size={15} /></button>}</div>
  </div>
}
