import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogIn,
  Menu,
  ScanLine,
  ShieldCheck,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import {
  api,
  Artwork,
  AUTH_TOKEN_KEY,
  WALLET_ADDRESS_KEY,
  VerifyResult,
} from "./api";
import { connectWallet, signWalletMessage } from "./wallet";
import Gallery from "./components/Gallery";
import VerifyResultCard from "./components/VerifyResultCard";
import WorkDetail from "./components/WorkDetail";
import Certificate from "./components/Certificate";
import { getInitialLocale, setActiveLocale, tr, type Locale } from "./i18n";

type View = "gallery" | "protect" | "verify" | "work" | "certificate";
type Toast = { type: "success" | "error"; message: string } | null;

const navItems: {
  id: View;
  label: string;
  icon: typeof LayoutDashboard;
  note: string;
}[] = [
  {
    id: "gallery",
    label: "Gallery",
    icon: LayoutDashboard,
    note: "Tác phẩm đã bảo hộ",
  },
  {
    id: "protect",
    label: "Upload & Protect",
    icon: UploadCloud,
    note: "Đăng ký bản quyền",
  },
  { id: "verify", label: "Verify", icon: ScanLine, note: "Kiểm tra tác phẩm" },
];

function routeFromPath(pathname: string): {
  view: View;
  workId: number | null;
} {
  const match = pathname.match(/^\/works\/(\d+)(\/certificate)?$/);
  if (match)
    return {
      view: match[2] ? "certificate" : "work",
      workId: Number(match[1]),
    };
  if (pathname === "/protect") return { view: "protect", workId: null };
  if (pathname === "/verify") return { view: "verify", workId: null };
  return { view: "gallery", workId: null };
}

function shortHash(value: string | null | undefined) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : "Chưa ghi chain";
}
function shortWallet(value: string | null | undefined) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Chưa kết nối";
}
function statusLabel(status: string) {
  return (
    (
      {
        protected: "On-chain",
        approved_local: "Local proof",
        pending_chain: "Đang ghi chain",
        chain_failed: "Chain lỗi",
      } as Record<string, string>
    )[status] ?? status
  );
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);
  return url;
}

function App() {
  const initialRoute = routeFromPath(window.location.pathname);
  const [view, setView] = useState<View>(initialRoute.view);
  const [workId, setWorkId] = useState<number | null>(initialRoute.workId);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [wallet, setWallet] = useState<string | null>(() =>
    localStorage.getItem(WALLET_ADDRESS_KEY)
  );
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(AUTH_TOKEN_KEY)
  );
  const [toast, setToast] = useState<Toast>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [locale, setLocale] = useState<Locale>(() => getInitialLocale());

  const notify = (next: Toast) => {
    setToast(next);
    window.setTimeout(() => setToast(null), 4000);
  };
  const changeLocale = (next: Locale) => {
    setActiveLocale(next);
    window.localStorage.setItem("mediaguard_locale", next);
    setLocale(next);
  };
  const loadArtworks = async () => {
    setLoadingGallery(true);
    try {
      setArtworks(await api.listArtworks());
    } catch {
      notify({
        type: "error",
        message: tr("Không tải được gallery. Kiểm tra FastAPI đang chạy.", locale),
      });
    } finally {
      setLoadingGallery(false);
    }
  };
  useEffect(() => {
    if (view === "gallery") void loadArtworks();
  }, [token, view]);
  useEffect(() => {
    const onAuthExpired = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail
        ?.message;
      setToken(null);
      setAuthOpen(true);
      notify({
        type: "error",
        message:
          message ?? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      });
    };
    window.addEventListener("mediaguard:auth-expired", onAuthExpired);
    return () =>
      window.removeEventListener("mediaguard:auth-expired", onAuthExpired);
  }, []);
  useEffect(() => {
    const onPopState = () => {
      const route = routeFromPath(window.location.pathname);
      setView(route.view);
      setWorkId(route.workId);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    document.title = `${
      view === "work" || view === "certificate"
        ? tr("Work detail", locale)
        : tr(navItems.find((item) => item.id === view)?.label ?? "MediaGuard", locale)
    } · MediaGuard`;
  }, [view, locale]);
  const navigate = (nextView: View) => {
    const path = nextView === "gallery" ? "/" : `/${nextView}`;
    window.history.pushState({}, "", path);
    setView(nextView);
    setWorkId(null);
  };
  const navigatePath = (path: string) => {
    const route = routeFromPath(path);
    window.history.pushState({}, "", path);
    setView(route.view);
    setWorkId(route.workId);
  };

  const verifyConnectedWallet = async (connectedAddress: string) => {
    const nonce = await api.walletNonce();
    const signed = await signWalletMessage(nonce.message);
    if (signed.address.toLowerCase() !== connectedAddress.toLowerCase())
      throw new Error("Tài khoản MetaMask hiện tại khác với ví đã kết nối.");
    const walletToken = await api.walletVerify(
      signed.address,
      signed.signature,
      nonce.nonce
    );
    localStorage.setItem(AUTH_TOKEN_KEY, walletToken.access_token);
    localStorage.setItem(WALLET_ADDRESS_KEY, signed.address);
    setToken(walletToken.access_token);
    setWallet(signed.address);
    notify({
      type: "success",
      message: "Ví đã được xác thực. Bạn có thể bảo hộ tác phẩm.",
    });
    return signed.address;
  };

  const onWallet = async () => {
    try {
      const address = await connectWallet();
      localStorage.setItem(WALLET_ADDRESS_KEY, address);
      setWallet(address);
      if (token) await verifyConnectedWallet(address);
      else
        notify({
          type: "success",
          message: `Đã kết nối ${shortWallet(
            address
          )}. Đăng nhập để xác thực ví.`,
        });
    } catch (error) {
      notify({
        type: "error",
        message:
          error instanceof Error ? error.message : "Không thể kết nối ví.",
      });
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    notify({
      type: "success",
      message: "Đã đăng xuất khỏi MediaGuard. Ví vẫn được giữ kết nối.",
    });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="brand-name">MediaGuard</div>
            <div className="brand-sub">RIGHTS REGISTRY</div>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-section-label">{tr("Workspace", locale)}</div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => {
                navigate(item.id);
                setMobileOpen(false);
              }}
            >
              <item.icon size={18} />
              <span>
                <b>{tr(item.label, locale)}</b>
                <small>{tr(item.note, locale)}</small>
              </span>
              {view === item.id && (
                <ChevronRight size={15} className="nav-chevron" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="chain-card">
          <div className="chain-dot" />
          <div>
            <b>{tr("Sepolia network", locale)}</b>
            <small>{tr("Ethereum testnet", locale)}</small>
          </div>
          <span className="live-pill">LIVE</span>
        </div>
        <div className="sidebar-foot">
          <span className="status-dot" /> {tr("System operational", locale)} <span>v0.2</span>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="mobile-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Đóng menu"
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-inner content-container">
            <button
              className="icon-button menu-button"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumbs">
              <span>MediaGuard</span>
              <ChevronRight size={14} />
              <b>
                {view === "work"
                  ? tr("Work detail", locale)
                  : view === "certificate"
                  ? tr("Certificate", locale)
                  : tr(navItems.find((item) => item.id === view)?.label ?? "Gallery", locale)}
              </b>
            </div>
            <div className="top-actions">
              <div className="language-toggle" role="group" aria-label="Language">
                <button type="button" className={locale === "en" ? "active" : ""} aria-pressed={locale === "en"} onClick={() => changeLocale("en")}>EN</button>
                <button type="button" className={locale === "vi" ? "active" : ""} aria-pressed={locale === "vi"} onClick={() => changeLocale("vi")}>VI</button>
              </div>
              <button
                className={`wallet-chip ${wallet ? "connected" : ""}`}
                onClick={onWallet}
              >
                <Wallet size={16} />
                <span>{shortWallet(wallet)}</span>
              </button>
              {token ? (
                <>
                  <div className="user-avatar">MG</div>
                  <button className="logout-button" onClick={logout}>
                    {tr("Log out", locale)}
                  </button>
                </>
              ) : (
                <button
                  className="login-button"
                  onClick={() => setAuthOpen(true)}
                >
                  <LogIn size={16} /> {tr("Log in", locale)}
                </button>
              )}
            </div>
          </div>
        </header>
        <div className="content-wrap content-container">
          {view === "gallery" && (
            <Gallery
              artworks={artworks}
              loading={loadingGallery}
              authenticated={Boolean(token)}
              onRefresh={() => void loadArtworks()}
              onNavigate={navigate}
              onOpenWork={(id) => navigatePath(`/works/${id}`)}
              notify={notify}
            />
          )}
          {view === "work" && workId !== null && (
            <WorkDetail
              id={workId}
              authenticated={Boolean(token)}
              notify={notify}
              onNavigate={navigatePath}
            />
          )}
          {view === "certificate" && workId !== null && (
            <Certificate
              id={workId}
              onBack={() => navigatePath(`/works/${workId}`)}
            />
          )}
          {view === "protect" && (
            <Protect
              authenticated={Boolean(token)}
              wallet={wallet}
              onDone={() => {
                void loadArtworks();
                navigate("gallery");
              }}
              notify={notify}
            />
          )}
          {view === "verify" && (
            <Verify notify={notify} onNavigate={navigate} />
          )}
        </div>
      </main>
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSuccess={async (nextToken) => {
            localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
            setToken(nextToken);
            setAuthOpen(false);
            if (wallet) {
              try {
                await verifyConnectedWallet(wallet);
              } catch (error) {
                notify({
                  type: "error",
                  message:
                    error instanceof Error
                      ? error.message
                      : "Đăng nhập thành công nhưng chưa ký xác thực ví.",
                });
              }
            } else
              notify({ type: "success", message: "Đăng nhập thành công." });
          }}
          notify={notify}
        />
      )}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
          </div>
          {toast.message}
          <button onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function Protect({
  authenticated,
  wallet,
  onDone,
  notify,
}: {
  authenticated: boolean;
  wallet: string | null;
  onDone: () => void;
  notify: (toast: Toast) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const previewUrl = useObjectUrl(file);
  const [mediaType, setMediaType] = useState<"image" | "written">("image");
  const [workType, setWorkType] = useState("essay");
  const [language, setLanguage] = useState("Vietnamese");
  const [license, setLicense] = useState("All rights reserved");
  const [visibility, setVisibility] = useState("public");
  const [showPublicPreview, setShowPublicPreview] = useState(false);
  const [allowDownload, setAllowDownload] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [showContactEmail, setShowContactEmail] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Artwork | null>(null);
  const choose = (next: File | undefined) => {
    const suffix = next?.name.toLowerCase().split(".").pop();
    const validImage = Boolean(next?.type.startsWith("image/"));
    const validWritten = Boolean(
      suffix && ["txt", "md", "markdown", "pdf"].includes(suffix)
    );
    if (
      next &&
      ((mediaType === "image" && validImage) ||
        (mediaType === "written" && validWritten))
    )
      setFile(next);
    else if (next)
      notify({
        type: "error",
        message:
          mediaType === "written"
            ? "Tác phẩm viết cần là TXT, Markdown hoặc PDF."
            : "Vui lòng chọn file ảnh PNG, JPEG hoặc WebP.",
      });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file)
      return notify({ type: "error", message: "Hãy chọn một ảnh trước." });
    if (!authenticated)
      return notify({
        type: "error",
        message: "Hãy đăng nhập trước khi bảo hộ tác phẩm.",
      });
    if (!wallet)
      return notify({
        type: "error",
        message: "Hãy kết nối và ký xác thực MetaMask trước.",
      });
    setBusy(true);
    try {
      const artwork = await api.registerArtwork(
        file,
        title || file.name.replace(/\.[^/.]+$/, ""),
        description,
        tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        showContactEmail,
        {
          mediaType,
          workType,
          language,
          license,
          visibility,
          showPublicPreview,
          allowDownload,
        }
      );
      setResult(artwork);
      notify({
        type: "success",
        message:
          artwork.status === "protected"
            ? "Tác phẩm đã được ghi nhận on-chain."
            : "Đã lưu kết quả quét local.",
      });
    } catch (error) {
      notify({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Không thể đăng ký tác phẩm.",
      });
    } finally {
      setBusy(false);
    }
  };
  if (result)
    return (
      <section className="page-section narrow-section">
        <div className="success-panel">
          <div className="success-orb">
            <Check size={32} />
          </div>
          <div className="eyebrow">PROTECTION COMPLETE</div>
          <h1>{result.title}</h1>
          <p>
            Ảnh đã vượt qua lớp SHA-256 và pHash. Tác phẩm đang ở trạng thái{" "}
            <b>{statusLabel(result.status)}</b>.
          </p>
          <div className="result-lines">
            <div>
              <span>SHA-256</span>
              <b>{result.sha256}</b>
            </div>
            <div>
              <span>Originality score</span>
              <b>{result.originality.toFixed(1)}%</b>
            </div>
            {result.tx_hash && (
              <div>
                <span>Transaction</span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${result.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortHash(result.tx_hash)} <ArrowUpRight size={14} />
                </a>
              </div>
            )}
          </div>
          <div className="button-row">
            <button className="primary-button" onClick={onDone}>
              Go to gallery <ArrowUpRight size={16} />
            </button>
            <button className="ghost-button" onClick={() => setResult(null)}>
              Protect another
            </button>
          </div>
        </div>
      </section>
    );
  return (
    <section className="page-section narrow-section">
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">
            <UploadCloud size={14} /> PROTECT YOUR WORK
          </div>
          <h1>Make it yours.</h1>
          <p>
            Upload ảnh gốc, ký bằng ví của bạn và tạo chứng nhận không thể sửa.
          </p>
        </div>
      </div>
      <div className="protect-stepper">
        <div className="step-active">
          <b>01</b>
          <span>Details</span>
        </div>
        <div>
          <b>02</b>
          <span>Wallet signature</span>
        </div>
        <div>
          <b>03</b>
          <span>On-chain proof</span>
        </div>
      </div>
      <form className="protect-layout" onSubmit={submit}>
        <div className="media-selector">
          <button
            type="button"
            className={mediaType === "image" ? "selected" : ""}
            onClick={() => {
              setMediaType("image");
              setFile(null);
            }}
          >
            <ImagePlus size={15} /> Image
          </button>
          <button
            type="button"
            className={mediaType === "written" ? "selected" : ""}
            onClick={() => {
              setMediaType("written");
              setFile(null);
            }}
          >
            <FileText size={15} /> Written work
          </button>
        </div>
        <div
          className={`dropzone ${dragging ? "dragging" : ""} ${
            file ? "has-file" : ""
          }`}
          onDragOver={(event: DragEvent) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            choose(event.dataTransfer.files[0]);
          }}
        >
          {file ? (
            <>
              <div
                className={
                  mediaType === "image" ? "file-preview" : "document-preview"
                }
              >
                {mediaType === "image" && previewUrl ? (
                  <img src={previewUrl} alt="Ảnh xem trước" />
                ) : (
                  <FileText size={34} />
                )}
              </div>
              <div className="file-name">{file.name}</div>
              <span className="file-size">
                {(file.size / 1024 / 1024).toFixed(2)} MB · ready to scan
              </span>
              <button
                type="button"
                className="remove-file"
                onClick={() => setFile(null)}
              >
                <X size={14} /> Remove
              </button>
            </>
          ) : (
            <>
              <div className="upload-orb">
                <UploadCloud size={25} />
              </div>
              <h3>
                Drop{" "}
                {mediaType === "image"
                  ? "your image here"
                  : "your written work here"}
              </h3>
              <p>
                or click to browse ·{" "}
                {mediaType === "image"
                  ? "PNG, JPG, WebP"
                  : "TXT, Markdown, PDF"}{" "}
                · max 10 MB
              </p>
              <input
                type="file"
                accept={
                  mediaType === "image"
                    ? "image/png,image/jpeg,image/webp"
                    : ".txt,.md,.markdown,.pdf"
                }
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  choose(event.target.files?.[0])
                }
              />
            </>
          )}
        </div>
        <div className="protect-form">
          <div className="form-head">
            <span className="step-number">01</span>
            <div>
              <b>Work details</b>
              <small>Metadata sẽ được ghi cùng proof</small>
            </div>
          </div>
          <label>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ví dụ: Moon over Da Nang"
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Mô tả ngắn về tác phẩm…"
              rows={4}
            />
          </label>
          <label>
            Tags
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="photography, night, vietnam"
            />
            <span className="label-hint">Phân tách tag bằng dấu phẩy</span>
          </label>
          {mediaType === "written" && (
            <>
              <div className="inline-fields">
                <label>
                  Work type
                  <select
                    value={workType}
                    onChange={(event) => setWorkType(event.target.value)}
                  >
                    <option value="essay">Essay</option>
                    <option value="short-story">Short story</option>
                    <option value="poem">Poem</option>
                    <option value="article">Article</option>
                    <option value="research">Research</option>
                    <option value="lyrics">Lyrics</option>
                  </select>
                </label>
                <label>
                  Language
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                  >
                    <option>Vietnamese</option>
                    <option>English</option>
                    <option>Other</option>
                  </select>
                </label>
              </div>
              <div className="inline-fields">
                <label>
                  License
                  <select
                    value={license}
                    onChange={(event) => setLicense(event.target.value)}
                  >
                    <option>All rights reserved</option>
                    <option>CC BY 4.0</option>
                    <option>CC BY-NC 4.0</option>
                    <option>Personal use only</option>
                  </select>
                </label>
                <label>
                  Visibility
                  <select
                    value={visibility}
                    onChange={(event) => {
                      setVisibility(event.target.value);
                      if (event.target.value === "private") {
                        setShowPublicPreview(false);
                        setAllowDownload(false);
                      }
                    }}
                  >
                    <option value="public">Public exhibition</option>
                    <option value="private">Private registry</option>
                  </select>
                </label>
              </div>
              <label className="contact-opt-in">
                <input
                  type="checkbox"
                  checked={showPublicPreview}
                  disabled={visibility === "private"}
                  onChange={(event) =>
                    setShowPublicPreview(event.target.checked)
                  }
                />
                <span>
                  <b>Cho phép đọc preview công khai</b>
                  <small>
                    Chỉ hiển thị 400 từ đầu, không công khai file gốc.
                  </small>
                </span>
              </label>
              <label className="contact-opt-in">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  disabled={visibility === "private"}
                  onChange={(event) => setAllowDownload(event.target.checked)}
                />
                <span>
                  <b>Cho phép tải file</b>
                  <small>Chỉ bật nếu bạn muốn người xem tải bản gốc.</small>
                </span>
              </label>
            </>
          )}
          <label className="contact-opt-in">
            <input
              type="checkbox"
              checked={showContactEmail}
              onChange={(event) => setShowContactEmail(event.target.checked)}
            />
            <span>
              <b>Hiển thị Gmail liên hệ trên exhibition</b>
              <small>
                Mặc định tắt. Chỉ bật nếu bạn muốn người xem liên hệ trực tiếp.
              </small>
            </span>
          </label>
          <div className="scan-note">
            <ShieldCheck size={16} />
            <span>
              <b>AI pre-check enabled</b>
              <small>SHA-256 exact match · pHash similarity scan</small>
            </span>
          </div>
          <button className="primary-button full-button" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="spin" size={17} /> Scanning & protecting…
              </>
            ) : (
              <>
                <ShieldCheck size={17} /> Scan & protect{" "}
                <ArrowUpRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

function Verify({
  notify,
  onNavigate,
}: {
  notify: (toast: Toast) => void;
  onNavigate: (view: View) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [verifyType, setVerifyType] = useState<"image" | "written">("image");
  const previewUrl = useObjectUrl(file);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const choose = (next: File | undefined) => {
    const suffix = next?.name.toLowerCase().split(".").pop();
    const valid =
      verifyType === "image"
        ? Boolean(next?.type.startsWith("image/"))
        : Boolean(suffix && ["txt", "md", "markdown", "pdf"].includes(suffix));
    if (next && valid) {
      setFile(next);
      setResult(null);
    } else if (next)
      notify({
        type: "error",
        message:
          verifyType === "written"
            ? "File cần là TXT, Markdown hoặc PDF."
            : "File cần là một ảnh hợp lệ.",
      });
  };
  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setResult(await api.verify(file));
    } catch (error) {
      notify({
        type: "error",
        message: error instanceof Error ? error.message : "Verify thất bại.",
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="page-section narrow-section verify-page">
      <div className="page-heading compact verify-heading">
        <div>
          <div className="eyebrow">
            <ScanLine size={14} /> PUBLIC VERIFICATION
          </div>
          <h1>Does it belong?</h1>
          <p>
            Kiểm tra dấu vân tay ảnh mà không cần đăng nhập. So khớp SHA-256 và
            pHash với registry công khai.
          </p>
        </div>
        <div className="verify-key">
          <span className="key-dot" /> SHA-256 + pHash
        </div>
      </div>
      <div className="verify-layout">
        <div className="media-selector">
          <button
            type="button"
            className={verifyType === "image" ? "selected" : ""}
            onClick={() => {
              setVerifyType("image");
              setFile(null);
              setResult(null);
            }}
          >
            <ImagePlus size={15} /> Image
          </button>
          <button
            type="button"
            className={verifyType === "written" ? "selected" : ""}
            onClick={() => {
              setVerifyType("written");
              setFile(null);
              setResult(null);
            }}
          >
            <FileText size={15} /> Written work
          </button>
        </div>
        <div
          className={`verify-drop ${file ? "has-file" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            choose(event.dataTransfer.files[0]);
          }}
        >
          {file ? (
            <>
              <div className="verify-file-thumb">
                {verifyType === "image" && previewUrl ? (
                  <img src={previewUrl} alt="Ảnh cần verify" />
                ) : (
                  <FileText size={24} />
                )}
              </div>
              <div className="verify-file-copy">
                <b>{file.name}</b>
                <span>
                  {(file.size / 1024 / 1024).toFixed(1)} MB · sẵn sàng kiểm tra
                </span>
              </div>
              <button
                type="button"
                className="ghost-button verify-change"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
              >
                Change file
              </button>
            </>
          ) : (
            <>
              <div className="scan-orb">
                <ScanLine size={26} />
              </div>
              <h3>
                Drop {verifyType === "image" ? "an image" : "a written work"} to
                verify
              </h3>
              <p>We compare it against the public registry.</p>
              <input
                type="file"
                accept={
                  verifyType === "image"
                    ? "image/png,image/jpeg,image/webp"
                    : ".txt,.md,.markdown,.pdf"
                }
                onChange={(event) => choose(event.target.files?.[0])}
              />
            </>
          )}
        </div>
        <button
          className="primary-button verify-run"
          disabled={!file || busy}
          onClick={submit}
        >
          {busy ? (
            <>
              <Loader2 className="spin" size={17} /> Comparing…
            </>
          ) : (
            <>
              <ScanLine size={17} /> Run verification
            </>
          )}
        </button>
        {result && (
          <VerifyResultCard
            result={result}
            previewUrl={previewUrl}
            onNavigate={onNavigate}
          />
        )}
        {!result && (
          <div className="how-it-works">
            <h3>How it works</h3>
            <div className="how-steps">
              <div>
                <b>01</b>
                <strong>Hash</strong>
                <span>Exact file fingerprint</span>
              </div>
              <div>
                <b>02</b>
                <strong>pHash / text</strong>
                <span>Similarity scan</span>
              </div>
              <div>
                <b>03</b>
                <strong>On-chain lookup</strong>
                <span>Immutable proof check</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
function AuthModal({
  onClose,
  onSuccess,
  notify,
}: {
  onClose: () => void;
  onSuccess: (token: string) => void;
  notify: (toast: Toast) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(email, password);
      onSuccess(result.access_token);
    } catch (error) {
      notify({
        type: "error",
        message: error instanceof Error ? error.message : "Không thể xác thực.",
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="auth-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="auth-mark">
          <ShieldCheck size={22} />
        </div>
        <div className="eyebrow">MEDIA GUARDIAN ACCESS</div>
        <h2>
          {mode === "login"
            ? "Welcome back."
            : "Create your registry identity."}
        </h2>
        <p>
          {mode === "login"
            ? "Đăng nhập để bảo hộ tác phẩm bằng ví của bạn."
            : "Tạo tài khoản để bắt đầu xây dựng registry."}
        </p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tối thiểu 8 ký tự"
            />
          </label>
          <button className="primary-button full-button" disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={17} />
            ) : mode === "login" ? (
              <>
                <LogIn size={17} /> Đăng nhập
              </>
            ) : (
              <>
                Tạo tài khoản <ArrowUpRight size={16} />
              </>
            )}
          </button>
        </form>
        <button
          className="switch-auth"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "Chưa có tài khoản? Đăng ký"
            : "Đã có tài khoản? Đăng nhập"}
        </button>
      </div>
    </div>
  );
}

export default App;
