import { ArrowLeft, Printer, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { api, WorkDetail } from '../api'
import { useEffect, useState } from 'react'
import { tr } from '../i18n'

type Props = { id: number; onBack: () => void }
const fullDate = (value: string) => new Date(value).toLocaleDateString('vi-VN')
const short = (value: string | null | undefined) => value ? `${value.slice(0, 8)}…${value.slice(-7)}` : '—'

export default function Certificate({ id, onBack }: Props) {
  const [work, setWork] = useState<WorkDetail | null>(null)
  useEffect(() => { void api.getArtwork(id).then(setWork).catch(() => setWork(null)) }, [id])
  if (!work) return <div className="certificate-loading">{tr('Loading certificate…')}</div>
  const publicUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin
  const verifyUrl = `${publicUrl}/verify?work=${work.id}`
  const protectedOnChain = work.status === 'protected'
  return <div className="certificate-shell"><div className="certificate-toolbar"><button className="ghost-button" onClick={onBack}><ArrowLeft size={15} /> {tr('Back to work')}</button><button className="primary-button" onClick={() => window.print()}><Printer size={15} /> {tr('Print / Save as PDF')}</button></div><article className="certificate-paper"><div className="certificate-frame"><div className="certificate-inner"><header className="certificate-header"><div className="certificate-brand"><div className="certificate-logo"><ShieldCheck size={22} /></div><div><strong>MediaGuard</strong><span>RIGHTS REGISTRY</span></div></div><code>No. MG-{String(work.id).padStart(3, '0')}</code></header><main className="certificate-body"><div className="certificate-label">{tr('CERTIFICATE OF REGISTRATION')}</div><h1>{work.title}</h1><p className="certificate-kind">{work.work_type || (work.kind === 'written' ? tr('Written work') : tr('Digital artwork'))} · {fullDate(work.created_at)}</p><p className="certificate-intro">{tr('This certificate records the digital fingerprint of the work identified below, submitted by its owner and registered on the Ethereum Sepolia network.')}</p><div className="certificate-table"><div><span>{tr('Owner wallet')}</span><strong>{work.owner_address || tr('Not connected')}</strong></div><div><span>SHA-256</span><strong className="certificate-hash">{work.sha256}</strong></div><div><span>pHash</span><strong>{work.phash || '—'}</strong></div><div><span>{tr('Network')}</span><strong>Ethereum Sepolia</strong></div>{protectedOnChain && work.tx_hash && <div><span>{tr('Transaction')}</span><strong>{short(work.tx_hash)}</strong></div>}</div></main><footer className="certificate-footer"><div className={`certificate-seal ${protectedOnChain ? 'seal-verified' : 'seal-pending'}`}><ShieldCheck size={27} /><strong>{protectedOnChain ? tr('VERIFIED ON-CHAIN') : tr('NOT YET ON-CHAIN')}</strong><span>{tr('Issued by MediaGuard Rights Registry')}</span></div><div className="certificate-qr"><QRCodeSVG value={verifyUrl} size={104} level="M" /><span>{tr('Quét để xác minh')}</span></div></footer><div className="certificate-disclaimer">{new URL(publicUrl).host}/verify · {tr('Chứng nhận này chỉ có giá trị khi hash khớp với bản ghi on-chain')}</div></div></div></article></div>
}
