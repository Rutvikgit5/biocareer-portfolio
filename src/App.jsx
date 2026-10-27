import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import "./App.css"

const REGIONS = [
  ["all", "All regions"], ["usa", "United States"], ["canada", "Canada"], ["uk", "United Kingdom"],
  ["denmark", "Denmark"], ["netherlands", "Netherlands"], ["switzerland", "Switzerland"],
  ["portugal", "Portugal"], ["norway", "Norway"], ["sweden", "Sweden"], ["france", "France"],
  ["australia", "Australia"], ["dubai", "Dubai / UAE"], ["singapore", "Singapore"], ["india", "India"],
]

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem("biocareer-saved") || "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function formatSalary(job) {
  if (!job.salary_min && !job.salary_max) return ""
  const amount = value => new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value)
  const range = job.salary_min && job.salary_max
    ? `${amount(job.salary_min)}–${amount(job.salary_max)}`
    : amount(job.salary_min || job.salary_max)
  return `${job.currency ? `${job.currency} ` : ""}${range}`
}

function App() {
  const [jobs, setJobs] = useState([])
  const [region, setRegion] = useState("all")
  const [search, setSearch] = useState("")
  const [section, setSection] = useState("jobs")
  const [saved, setSaved] = useState(readSaved)
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    let cancelled = false
    axios.get("/api/jobs", { params: { geo: region } })
      .then(({ data }) => {
        if (cancelled) return
        const listings = Array.isArray(data?.jobs) ? data.jobs : []
        setJobs(listings)
        setLive(true)
        const failed = data?.failed_sources || []
        setNotice(data?.partial ? `${failed.length} employer career portal(s) could not be refreshed. Showing available listings.` : "Listings are collected from employer career portals. Apply on the original posting.")
      })
      .catch(() => {
        if (!cancelled) {
          setJobs([])
          setNotice("The job feeds are temporarily unavailable. Please try again shortly.")
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [region])

  useEffect(() => {
    try { localStorage.setItem("biocareer-saved", JSON.stringify(saved)) } catch { /* Local storage may be disabled. */ }
  }, [saved])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const current = section === "saved" ? jobs.filter(job => saved.includes(job.id)) : jobs
    if (!query) return current
    return current.filter(job => `${job.title} ${job.company} ${job.location || ""} ${job.summary || ""} ${(job.search_terms || []).join(" ")} ${job.source_name || ""}`.toLowerCase().includes(query))
  }, [jobs, saved, search, section])

  function toggleSaved(job) {
    setSaved(current => current.includes(job.id) ? current.filter(id => id !== job.id) : [...current, job.id])
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#jobs" onClick={event => { event.preventDefault(); setSection("jobs") }}>
        <span className="brand-mark">B</span><span>BioCareer<small>BIOTECH JOB SEARCH</small></span>
      </a>
      <div className="workspace-label">MENU</div>
      <nav className="main-nav" aria-label="Main navigation">
        {[["jobs", "Open roles"], ["saved", "Saved roles"]].map(([id, label]) => <button key={id} className={`nav-item ${section === id ? "active" : ""}`} onClick={() => setSection(id)}>
          <span className="nav-symbol" aria-hidden="true">{id === "jobs" ? "⌕" : "♡"}</span><span>{label}</span>{id === "jobs" && <em>{jobs.length}</em>}
        </button>)}
      </nav>
      <div className="sidebar-bottom"><strong>BioCareer</strong><p>Bioinformatics, research and biotech roles.</p></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">BioCareer <span>/</span> <b>{section === "saved" ? "Saved roles" : "Open roles"}</b></div><div className="connection"><i className={live ? "online" : ""}/>{live ? "Live listings" : "Connecting"}</div></header>
      {notice && <div className="notice" role="status">{notice}</div>}
      <div className="page-content">
        <section className="page-intro">
          <div className="eyebrow">{section === "saved" ? "SAVED JOBS" : "BIOTECH CAREERS"}</div>
          <h1>{section === "saved" ? "Saved roles" : "Find your next role."}</h1>
          <p>Bioinformatics, computational biology, drug discovery, research and biotech software roles.</p>
        </section>
        <div className="filter-bar">
          <label className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search titles, skills, companies" aria-label="Search jobs"/></label>
          <select aria-label="Filter by region" value={region} onChange={event => setRegion(event.target.value)}>{REGIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>
        <div className="list-meta"><span>{loading ? "Loading roles..." : `${filtered.length} ${filtered.length === 1 ? "role" : "roles"}`}</span><span>Updated when opened · cached up to 6 hours</span></div>
        <section className="job-list" aria-label="Job listings">
          {filtered.map(job => <article className="job-card" key={job.id}>
            <div className="job-heading"><div><div className="company-line">{job.company} <span>·</span> {job.posted_at && Number.isFinite(Date.parse(job.posted_at)) ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(job.posted_at)) : "Recently posted"}</div><h2>{job.title}</h2></div>
              <button className={`save-button ${saved.includes(job.id) ? "saved" : ""}`} aria-label={saved.includes(job.id) ? "Remove saved role" : "Save role"} onClick={() => toggleSaved(job)}>{saved.includes(job.id) ? "Saved" : "Save"}</button>
            </div>
            <div className="job-tags"><span>{job.location || "Location not listed"}</span><span>{job.work_mode || (job.remote_ok ? "Remote" : "Work mode not specified")}</span>{job.work_type && <span>{job.work_type}</span>}{job.seniority && job.seniority !== "unknown" && <span>{job.seniority}</span>}{formatSalary(job) && <span>{formatSalary(job)}</span>}</div>
            {job.summary && <p className="job-summary">{job.summary}</p>}
            <div className="job-footer"><span>Source: {job.source_name || "Public job feed"}</span><a href={job.source_url} target="_blank" rel="noopener noreferrer">View original posting <span aria-hidden="true">↗</span></a></div>
          </article>)}
          {!loading && filtered.length === 0 && <div className="empty-state"><h2>No matching roles</h2><p>Try another title, skill or region.</p><button className="text-button" onClick={() => { setSearch(""); setRegion("all") }}>Clear filters</button></div>}
        </section>
        <footer className="page-footer">BioCareer · Employer career listings; applications go to the employer’s original portal.</footer>
      </div>
    </main>
  </div>
}

export default App
