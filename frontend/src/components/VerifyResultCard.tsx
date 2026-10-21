import { AlertTriangle, ArrowUpRight, Copy, FileText, ImagePlus, ScanLine, ShieldCheck } from 'lucide-react'
import { VerifyResult } from '../api'

type View = 'gallery' | 'protect' | 'verify'
const shortHash = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`
const shortWallet = (value?: string | null) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : 'Chưa kết nối'
const percent = (value: number) => `${value.toFixed(1)}%`

function HashLine({ sha256 }: { sha256: string }) {
  return <div className="hash-line"><span>SHA-256</span><code>{sha256}</code><button aria-label="Sao chép SHA-256" onClick={() => void navigator.clipboard?.writeText(sha256)}><Copy size={14} /></button></div>
}

export default function VerifyResultCard({ result, previewUrl, onNavigate }: { result: VerifyResult; previewUrl: string | null; onNavigate: (view: View) => void }) {
  const threshold = 85
  const exact = result.registered
  const similar = !exact && result.similarity_percent >= threshold
  const score = Math.min(100, Math.max(0, result.similarity_percent))
  const matchedDate = result.matched_created_at ? new Date(result.matched_created_at).toLocaleDateString('vi-VN') : null
  const chainConfirmed = result.on_chain_registered || result.matched_status === 'protected'
  if (exact) return <div className="verify-result verified exact-result">
    <div className="exact-heading"><div className="exact-thumb">{result.matched_image_url || previewUrl ? <img src={result.matched_image_url || previewUrl || undefined} alt={result.matched_title || 'Registered work'} /> : <FileText size={28} />}</div><div className="exact-title"><span className="result-kicker">VERIFIED RECORD</span><h2>This exact file is registered.</h2><p>#{String(result.artwork_id ?? 0).padStart(3, '0')} · “{result.matched_title || 'Registered work'}” · by {shortWallet(result.matched_wallet)}{matchedDate ? ` · ${matchedDate}` : ''}</p></div><div className="exact-status"><strong className="exact-badge">EXACT MATCH</strong><span className="exact-score">{percent(100)} <small>similarity</small></span></div></div>
    <div className="proof-summary"><div><span className="proof-dot">●</span><b>{chainConfirmed ? 'On-chain confirmed' : 'Local proof only'}</b></div>{result.matched_tx_hash ? <a href={`https://sepolia.etherscan.io/tx/${result.matched_tx_hash}`} target="_blank" rel="noreferrer">Tx: {shortHash(result.matched_tx_hash)} <ArrowUpRight size={13} /> <small>Etherscan</small></a> : <span className="proof-muted">No blockchain transaction</span>}{result.matched_block_number ? <span>Block #{result.matched_block_number}</span> : null}{result.matched_block_timestamp ? <span>{new Date(result.matched_block_timestamp).toLocaleString('vi-VN')}</span> : null}</div>
    <p className="exact-message">{result.message}</p><HashLine sha256={result.sha256} /><button className="primary-button gallery-result-button" onClick={() => onNavigate('gallery')}>View in gallery <ArrowUpRight size={15} /></button>
  </div>
  return <div className={`verify-result ${similar ? 'suspected' : 'neutral'}`}>
    <div className="verify-result-top"><div className="result-icon">{similar ? <AlertTriangle size={22} /> : <ScanLine size={22} />}</div><div><span className="result-kicker">{similar ? 'SIMILAR WORK DETECTED' : 'NOT REGISTERED'}</span><h2>{similar ? 'Similar work detected.' : 'This work is not registered.'}</h2></div><strong>{percent(score)}<small>similarity</small></strong></div>
    <div className="similarity-panel">
      <div className="closest-artwork"><div className="closest-thumb">{result.suspected_artwork_image_url ? <img src={result.suspected_artwork_image_url} alt={result.suspected_artwork_title || 'Closest registered work'} /> : result.media_type === 'written' ? <FileText size={24} /> : <ImagePlus size={24} />}</div><div className="closest-copy"><span>Closest match</span><b>{result.suspected_artwork_id ? `#${String(result.suspected_artwork_id).padStart(3, '0')} ${result.suspected_artwork_title ? `“${result.suspected_artwork_title}”` : ''}` : 'No registered work'}</b></div><strong>{percent(score)}</strong></div>
      <div className="similarity-track" role="meter" aria-label="Độ tương đồng" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}><div className="similarity-fill" style={{ width: `${score}%` }} /><span className="threshold-marker" style={{ left: `${threshold}%` }} /></div>
      <div className="similarity-legend"><span>{percent(0)}</span><span className="threshold-label" style={{ left: `${threshold}%` }}>threshold {percent(threshold)}</span><span>{percent(100)}</span></div><div className={`similarity-conclusion ${similar ? 'risk' : 'safe'}`}>{similar ? 'Similar work detected' : 'No close match — not registered'}</div>
    </div>
    <p>{result.message}</p><HashLine sha256={result.sha256} />{result.on_chain_registered && <div className="chain-confirm"><ShieldCheck size={15} /> Confirmed on Ethereum Sepolia</div>}
    <div className="verify-result-actions"><button className="secondary-button" onClick={() => onNavigate('protect')}>Protect this work <ArrowUpRight size={15} /></button></div>
  </div>
}
