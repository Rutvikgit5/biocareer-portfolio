import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import "./App.css"

const LIVE_MODE = import.meta.env.PROD
const API = LIVE_MODE ? "" : (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "")
const REGION_OPTIONS = [
  ["all", "All requested regions"], ["denmark", "Denmark"], ["netherlands", "Netherlands"],
  ["switzerland", "Switzerland"], ["portugal", "Portugal"], ["norway", "Norway"],
  ["sweden", "Sweden"], ["france", "France"], ["australia", "Australia"],
  ["dubai", "Dubai / UAE"], ["singapore", "Singapore"], ["india", "India / APAC"],
]
const demoJobs = [
  { id: "j1", title: "Bioinformatics Analyst, Genomics", company: "Illumina", location: "San Diego, CA · Hybrid", seniority: "entry", remote_ok: true, fit_score: 94, salary_min: 72000, salary_max: 98000, posted_at: "Sample listing", source_url: "https://www.illumina.com/company/careers.html", gap_report: { fit_reason: "Strong match for your computational biology background and experience interpreting genomic data.", skills_matched: ["Python", "NGS", "R", "Data analysis"], skills_missing: ["Nextflow"], visa_sponsorship: true, opt_friendly: true } },
  { id: "j2", title: "Research Associate, Computational Biology", company: "Broad Institute", location: "Cambridge, MA · On-site", seniority: "entry", remote_ok: false, fit_score: 89, salary_min: 68000, salary_max: 92000, posted_at: "Sample listing", source_url: "https://www.broadinstitute.org/careers", gap_report: { fit_reason: "Your molecular biology training and scripting skills align well with this interdisciplinary research team.", skills_matched: ["Python", "Molecular biology", "Statistics"], skills_missing: ["Single-cell RNA-seq"], visa_sponsorship: true, opt_friendly: true } },
  { id: "j3", title: "Junior Computational Biologist", company: "Genentech", location: "South San Francisco, CA · Hybrid", seniority: "entry", remote_ok: true, fit_score: 86, salary_min: 80000, salary_max: 112000, posted_at: "Sample listing", source_url: "https://www.gene.com/careers", gap_report: { fit_reason: "A promising early-career role with a close match to your data science and biology interests.", skills_matched: ["Python", "Biology", "Machine learning"], skills_missing: ["Cloud computing"], visa_sponsorship: true, opt_friendly: true } },
  { id: "j4", title: "Clinical Genomics Data Analyst", company: "Tempus AI", location: "Chicago, IL · Hybrid", seniority: "entry", remote_ok: true, fit_score: 82, salary_min: 70000, salary_max: 95000, posted_at: "Sample listing", source_url: "https://www.tempus.com/careers/", gap_report: { fit_reason: "Your analytical background is relevant to translating clinical and molecular data into insights.", skills_matched: ["R", "Statistics", "Genomics"], skills_missing: ["SQL", "Clinical data standards"], visa_sponsorship: null, opt_friendly: true } },
  { id: "j5", title: "Associate Scientist, Bioinformatics", company: "Regeneron", location: "Tarrytown, NY · On-site", seniority: "entry", remote_ok: false, fit_score: 76, salary_min: 75000, salary_max: 103000, posted_at: "Sample listing", source_url: "https://careers.regeneron.com/", gap_report: { fit_reason: "Good alignment with your life sciences foundation; add workflow automation to stand out.", skills_matched: ["Python", "Genomics", "Research"], skills_missing: ["Snakemake", "Linux"], visa_sponsorship: true, opt_friendly: null } },
  { id: "j6", title: "Computational Biology Intern", company: "Recursion", location: "Salt Lake City, UT · Hybrid", seniority: "internship", remote_ok: true, fit_score: 73, salary_min: 28, salary_max: 38, posted_at: "Sample listing", source_url: "https://www.recursion.com/careers/", gap_report: { fit_reason: "A useful internship pathway that pairs biology with machine learning and large-scale data.", skills_matched: ["Python", "Biology", "Machine learning"], skills_missing: ["PyTorch", "Image analysis"], visa_sponsorship: null, opt_friendly: true } },
  { id: "j7", title: "Bioinformatics Scientist II", company: "Insilico Medicine", location: "Boston, MA · Remote", seniority: "mid", remote_ok: true, fit_score: 58, salary_min: 105000, salary_max: 145000, posted_at: "Sample listing", source_url: "https://insilico.com/careers", gap_report: { fit_reason: "A stretch role: the therapeutic discovery focus fits, but the requested experience is above your current level.", skills_matched: ["Python", "Computational biology"], skills_missing: ["3+ years experience", "Drug discovery"], visa_sponsorship: null, opt_friendly: null } },
]
const navItems = [
  ["overview", "Overview", "◫"], ["jobs", "Job matches", "⌕"], ["saved", "Saved roles", "♡"], ["skillforge", "SkillForge", "✳"], ["network", "Network", "◎"], ["projects", "Projects", "◇"],
]
const scoreTone = score => score >= 80 ? "strong" : score >= 65 ? "good" : score >= 45 ? "maybe" : "low"
const parseGap = value => { if (!value) return {}; if (typeof value === "object") return value; try { return JSON.parse(value) } catch { return {} } }
const money = (min, max) => !min && !max ? "Salary not listed" : min < 1000 ? `$${min}–$${max}/hr` : `$${Math.round(min / 1000)}k–$${Math.round(max / 1000)}k`
const readStoredArray = key => { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : [] } catch { return [] } }
const writeStoredArray = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Browser storage may be disabled. */ } }

function Icon({ children, className = "" }) { return <span aria-hidden="true" className={`icon ${className}`}>{children}</span> }
function Score({ value, compact = false }) { if (value == null) return <span className="new-posting">Fresh</span>; const tone = scoreTone(value); return <div className={`score ${tone} ${compact ? "compact" : ""}`}><b>{value}</b><span>% match</span></div> }
function Badge({ children, tone = "neutral" }) { return <span className={`badge ${tone}`}>{children}</span> }
function Stat({ label, value, foot, tone = "mint" }) { return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-dot ${tone}`} /></div><strong>{value}</strong><small>{foot}</small></article> }

export default function App() {
  const [section, setSection] = useState("overview")
  const [jobs, setJobs] = useState(LIVE_MODE ? [] : demoJobs)
  const [search, setSearch] = useState("")
  const [minScore, setMinScore] = useState(0)
  const [seniority, setSeniority] = useState("all")
  const [visaFilter, setVisaFilter] = useState("all")
  const [region, setRegion] = useState("all")
  const [selected, setSelected] = useState(null)
  const [saved, setSaved] = useState(() => readStoredArray("biocareer-saved"))
  const [loading, setLoading] = useState(false)
  const [live, setLive] = useState(false)
  const [notice, setNotice] = useState("")

  useEffect(() => { writeStoredArray("biocareer-saved", saved) }, [saved])
  useEffect(() => {
    if (!LIVE_MODE) return
    let cancelled = false
    axios.get(`${API}/api/jobs`, { params: { geo: region } }).then(response => {
      if (cancelled) return
      setLoading(false)
      setJobs(Array.isArray(response.data?.jobs) ? response.data.jobs : [])
      setLive(true)
      const failed = response.data?.failed_regions || []
      setNotice(response.data?.partial ? `Some regional feeds could not be refreshed (${failed.length} unavailable). Showing available listings. Listings link to Jobicy.` : "Listings are from Jobicy’s public feed and link to the original source.")
    }).catch(() => { if (!cancelled) { setJobs([]); setNotice("The public job feed could not be reached. Please try again later.") } }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [region])

  const filtered = useMemo(() => jobs.filter(job => {
    const query = search.toLowerCase().trim()
    const matchesQuery = !query || `${job.title} ${job.company} ${job.location || ""}`.toLowerCase().includes(query)
    return matchesQuery && (LIVE_MODE || (Number(job.fit_score) >= minScore && (seniority === "all" || job.seniority === seniority) && (visaFilter !== "sponsorship" || parseGap(job.gap_report).visa_sponsorship === true) && (visaFilter !== "opt_friendly" || parseGap(job.gap_report).opt_friendly === true)))
  }), [jobs, search, minScore, seniority, visaFilter])
  const savedJobs = jobs.filter(job => saved.includes(job.id))
  const bestMatches = LIVE_MODE ? [...jobs].sort((a, b) => Date.parse(b.posted_at || "") - Date.parse(a.posted_at || "")).slice(0, 3) : [...jobs].sort((a, b) => b.fit_score - a.fit_score).slice(0, 3)
  const counts = { total: jobs.length, good_fit: jobs.filter(j => j.fit_score >= 80).length, possible: jobs.filter(j => j.fit_score >= 65 && j.fit_score < 80).length, avg_score: Math.round(jobs.reduce((sum, j) => sum + Number(j.fit_score), 0) / (jobs.length || 1)) }
  const toggleSaved = job => setSaved(current => current.includes(job.id) ? current.filter(id => id !== job.id) : [...current, job.id])
  const openJob = job => { setSelected(job); setSection("jobs") }
  const title = navItems.find(item => item[0] === section)?.[1] || "Overview"

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home" onClick={e => { e.preventDefault(); setSection("overview") }}><span className="brand-mark">B</span><span>Bio<span className="brand-accent">Career</span><small>CAREER INTELLIGENCE</small></span></a>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation">{navItems.map(([id, label, icon]) => <button key={id} className={`nav-item ${section === id ? "active" : ""}`} onClick={() => { setSection(id); setSelected(null) }}><Icon>{icon}</Icon><span>{label}</span>{id === "jobs" && <em>{jobs.length}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="profile-card"><div className="avatar">B</div><div><strong>Portfolio preview</strong><small>Public job listings</small></div><span className="profile-arrow">↗</span></div><p>Built for the next generation of biotech careers.</p></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">BioCareer <span>/</span> <b>{title}</b></div><div className="top-actions"><div className="connection"><i className={live ? "online" : "demo"} />{live ? "Live data" : "Preview mode"}</div><button className="avatar mini" title="Portfolio">B</button></div></header>
      {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      <div className="page-content">
        {section === "overview" && <>
          <div className="welcome-row"><div><div className="eyebrow">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase()}</div><h1>Your next move,<br /><span>made clearer.</span></h1><p className="lede">A smarter way to find your place in biotech. Start with the roles that fit you best.</p></div><div className="hero-art"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="dna">⌁</div><span className="orb-label">BIO<br/>CAREER</span></div></div>
          <div className="stats-grid"><Stat label={LIVE_MODE ? "Current postings" : "Roles tracked"} value={counts.total || 0} foot={LIVE_MODE ? "From requested regions" : "Across biotech & life sciences"}/><Stat label={LIVE_MODE ? "Job sources" : "Strong matches"} value={LIVE_MODE ? "Public API" : (counts.good_fit || 0)} foot={LIVE_MODE ? "Fresh, linked listings" : "80% match or higher"} tone="violet"/><Stat label="Saved roles" value={saved.length} foot="Saved on this device" tone="amber"/><Stat label={LIVE_MODE ? "Last feed check" : "Average match"} value={LIVE_MODE ? "On open" : `${counts.avg_score || 0}%`} foot={LIVE_MODE ? "Cached for up to 6 hours" : "Sample score only"} tone="blue"/></div>
          <section className="section-block"><div className="section-heading"><div><div className="eyebrow">{LIVE_MODE ? "LATEST LISTINGS" : "SAMPLE MATCHES"}</div><h2>{LIVE_MODE ? "Recently posted roles" : "Top opportunities"}</h2></div><button className="text-button" onClick={() => setSection("jobs")}>Explore all roles <span>→</span></button></div><div className="featured-grid">{bestMatches.map(job => <JobCard key={job.id} job={job} onOpen={openJob} saved={saved.includes(job.id)} onSave={toggleSaved}/>)}</div></section>
          <section className="journey-card"><div className="journey-icon">✳</div><div><div className="eyebrow">YOUR CAREER, IN MOTION</div><h3>Find a role. Build a skill. Make a connection.</h3><p>BioCareer brings your biotech career journey into one place.</p></div><button className="button primary" onClick={() => setSection("skillforge")}>Explore SkillForge <span>→</span></button></section>
        </>}
        {(section === "jobs" || section === "saved") && <>
          <div className="page-intro"><div className="eyebrow">OPPORTUNITY FINDER</div><h1>{section === "saved" ? "Your shortlist." : LIVE_MODE ? "Current openings." : "Find your fit."}</h1><p>{section === "saved" ? "Roles you’ve bookmarked for later." : LIVE_MODE ? "Public biotech and computational biology postings. Open the source listing to apply." : "Sample roles for the BioCareer preview."}</p></div>
          <div className="filter-bar"><label className="search-box"><Icon>⌕</Icon><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles, companies, locations"/><kbd>⌘ K</kbd></label>{LIVE_MODE ? <select aria-label="Filter by region" value={region} onChange={e => setRegion(e.target.value)}>{REGION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : <><select value={minScore} onChange={e => setMinScore(+e.target.value)}><option value={0}>Any match</option><option value={65}>65% and above</option><option value={80}>80% and above</option></select><select value={seniority} onChange={e => setSeniority(e.target.value)}><option value="all">All levels</option><option value="entry">Entry level</option><option value="mid">Mid level</option><option value="senior">Senior</option><option value="internship">Internship</option></select></>}</div>
          <div className="list-meta"><span>{section === "saved" ? savedJobs.length : filtered.length} roles</span><span>{LIVE_MODE ? "Sorted by posting date" : "Sample listings"}</span></div>
          <div className={`jobs-layout ${selected ? "has-detail" : ""}`}><div className="job-list">{(section === "saved" ? savedJobs.filter(j => `${j.title} ${j.company}`.toLowerCase().includes(search.toLowerCase())) : filtered).map(job => <JobCard key={job.id} job={job} onOpen={setSelected} saved={saved.includes(job.id)} onSave={toggleSaved} selected={selected?.id === job.id}/>)}{!loading && (section === "saved" ? savedJobs.length === 0 : filtered.length === 0) && <div className="empty-state"><span>⌕</span><h3>No roles found</h3><p>Try changing your search or filters.</p><button className="text-button" onClick={() => { setSearch(""); setMinScore(0); setSeniority("all"); setVisaFilter("all") }}>Clear filters →</button></div>}</div>{selected && <JobDetail job={selected} onClose={() => setSelected(null)} saved={saved.includes(selected.id)} onSave={toggleSaved}/>}</div>
        </>}
        {section === "skillforge" && <ModulePage icon="✳" eyebrow="SKILLFORGE" title="Turn curiosity into capability." description="A focused learning path for the skills biotech teams are looking for." cards={[["01", "Python for biological data", "12 lessons · Beginner", "Start learning"], ["02", "RNA-seq analysis", "8 lessons · Intermediate", "Explore pathway"], ["03", "Reproducible research workflows", "6 lessons · Intermediate", "Explore pathway"]]} />}
        {section === "network" && <ModulePage icon="◎" eyebrow="YOUR NETWORK" title="Good science is a team sport." description="Keep track of the people, labs, and companies shaping your next opportunity." cards={[["01", "People to learn from", "Computational biology · 12 profiles", "Browse people"], ["02", "Companies to follow", "Biotech & research · 24 teams", "Explore companies"], ["03", "Your outreach", "Keep warm connections in one place", "Open tracker"]]} />}
        {section === "projects" && <ModulePage icon="◇" eyebrow="PROJECT STUDIO" title="Show what you can do." description="Build a portfolio that makes your skills visible to the people hiring in life sciences." cards={[["01", "Genomics analysis portfolio", "Starter project · Python", "View project"], ["02", "Drug discovery case study", "Guided project · ML", "Explore project"], ["03", "My project notebook", "Your work, in one place", "Open notebook"]]} />}
      </div>
    </main>
  </div>
}

function JobCard({ job, onOpen, saved, onSave, selected }) {
  const gap = parseGap(job.gap_report)
  const hasMatch = job.fit_score != null
  return <article className={`job-card ${selected ? "selected" : ""}`} onClick={() => onOpen(job)} tabIndex="0" onKeyDown={e => e.key === "Enter" && onOpen(job)}><div className="company-logo">{job.company?.slice(0, 1) || "B"}</div><div className="job-main"><div className="company-line"><span>{job.company}</span><span className="bullet">·</span><span>{job.posted_at ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(job.posted_at)) : "Recently"}</span></div><h3>{job.title}</h3><div className="job-tags"><span>⌖ {job.location || "Location flexible"}</span>{job.seniority && job.seniority !== "unknown" && <Badge>{job.seniority}</Badge>}{job.remote_ok && <Badge tone="mint">Remote friendly</Badge>}</div><div className="card-bottom"><span>{money(job.salary_min, job.salary_max)}</span><span className="skill-preview">{hasMatch ? (gap.skills_matched || []).slice(0, 2).join(" · ") : job.source_name || "Public listing"}</span></div></div><div className="job-side"><button className={`save-button ${saved ? "saved" : ""}`} aria-label={saved ? "Remove saved role" : "Save role"} onClick={e => { e.stopPropagation(); onSave(job) }}>{saved ? "♥" : "♡"}</button><Score value={job.fit_score} compact/><span className="view-arrow">↗</span></div></article>
}
function JobDetail({ job, onClose, saved, onSave }) {
  const gap = parseGap(job.gap_report)
  const hasMatch = job.fit_score != null
  return <aside className="detail-panel"><div className="detail-top"><span className="eyebrow">{hasMatch ? "SAMPLE MATCH DETAILS" : "PUBLIC LISTING"}</span><button onClick={onClose} aria-label="Close details">×</button></div><div className="detail-company"><div className="company-logo large">{job.company?.slice(0, 1) || "B"}</div><div><strong>{job.company}</strong><small>{job.location || "Location flexible"}</small></div></div><h2>{job.title}</h2><div className="detail-tags">{job.seniority && job.seniority !== "unknown" && <Badge>{job.seniority}</Badge>}{job.remote_ok && <Badge tone="mint">Remote friendly</Badge>}</div>{hasMatch && <><div className="match-summary"><Score value={job.fit_score}/><div><strong>{Number(job.fit_score) >= 80 ? "Excellent sample fit" : Number(job.fit_score) >= 65 ? "Strong sample fit" : "Sample score"}</strong><p>{gap.fit_reason || "Illustrative preview score."}</p></div></div><div className="detail-section"><h4>SAMPLE SKILL MATCH</h4><div className="skill-chips">{(gap.skills_matched || []).map(skill => <Badge key={skill} tone="mint">✓ {skill}</Badge>)}{!gap.skills_matched?.length && <span className="muted">Illustrative preview data.</span>}</div></div>{gap.skills_missing?.length > 0 && <div className="detail-section"><h4>SAMPLE SKILLS TO BUILD</h4><div className="skill-chips">{gap.skills_missing.map(skill => <Badge key={skill} tone="amber">+ {skill}</Badge>)}</div></div>}</>}<div className="detail-section"><h4>ROLE SNAPSHOT</h4><div className="snapshot-row"><span>Compensation</span><b>{money(job.salary_min, job.salary_max)}</b></div><div className="snapshot-row"><span>Listing source</span><b>{job.source_name || "BioCareer sample"}</b></div></div><div className="detail-actions"><button className="button secondary" onClick={() => onSave(job)}>{saved ? "♥ Saved" : "♡ Save role"}</button><a className="button primary" href={job.source_url || "#"} target="_blank" rel="noopener noreferrer">View listing ↗</a></div>{!hasMatch && <small className="fine-print">Check the source listing for details and application status.</small>}</aside>
}
function ModulePage({ icon, eyebrow, title, description, cards }) {
  const storageKey = `biocareer-${eyebrow.toLowerCase().replaceAll(" ", "-")}`
  const [started, setStarted] = useState(() => readStoredArray(storageKey))
  const [activeCard, setActiveCard] = useState(null)
  const isProjects = eyebrow === "PROJECT STUDIO"
  const toggle = id => setStarted(current => {
    const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    writeStoredArray(storageKey, next)
    return next
  })
  return <><div className="page-intro module-intro"><div className="module-icon">{icon}</div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="module-banner"><div><span className="eyebrow">BUILT AROUND YOUR NEXT STEP</span><h2>Small steps compound into a meaningful career.</h2><p>{started.length ? `${started.length} item${started.length === 1 ? "" : "s"} in progress · Your progress is saved on this device.` : "Choose a starting point and keep your progress in one place."}</p></div><div className="progress-ring">{String(started.length).padStart(2,"0")}<span>/{String(cards.length).padStart(2,"0")}</span></div></div><div className="section-heading module-heading"><div><div className="eyebrow">CURATED FOR YOU</div><h2>{isProjects ? "Portfolio starters" : "Get started"}</h2></div><span className="muted">{started.length} in progress</span></div><div className="module-grid">{cards.map(([n, name, meta, action]) => <article className={`module-card ${activeCard === n ? "expanded" : ""}`} key={n}><div className="module-card-top"><span>{n}</span><span>{started.includes(n) ? "✓" : "↗"}</span></div><h3>{name}</h3><p>{meta}</p>{activeCard === n && <p className="module-detail">{isProjects ? "Use this starter to organize a portfolio piece. Add your own analysis, methods, and results before sharing." : eyebrow === "SKILLFORGE" ? "Work through this learning path at your own pace. Mark it in progress to keep it in your workspace." : "Save this area to your workspace and keep notes about your next networking step."}</p>}<div className="module-card-actions"><button className="text-button" onClick={() => setActiveCard(activeCard === n ? null : n)}>{activeCard === n ? "Hide details" : "Details"} <span>↗</span></button><button className={`button ${started.includes(n) ? "secondary" : "primary"}`} onClick={() => toggle(n)}>{started.includes(n) ? "✓ In progress" : action}</button></div></article>)}</div><p className="module-note">Your progress is stored in this browser. Live accounts and cross-device sync can be added when the backend is connected.</p></>
}

