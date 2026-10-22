import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, Building2, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Database, FileJson, FolderHeart, House, LayoutDashboard, Leaf, MoreHorizontal, Pencil, Plus, Search, ShieldCheck, Sparkles, Trash2, Users, X } from 'lucide-react'

const STORAGE_KEY = 'zhumeng-crm:v1'
const STATUSES = ['潜在客户', '跟进中', '已成交']
const STATUS_CLASS = { 潜在客户: 'potential', 跟进中: 'following', 已成交: 'completed' }
const EMPTY_FORM = { name: '', company: '', phone: '', email: '', status: '潜在客户', notes: '' }
const PAGE_SIZE = 8
const LIMITS = { name: 40, company: 100, phone: 30, email: 120, notes: 1000 }

function validCustomer(c) {
  return c && typeof c.id === 'string' && c.id.length > 0 && c.id.length <= 100
    && Object.entries(LIMITS).every(([key, limit]) => typeof c[key] === 'string' && c[key].length <= limit)
    && c.name.trim() && c.company.trim() && /^(?=.*\d)[+\d\s()（）-]{5,30}$/.test(c.phone)
    && (!c.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))
    && STATUSES.includes(c.status) && typeof c.createdAt === 'string' && Number.isFinite(Date.parse(c.createdAt))
}
function parseData(raw) {
  const parsed = JSON.parse(raw)
  if (parsed?.version !== 1 || !Array.isArray(parsed.customers) || parsed.customers.length > 10000
    || !parsed.customers.every(validCustomer) || new Set(parsed.customers.map(c => c.id)).size !== parsed.customers.length) {
    throw new Error('数据格式不正确')
  }
  return parsed.customers
}
function readCustomers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return { customers: raw ? parseData(raw) : [], error: '' }
  } catch {
    return { customers: [], error: '无法读取本地客户数据。为保护原数据，已暂停写入。请先导出原始备份，或检查浏览器的存储权限后刷新。' }
  }
}
function downloadJson(data, name) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const formatDate = value => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))

function Modal({ title, subtitle, children, onClose, className = '' }) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const first = ref.current.querySelector('input:not([type="file"]), select, textarea') || ref.current.querySelector('button')
    first?.focus()
    function keydown(e) {
      if (e.key === 'Escape') closeRef.current()
      if (e.key !== 'Tab') return
      const focusable = Array.from(ref.current.querySelectorAll('button, input, select, textarea, [tabindex="0"]')).filter(el => !el.disabled)
      const first = focusable[0]
      const last = focusable.at(-1)
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', keydown)
      previous?.focus()
    }
  }, [])
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section ref={ref} className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-subtitle">
      <header className="modal-header"><div><h2 id="modal-title">{title}</h2><p id="modal-subtitle">{subtitle}</p></div><button className="icon-button close-modal" aria-label="关闭弹窗" onClick={onClose}><X size={20} /></button></header>
      {children}
    </section>
  </div>
}

function CustomerForm({ customer, onSave, onClose }) {
  const [form, setForm] = useState(customer ? { ...customer } : { ...EMPTY_FORM })
  const [error, setError] = useState('')
  function submit(e) {
    e.preventDefault()
    const clean = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))
    if (!clean.name || !clean.company) { setError('请填写客户姓名和公司名称，不能仅输入空格。'); return }
    if (!/^(?=.*\d)[+\d\s()（）-]{5,30}$/.test(clean.phone)) { setError('请输入有效的联系电话（5–30 位，可包含 +、空格、括号和短横线）。'); return }
    if (onSave(clean) === false) setError('保存失败，请检查页面中的存储提示。你的填写内容仍保留在此处。')
  }
  function field(key) { return { value: form[key], onChange: e => setForm(prev => ({ ...prev, [key]: e.target.value })) } }
  return <Modal title={customer ? '编辑客户' : '新增客户'} subtitle={customer ? '更新客户资料，让每一次沟通都有据可循。' : '从一份客户档案开始，建立新的合作关系。'} onClose={onClose}>
    <form onSubmit={submit}>
      <div className="form-body">
        <div className="form-section-label"><Users size={15} /> 基本信息</div>
        <div className="form-grid">
          <label>客户姓名 <em>*</em><input {...field('name')} placeholder="请输入客户姓名" required maxLength={40} autoFocus /></label>
          <label>联系电话 <em>*</em><input {...field('phone')} type="tel" placeholder="请输入手机号或座机号" required maxLength={30} /></label>
          <label className="full-width">公司名称 <em>*</em><input {...field('company')} placeholder="请输入客户所在公司" required maxLength={100} /></label>
          <label>电子邮箱<input {...field('email')} type="email" placeholder="选填，例如 name@company.com" maxLength={120} /></label>
          <label>客户状态 <em>*</em><span className="select-wrapper"><select {...field('status')}>{STATUSES.map(status => <option key={status}>{status}</option>)}</select><ChevronDown size={15} /></span></label>
          <label className="full-width">备注信息<textarea {...field('notes')} placeholder="记录客户需求、沟通要点或下次跟进计划（选填）" maxLength={1000} rows={3} /><span className="field-hint">{form.notes.length} / 1000</span></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <footer className="modal-footer"><span><ShieldCheck size={14} /> 资料仅保存在本机浏览器</span><button type="button" className="button secondary" onClick={onClose}>取消</button><button className="button primary" type="submit"><Check size={16} />{customer ? '保存修改' : '创建客户'}</button></footer>
    </form>
  </Modal>
}

export default function App() {
  const [initial] = useState(readCustomers)
  const [customers, setCustomers] = useState(initial.customers)
  const [storageError, setStorageError] = useState(initial.error)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('全部客户')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [panel, setPanel] = useState(null)
  const [toast, setToast] = useState('')
  const [importError, setImportError] = useState('')
  const [pendingImport, setPendingImport] = useState(null)
  const importRef = useRef(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    function sync(event) {
      if (event.key !== STORAGE_KEY && event.key !== null) return
      const loaded = readCustomers()
      setCustomers(loaded.customers)
      setStorageError(loaded.error)
      setToast('已同步其他标签页的数据变化')
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const stats = useMemo(() => ({ total: customers.length, potential: customers.filter(c => c.status === '潜在客户').length, following: customers.filter(c => c.status === '跟进中').length, completed: customers.filter(c => c.status === '已成交').length }), [customers])
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return customers.filter(c => (filter === '全部客户' || c.status === filter) && [c.name, c.company, c.phone].some(value => value.toLocaleLowerCase().includes(needle)))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id))
  }, [customers, filter, query])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const conversionRate = stats.total ? Math.round(stats.completed / stats.total * 100) : 0

  function persist(next) {
    if (storageError) return false
    if (next.length > 10000) { setToast('最多支持 10,000 位客户，请先整理客户档案'); return false }
    try {
      // Avoid silently overwriting edits made in another tab before its storage event arrives.
      const current = localStorage.getItem(STORAGE_KEY)
      const disk = current ? parseData(current) : []
      if (JSON.stringify(disk) !== JSON.stringify(customers)) {
        setCustomers(disk)
        setToast('其他标签页已修改数据，请检查最新内容后重试')
        return false
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, customers: next }))
      setCustomers(next)
      return true
    } catch {
      setStorageError('客户数据保存失败，可能是存储空间不足或浏览器限制。现有数据未被覆盖，请先导出备份，检查存储权限后刷新重试。')
      return false
    }
  }
  function saveCustomer(form) {
    if (editing !== 'new' && !customers.some(c => c.id === editing.id)) {
      setToast('此客户已在其他标签页删除，请关闭弹窗后查看最新列表')
      return false
    }
    const next = editing === 'new'
      ? [{ ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...customers]
      : customers.map(c => c.id === editing.id ? { ...c, ...form, id: c.id, createdAt: c.createdAt } : c)
    if (!persist(next)) return false
    setToast(editing === 'new' ? '客户创建成功，新的合作由此开始' : '客户资料已更新')
    setEditing(null)
    if (editing === 'new') { setQuery(''); setFilter('全部客户'); setPage(1) }
    return true
  }
  function deleteCustomer() {
    if (!persist(customers.filter(c => c.id !== deleting.id))) return
    setDeleting(null)
    setToast('客户已删除')
  }
  function exportData() {
    try {
      const raw = storageError ? localStorage.getItem(STORAGE_KEY) : JSON.stringify({ version: 1, customers }, null, 2)
      if (raw === null) { setToast('没有可导出的原始数据，请检查浏览器存储权限'); return }
      downloadJson(raw, `筑梦企服-客户备份-${new Date().toISOString().slice(0, 10)}.json`)
      setToast(storageError ? '原始数据已导出，请妥善保管备份' : `已导出 ${customers.length} 位客户的备份`)
    } catch { setToast('无法导出数据，请检查浏览器的存储和下载权限') }
  }
  async function importData(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImportError('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('文件过大，请选择 10 MB 以内的备份文件。')
      const imported = parseData(await file.text())
      if (!imported.length) throw new Error('备份文件中没有客户数据。')
      setPendingImport(imported)
    } catch (e) { setImportError(e instanceof SyntaxError ? '无法识别此文件，请选择本系统导出的 JSON 备份。' : e.message) }
  }
  function confirmImport() {
    const ids = new Set(customers.map(c => c.id))
    const additions = pendingImport.filter(c => !ids.has(c.id))
    if (customers.length + additions.length > 10000) { setImportError('导入后超过 10,000 位客户，请缩小备份范围。'); setPendingImport(null); return }
    if (!persist([...customers, ...additions])) return
    setToast(`已导入 ${additions.length} 位客户，跳过 ${pendingImport.length - additions.length} 条重复记录`)
    setPendingImport(null)
    setPanel(null)
    setQuery(''); setFilter('全部客户'); setPage(1)
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a href="#" className="brand" aria-label="筑梦企服首页"><span className="brand-mark"><House size={24} strokeWidth={1.7} /></span><span><strong>筑梦企服</strong><small>ZHUMENG BUSINESS</small></span></a>
      <div className="workspace-label"><span className="workspace-dot" /> 企业客户工作空间</div>
      <div className="nav-caption">工作台 <span>WORKSPACE</span></div>
      <nav aria-label="主导航">
        <button className={`nav-item ${panel !== 'backup' ? 'active' : ''}`} onClick={() => { setPanel(null); document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' }) }}><LayoutDashboard size={19} /> 客户管理 <span className="nav-count">{stats.total}</span></button>
        <button className={`nav-item ${panel === 'backup' ? 'active' : ''}`} onClick={() => { setPanel('backup'); setImportError(''); setPendingImport(null) }}><Database size={19} /> 数据与备份 <ArrowUpRight className="nav-arrow" size={14} /></button>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><span className="note-icon"><Leaf size={21} /></span><h3>让每一份关系<br />持续生长。</h3><p>用心连接客户，<br />让合作拥有更多可能。</p><div className="note-line" /><span>BUILD CONNECTIONS, GROW TOGETHER</span></div>
        <button className="help-button" onClick={() => setPanel('help')}><CircleHelp size={17} /> 使用指南 <ArrowUpRight size={14} /></button>
        <div className="sidebar-version"><span className="status-dot" /> 本地工作空间 <span>v1.0</span></div>
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><span>工作台</span><ChevronRight size={14} /><strong>客户管理</strong></div><div className="topbar-right"><span className="local-indicator"><ShieldCheck size={15} /> 本地数据，安心管理</span><span className="topbar-divider" /><span className="user-avatar">筑</span><div className="user-label"><strong>我的工作空间</strong><span>本地使用 · 无需登录</span></div></div></header>
      <main>
        <section id="overview" className="page-intro"><div><div className="eyebrow"><span /> CUSTOMER RELATIONSHIP</div><h1>客户管理<span className="title-dot">.</span></h1><p>连接每一位客户，让每一次合作更进一步。</p></div><div className="intro-actions"><button className="button secondary" onClick={exportData}><ArrowDownToLine size={16} /> 导出客户</button><button className="button primary" onClick={() => setEditing('new')} disabled={!!storageError}><Plus size={18} /> 新增客户</button></div></section>
        {storageError && <div className="storage-warning" role="alert"><ShieldCheck size={20} /><span>{storageError}</span><button onClick={exportData}>导出原始备份</button></div>}
        <section className="stat-grid" aria-label="客户数据概览">
          {[
            { label: '客户总数', value: stats.total, icon: Users, color: 'green', detail: '所有客户，尽在掌握', filter: '全部客户' },
            { label: '潜在客户', value: stats.potential, icon: FolderHeart, color: 'amber', detail: '每一次连接，都是新的可能', filter: '潜在客户' },
            { label: '跟进中', value: stats.following, icon: MoreHorizontal, color: 'blue', detail: '持续沟通，靠近下一次合作', filter: '跟进中' },
            { label: '已成交', value: stats.completed, icon: CheckCheck, color: 'purple', detail: `客户成交率 ${conversionRate}%`, filter: '已成交' },
          ].map(stat => <button key={stat.label} className={`stat-card ${stat.color}`} onClick={() => { setFilter(stat.filter); setPage(1) }} aria-label={`查看${stat.label} ${stat.value}`}><div className="stat-top"><span>{stat.label}</span><span className="stat-icon"><stat.icon size={19} /></span></div><div className="stat-value" data-testid={`stat-${stat.color}`}>{stat.value}<span>位</span></div><div className="stat-detail"><span className="mini-dot" />{stat.detail}<ArrowUpRight size={14} /></div></button>)}
        </section>
        <section className="customer-panel" aria-labelledby="customer-list-title">
          <div className="panel-heading"><div className="panel-title"><h2 id="customer-list-title">客户档案</h2><span>{customers.length} 位客户</span></div><span className="panel-caption"><span className="status-dot" /> 自动保存至本地</span></div>
          <div className="list-toolbar"><div className="filter-tabs" role="tablist" aria-label="按客户状态筛选">{['全部客户', ...STATUSES].map(status => <button key={status} role="tab" aria-selected={filter === status} className={filter === status ? 'selected' : ''} onClick={() => { setFilter(status); setPage(1) }}>{status}{status === '全部客户' && <span>{customers.length}</span>}</button>)}</div><div className="search-box"><Search size={17} /><input aria-label="搜索客户" placeholder="搜索姓名、公司或电话" value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} />{query && <button aria-label="清空搜索" onClick={() => { setQuery(''); setPage(1) }}><X size={15} /></button>}<span className="search-shortcut">搜索</span></div></div>
          <div className="table-scroll"><table><thead><tr><th className="number-cell">序号</th><th>客户姓名</th><th>公司名称</th><th>联系电话</th><th>客户状态</th><th>创建时间 <ChevronDown size={12} /></th><th className="actions-heading">操作</th></tr></thead><tbody>{visible.map((customer, i) => <tr key={customer.id}>
            <td className="number-cell">{String((currentPage - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}</td><td><div className="customer-name"><span className={`customer-avatar avatar-${i % 4}`}>{customer.name.slice(0, 1)}</span><div><strong title={customer.name}>{customer.name}</strong><span>{customer.email || '暂无邮箱'}</span></div></div></td>
            <td><div className="company-cell"><Building2 size={14} /><span title={customer.company}>{customer.company}</span></div></td><td className="phone-cell">{customer.phone}</td><td><span className={`status-badge ${STATUS_CLASS[customer.status]}`}><span />{customer.status}</span></td><td className="date-cell">{formatDate(customer.createdAt)}</td><td><div className="row-actions"><button className="icon-button" aria-label={`编辑客户 ${customer.name}`} title="编辑客户" onClick={() => setEditing(customer)} disabled={!!storageError}><Pencil size={16} /></button><button className="icon-button delete-button" aria-label={`删除客户 ${customer.name}`} title="删除客户" onClick={() => setDeleting(customer)} disabled={!!storageError}><Trash2 size={16} /></button></div></td>
          </tr>)}</tbody></table></div>
          {!visible.length && <div className="empty-state"><div className="empty-art"><span /><Users size={32} strokeWidth={1.4} /><span /></div><h3>{customers.length ? '暂时没有匹配的客户' : '从第一位客户，开启新的合作'}</h3><p>{customers.length ? '试试其他关键词，或切换客户状态。' : '将客户资料整理在这里，让每一次跟进都清晰有序。'}</p>{customers.length ? <button className="button secondary" onClick={() => { setQuery(''); setFilter('全部客户'); setPage(1) }}>重置筛选</button> : <button className="button primary" onClick={() => setEditing('new')} disabled={!!storageError}><Plus size={16} /> 添加第一位客户</button>}<div className="empty-confidential"><ShieldCheck size={13} /> 客户资料仅保存在你的浏览器中</div></div>}
          <footer className="table-footer"><span>{filtered.length ? <>显示第 <strong>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}</strong> 条，共 <strong>{filtered.length}</strong> 位客户</> : '共 0 位客户'}{query.trim() && <span className="search-result-note"> · 搜索结果</span>}</span><div className="pagination"><span>每页 {PAGE_SIZE} 条</span><button className="page-arrow" aria-label="上一页" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button><span className="page-current">{currentPage}</span><span className="page-total">/ {pageCount}</span><button className="page-arrow" aria-label="下一页" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></footer>
        </section>
        <div className="bottom-tip"><Sparkles size={15} /><p>每一次用心跟进，都在为下一次合作积蓄力量。</p><span>把客户放在心上，把成长握在手中。</span></div>
        <footer className="page-footer"><span>© {new Date().getFullYear()} 筑梦企服 <span className="footer-divider">/</span> 让企业服务更有温度</span><span><span className="status-dot" /> 数据存储于当前浏览器 · 建议定期导出备份</span></footer>
      </main>
    </div>

    {editing && <CustomerForm customer={editing === 'new' ? null : editing} onSave={saveCustomer} onClose={() => setEditing(null)} />}
    {deleting && <Modal title="确认删除这位客户？" subtitle="此操作无法撤销，请确认后再继续。" onClose={() => setDeleting(null)} className="small-modal"><div className="delete-body"><div className="delete-symbol"><Trash2 size={23} /></div><p>即将删除 <strong>{deleting.name}</strong> 的客户档案。</p><span>{deleting.company}</span></div><footer className="modal-footer"><button className="button secondary" onClick={() => setDeleting(null)}>取消</button><button className="button danger" onClick={deleteCustomer}>确认删除</button></footer></Modal>}
    {panel === 'backup' && <Modal title="数据与备份" subtitle="为客户资料留一份备份，让每一份积累都安心。" onClose={() => { setPanel(null); setPendingImport(null) }} className="backup-modal"><div className="backup-body"><div className="backup-info"><Database size={23} /><div><strong>{stats.total} 位客户 · 本地存储</strong><p>数据仅保存在当前设备的此浏览器中，不会上传到服务器。清除浏览器数据可能导致资料丢失。</p></div></div><button className="backup-action" onClick={exportData}><span className="backup-icon"><ArrowDownToLine size={21} /></span><span><strong>导出客户备份</strong><small>下载 JSON 文件，保留完整客户资料</small></span><ArrowUpRight size={18} /></button><button className="backup-action" onClick={() => importRef.current?.click()} disabled={!!storageError}><span className="backup-icon blue"><ArrowUpFromLine size={21} /></span><span><strong>导入已有备份</strong><small>合并客户资料，相同 ID 的记录保留现有版本</small></span><ArrowUpRight size={18} /></button><input ref={importRef} type="file" accept=".json,application/json" aria-label="选择客户备份文件" className="visually-hidden" onChange={importData} />{importError && <p className="form-error" role="alert">{importError}</p>}{pendingImport && <div className="import-confirm"><FileJson size={19} /><p>已读取 <strong>{pendingImport.length}</strong> 位客户。将合并至现有客户列表，重复记录会自动跳过。</p><div><button className="button secondary" onClick={() => setPendingImport(null)}>取消</button><button className="button primary" onClick={confirmImport}>确认导入</button></div></div>}<p className="privacy-note"><ShieldCheck size={15} /> 备份包含客户联系方式，请妥善保管，避免泄露。</p></div></Modal>}
    {panel === 'help' && <Modal title="欢迎使用筑梦企服" subtitle="简单几步，把客户关系管理得井井有条。" onClose={() => setPanel(null)}><div className="help-body">{[['01', '建立客户档案', '点击「新增客户」，填写姓名、公司和电话，也可以添加邮箱与跟进备注。'], ['02', '让每次跟进有迹可循', '点击客户行中的编辑按钮，更新资料或切换潜在客户、跟进中、已成交状态。'], ['03', '快速找到重要客户', '使用姓名、公司或电话搜索，点击状态标签或统计卡片筛选客户。'], ['04', '定期备份你的积累', '前往「数据与备份」导出 JSON 备份。换设备时可导入；不同浏览器不会自动同步。']].map(([n, title, content]) => <div className="help-step" key={n}><span>{n}</span><div><h3>{title}</h3><p>{content}</p></div></div>)}<p className="privacy-note">请使用固定的访问地址。隐私模式下的数据通常会在关闭窗口后清除。</p></div></Modal>}
    {toast && <div className="toast" role="status"><span><Check size={15} /></span>{toast}<button aria-label="关闭提示" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>
}
