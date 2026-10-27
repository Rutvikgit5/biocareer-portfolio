const REGION_LABELS = {
  usa: "USA",
  canada: "Canada",
  uk: "United Kingdom",
  denmark: "Denmark",
  netherlands: "Netherlands",
  switzerland: "Switzerland",
  portugal: "Portugal",
  norway: "Norway",
  sweden: "Sweden",
  france: "France",
  australia: "Australia",
  dubai: "UAE",
  singapore: "Singapore",
  india: "India",
}

const REGIONS = {
  usa: ["usa"],
  canada: ["canada"],
  uk: ["uk"],
  denmark: ["denmark"],
  netherlands: ["netherlands"],
  switzerland: ["switzerland"],
  portugal: ["portugal"],
  norway: ["norway"],
  sweden: ["sweden"],
  france: ["france"],
  australia: ["australia"],
  dubai: ["united-arab-emirates"],
  singapore: ["singapore"],
  india: ["india"],
}

const SPECIALTY_TERMS = [
  "bioinformatics", "computational biology", "computational genomics",
  "genomics", "genomic medicine", "systems biology", "systems pharmacology",
  "drug discovery", "drug development", "cheminformatics", "biostatistics",
  "biomedical informatics", "clinical informatics", "molecular biology",
  "transcriptomics", "proteomics", "single-cell", "multi-omics", "multiomics",
  "precision medicine", "life sciences", "life science", "biotechnology",
  "biotech", "biopharma", "pharmaceutical", "therapeutics", "clinical research",
]
const ADJACENT_ROLE_TERMS = [
  "research", "scientist", "associate", "lab", "laboratory", "software",
  "engineer", "developer", "data analyst", "data scientist", "machine learning",
  "researcher", "technologist", "informatics", "scientific computing",
]
const LEVER_BOARDS = [
  { site: "advancell", company: "AdvanCell" },
  { site: "transmutex", company: "Transmutex" },
  { site: "pillarbiosciences", company: "Pillar Biosciences" },
  { site: "mammothbiosci", company: "Mammoth Biosciences" },
]

const GREENHOUSE_BOARDS = [
  { token: "freenome", company: "Freenome" },
  { token: "ginkgobioworks", company: "Ginkgo Bioworks" },
  { token: "twistbioscience", company: "Twist Bioscience" },
  { token: "beamtherapeutics", company: "Beam Therapeutics" },
  { token: "natera", company: "Natera" },
  { token: "adaptivebiotechnologies", company: "Adaptive Biotechnologies" },
]
const ASHBY_BOARDS = [
  { slug: "benchling", company: "Benchling" }, { slug: "insitro", company: "insitro" },
  { slug: "formbio", company: "Form Bio" }, { slug: "owkin", company: "Owkin" },
  { slug: "inductive-bio", company: "Inductive Bio" },
  { slug: "iambic-therapeutics", company: "Iambic Therapeutics" }, { slug: "onyx-bio", company: "Onyx Bio" },
  { slug: "imubiosciences", company: "IMU Biosciences" }, { slug: "basecamp-research", company: "Basecamp Research" },
  { slug: "seqera.io", company: "Seqera" }, { slug: "adaptyv", company: "Adaptyv" },
  { slug: "proxima", company: "Proxima" }, { slug: "orakloncology", company: "Orakl Oncology" },
  { slug: "AI-bio", company: "Stealth AI x Bio" }, { slug: "cradlebio", company: "Cradle" },
]

function cleanText(value, maxLength = 6000) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
}

function isRelevant(job) {
  const title = String(job.jobTitle || job.title || "").toLowerCase()
  if (/\b(senior|staff|principal|director|vice president|chief|head of|team lead)\b/.test(title)) return false
  const context = `${job.jobIndustry || ""} ${job.jobExcerpt || ""} ${job.jobDescription || ""} ${job.categories || ""} ${job.department || ""} ${job.team || ""}`.toLowerCase()
  if (SPECIALTY_TERMS.some(term => title.includes(term))) return true
  return SPECIALTY_TERMS.some(term => context.includes(term)) && ADJACENT_ROLE_TERMS.some(term => title.includes(term))
}

function matchesRegion(text, region) {
  const value = String(text || "").toLowerCase()
  if (region === "all" && /\b(remote|worldwide|anywhere|global)\b/.test(value)) return true
  if (region === "all") return Object.keys(REGION_LABELS).some(key => matchesRegion(value, key))
  const aliases = {
    usa: ["united states", "usa", "u.s.", "remote - us", "remote - usa", ", ca", ", ma", ", ny", ", wa", ", nc", ", nj", ", tx", ", md", ", pa", ", il", ", co", ", va", ", az", ", mn", ", ga", ", mi", ", or", ", ut", ", wi", ", ct", ", dc", ", ri", ", ks", ", ky", ", la", ", me", ", mo", ", mt", ", ne", ", nv", ", nh", ", nm", ", nd", ", oh", ", ok", ", sc", ", sd", ", tn", ", vt", ", wv", ", wy", ", de", ", hi", ", id", ", ia", ", al", ", ak", ", ar", ", fl", ", ms"],
    canada: ["canada", "toronto", "vancouver", "montreal", "ottawa"],
    uk: ["united kingdom", "great britain", "england", "scotland", "wales", "london", "oxford", "cambridge"],
    dubai: ["uae", "united arab emirates", "dubai", "abu dhabi"],
    australia: ["australia", "sydney", "melbourne", "brisbane", "perth", "adelaide"],
    denmark: ["denmark", "copenhagen", "aarhus"],
    netherlands: ["netherlands", "amsterdam", "utrecht", "leiden", "rotterdam"],
    switzerland: ["switzerland", "zurich", "zürich", "basel", "geneva", "lausanne"],
    portugal: ["portugal", "lisbon", "porto"],
    norway: ["norway", "oslo", "bergen"],
    sweden: ["sweden", "stockholm", "gothenburg", "malmö"],
    france: ["france", "paris", "lyon", "marseille", "toulouse", "villejuif"],
    singapore: ["singapore"],
    india: ["india", "mumbai", "bengaluru", "bangalore", "hyderabad", "pune", "chennai", "new delhi"],
  }
  return (aliases[region] || [region]).some(alias => value.includes(alias))
}

function toLeverListing(job, company) {
  const sourceUrl = safeCompanyUrl(job.hostedUrl)
  const title = cleanText(job.text, 180)
  if (!sourceUrl || !title) return null
  const categories = job.categories || {}
  const salary = job.salaryRange || {}
  return {
    id: `lever-${job.id}`,
    title,
    company,
    location: cleanText(categories.location || (categories.allLocations || []).join(", "), 120),
    seniority: "unknown",
    work_mode: inferWorkMode(job.workplaceType, job.descriptionPlain),
    remote_ok: job.workplaceType === "remote",
    salary_min: Number(salary.min) || null,
    salary_max: Number(salary.max) || null,
    currency: cleanText(salary.currency, 3) || null,
    work_type: cleanText(categories.commitment, 80) || "",
    posted_at: job.createdAt ? new Date(job.createdAt).toISOString() : null,
    summary: cleanText(job.openingPlain || job.descriptionPlain, 900),
    source_url: sourceUrl,
    source_name: `${company} Careers`,
    fit_score: null,
    gap_report: {},
  }
}

function safeCompanyUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return null
    if (url.hostname !== "jobs.lever.co" && url.hostname !== "jobs.eu.lever.co") return null
    return url.href
  } catch {
    return null
  }
}

function normalizeWorkMode(value) {
  const mode = String(value || "").toLowerCase()
  if (mode.includes("hybrid")) return "Hybrid"
  if (mode.includes("remote")) return "Remote"
  if (mode.includes("on-site") || mode.includes("onsite") || mode.includes("on site")) return "On-site"
  return "Not specified"
}

function inferWorkMode(value, description = "") {
  const known = normalizeWorkMode(value)
  if (known !== "Not specified") return known
  const text = cleanText(description, 6000).toLowerCase()
  if (/\b(hybrid (role|position|schedule|work)|in-person hybrid|#li-hybrid)\b/.test(text)) return "Hybrid"
  if (/\b(on-site (role|position|work)|onsite (role|position|work)|in-office (role|position|schedule))\b/.test(text)) return "On-site"
  if (/\b(fully remote|remote-first|remote position|remote role|work remotely)\b/.test(text)) return "Remote"
  return "Not specified"
}

function safeExternalListing(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return false
    return ["jobs.lever.co", "jobs.eu.lever.co", "boards.greenhouse.io", "job-boards.greenhouse.io", "jobs.ashbyhq.com"].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

async function fetchLever(board) {
  const url = new URL(`https://api.lever.co/v0/postings/${encodeURIComponent(board.site)}`)
  url.searchParams.set("mode", "json")
  url.searchParams.set("limit", "100")
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) })
  if (!response.ok) throw new Error(`Lever feed returned HTTP ${response.status}`)
  const payload = await response.json()
  if (!Array.isArray(payload)) throw new Error("Lever feed returned an unexpected response")
  return payload.map(job => ({ job, company: board.company }))
}

async function fetchGreenhouse(board) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.token)}/jobs?content=true`
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) })
  if (!response.ok) throw new Error(`Greenhouse feed returned HTTP ${response.status}`)
  const payload = await response.json()
  if (!Array.isArray(payload.jobs)) throw new Error("Greenhouse feed returned an unexpected response")
  return payload.jobs.map(job => ({ job, company: board.company }))
}

async function fetchAshby(board) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.slug)}?includeCompensation=true`
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) })
  if (!response.ok) throw new Error(`Ashby feed returned HTTP ${response.status}`)
  const payload = await response.json()
  if (!Array.isArray(payload.jobs)) throw new Error("Ashby feed returned an unexpected response")
  return payload.jobs.map(job => ({ job, company: board.company }))
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET")
    return res.status(405).json({ error: "Method not allowed" })
  }

  const requestedGeo = String(req.query?.geo || "all").toLowerCase()
  if (requestedGeo !== "all" && !Object.hasOwn(REGIONS, requestedGeo)) {
    return res.status(400).json({ error: "Unsupported location" })
  }

  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400")
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("Referrer-Policy", "no-referrer")

  const boards = [...LEVER_BOARDS, ...GREENHOUSE_BOARDS]
  const sources = [
    ...boards.map(board => ({ key: `company:${board.site || board.token}`, fetch: () => board.site ? fetchLever(board) : fetchGreenhouse(board), map: (item, region) => {
      const job = item.job || item
      const text = `${job.text || job.title || ""} ${job.descriptionPlain || job.content || ""} ${(job.categories || {}).location || (job.location || {}).name || ""}`
      if (!isRelevant({ jobTitle: job.text || job.title, jobExcerpt: text })) return null
      if (region !== "all" && !matchesRegion((job.categories || {}).location || (job.location || {}).name, region)) return null
      if (region === "all" && !matchesRegion((job.categories || {}).location || (job.location || {}).name, "all")) return null
      const mapped = board.site ? toLeverListing(job, item.company) : {
        id: `greenhouse-${job.id}`, title: cleanText(job.title, 180), company: item.company,
        location: cleanText((job.location || {}).name, 120), seniority: "unknown", work_mode: inferWorkMode((job.location || {}).name, job.content), remote_ok: /remote/i.test((job.location || {}).name || ""),
        work_type: "",
        salary_min: null, salary_max: null, posted_at: job.first_published_at || null,
        summary: cleanText(job.content, 900),
        source_url: job.absolute_url, source_name: `${item.company} Careers`, fit_score: null, gap_report: {},
      }
      if (!mapped || !safeExternalListing(mapped.source_url)) return null
      return mapped
    } })),
    ...ASHBY_BOARDS.map(board => ({ key: `company:${board.slug}`, fetch: () => fetchAshby(board), map: (item, region) => {
      const job = item.job || item
      const context = `${job.descriptionPlain || ""} ${job.department || ""} ${job.team || ""}`
      if (!isRelevant({ title: job.title, jobDescription: context })) return null
      const location = `${job.location || ""} ${(job.secondaryLocations || []).map(place => place.location).join(" ")}`
      if (region !== "all" && !matchesRegion(location, region)) return null
      if (region === "all" && !matchesRegion(location, "all")) return null
      const sourceUrl = job.jobUrl
      if (!safeExternalListing(sourceUrl)) return null
      return {
        id: `ashby-${job.id}`, title: cleanText(job.title, 180), company: item.company,
        location: cleanText(location, 160) || "Location not listed", seniority: "unknown",
        work_mode: inferWorkMode(job.workplaceType || (job.isRemote ? "Remote" : ""), job.descriptionPlain),
        remote_ok: Boolean(job.isRemote) || /remote/i.test(job.workplaceType || ""),
        work_type: cleanText(job.employmentType, 80),
        salary_min: Number(job.compensation?.minValue) || null,
        salary_max: Number(job.compensation?.maxValue) || null,
        currency: cleanText(job.compensation?.currency, 3) || null,
        posted_at: job.publishedAt || null,
        summary: cleanText(job.descriptionPlain, 900), source_url: sourceUrl,
        source_name: `${item.company} Careers`, fit_score: null, gap_report: {},
      }
    } })),
  ]

  const results = new Array(sources.length)
  let nextIndex = 0
  await Promise.all(Array.from({ length: Math.min(8, sources.length) }, async () => {
    while (nextIndex < sources.length) {
      const index = nextIndex++
      const source = sources[index]
      try {
        const payload = await source.fetch()
        results[index] = { status: "fulfilled", value: { key: source.key, items: Array.isArray(payload) ? payload : payload.items, truncated: Boolean(payload.truncated), map: source.map } }
      } catch (reason) {
        results[index] = { status: "rejected", reason }
      }
    }
  }))
  const jobsByUrl = new Map()
  const failedFeeds = []
  let truncated = false

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i]
    const sourceKey = sources[i].key
    if (result.status !== "fulfilled") {
      failedFeeds.push(sourceKey)
      continue
    }
    if (result.value.truncated) truncated = true
    for (const item of result.value.items) {
      const job = item.job || item
      const normalized = result.value.map(item, requestedGeo)
      if (normalized) {
        const context = `${job.jobTitle || job.text || job.title || ""} ${job.jobIndustry || ""} ${job.jobExcerpt || job.excerpt || ""} ${job.jobDescription || job.descriptionPlain || job.description || job.content || ""} ${job.categories || ""} ${job.department || ""} ${job.team || ""}`.toLowerCase()
        normalized.search_terms = [...SPECIALTY_TERMS, ...ADJACENT_ROLE_TERMS].filter(term => context.includes(term))
        jobsByUrl.set(normalized.source_url, normalized)
      }
    }
  }

  const jobs = [...jobsByUrl.values()].sort((a, b) => {
    const dateA = Date.parse(a.posted_at || "") || 0
    const dateB = Date.parse(b.posted_at || "") || 0
    return dateB - dateA
  })

  if (failedFeeds.length && !jobs.length) {
    res.setHeader("Cache-Control", "no-store")
    res.setHeader("Retry-After", "3600")
    return res.status(503).json({ error: "The employer career portals are temporarily unavailable." })
  }

  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400")
  return res.status(200).json({
    jobs,
    source: "Direct employer career portals hosted on Lever, Greenhouse, and Ashby",

    refreshed_at: new Date().toISOString(),
    failed_sources: failedFeeds,
    partial: failedFeeds.length > 0 || truncated,
  })
}
