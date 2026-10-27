const REGION_LABELS = {
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
  india: "APAC",
}

const REGIONS = {
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
  // The public API does not currently list India as a separate geography.
  // APAC eligibility is shown as APAC; it is never relabeled as India.
  india: ["apac"],
}

const RELEVANCE_TERMS = [
  "bioinformatics", "computational biology", "computational genomics",
  "genomics", "genomic", "biotech", "biotechnology", "life science",
  "life sciences", "molecular biology", "omics", "transcriptomics",
  "proteomics", "clinical informatics", "biomedical data",
]

const LEVER_BOARDS = [
  { site: "advancell", company: "AdvanCell", regions: ["australia"] },
  { site: "transmutex", company: "Transmutex", regions: ["switzerland"] },
  { site: "xilis", company: "Xilis", regions: ["netherlands"] },
  { site: "recursionpharma", company: "Recursion Pharmaceuticals", regions: ["all"] },
]

const GREENHOUSE_BOARDS = [
  { token: "10xgenomics", company: "10x Genomics", regions: ["all"] },
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

function safeListingUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return null
    if (url.hostname !== "jobicy.com" && !url.hostname.endsWith(".jobicy.com")) return null
    return url.href
  } catch {
    return null
  }
}

async function fetchGeo(geo) {
  const jobs = []
  let cursor = null
  let page = 0
  do {
    const url = new URL("https://jobicy.com/api/jobs")
    url.searchParams.set("geo", geo)
    url.searchParams.set("count", "200")
    if (cursor) url.searchParams.set("cursor", cursor)

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    })
    if (!response.ok) throw new Error(`Job feed returned HTTP ${response.status}`)
    const payload = await response.json()
    if (payload.success === false || !Array.isArray(payload.jobs)) {
      throw new Error("Job feed returned an unexpected response")
    }
    jobs.push(...payload.jobs)
    cursor = payload.nextCursor || null
    page += 1
  } while (cursor && page < 3)

  return { jobs, truncated: Boolean(cursor) }
}

function isRelevant(job) {
  const text = `${job.jobTitle || ""} ${job.jobIndustry || ""} ${job.jobExcerpt || ""} ${job.jobDescription || ""}`.toLowerCase()
  return RELEVANCE_TERMS.some(term => text.includes(term))
}

function matchesRegion(text, region) {
  const value = String(text || "").toLowerCase()
  if (region === "all") return Object.keys(REGION_LABELS).some(key => matchesRegion(value, key))
  const aliases = {
    dubai: ["uae", "united arab emirates", "dubai", "abu dhabi"],
    india: ["india", "mumbai", "bengaluru", "bangalore", "hyderabad", "pune", "chennai", "new delhi"],
    australia: ["australia", "sydney", "melbourne", "brisbane", "perth", "adelaide"],
    denmark: ["denmark", "copenhagen", "aarhus"],
    netherlands: ["netherlands", "amsterdam", "utrecht", "leiden", "rotterdam"],
    switzerland: ["switzerland", "zurich", "zürich", "basel", "geneva", "lausanne"],
    portugal: ["portugal", "lisbon", "porto"],
    norway: ["norway", "oslo", "bergen"],
    sweden: ["sweden", "stockholm", "gothenburg", "malmö"],
    france: ["france", "paris", "lyon", "marseille", "toulouse"],
    singapore: ["singapore"],
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
    remote_ok: job.workplaceType === "remote",
    salary_min: Number(salary.min) || null,
    salary_max: Number(salary.max) || null,
    posted_at: job.createdAt ? new Date(job.createdAt).toISOString() : null,
    source_url: sourceUrl,
    source_name: "Lever",
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

function safeExternalListing(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return false
    return ["jobicy.com", "jobs.lever.co", "jobs.eu.lever.co", "boards.greenhouse.io", "job-boards.greenhouse.io"].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))
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

function toPublicListing(job, geo) {
  const sourceUrl = safeListingUrl(job.url)
  const title = cleanText(job.jobTitle, 180)
  const company = cleanText(job.companyName, 140)
  if (!sourceUrl || !title || !company) return null

  const rawSalary = Number(job.salaryMin) || Number(job.salaryMax) || null
  const hourly = /hour/i.test(job.salaryPeriod || "")
  return {
    id: `jobicy-${job.id}`,
    title,
    company,
    location: cleanText(job.jobGeo, 120) || REGION_LABELS[geo],
    seniority: cleanText(job.jobLevel, 40).toLowerCase() || "unknown",
    remote_ok: true,
    salary_min: hourly && rawSalary && rawSalary > 1000 ? Math.round(rawSalary / 2080) : (Number(job.salaryMin) || null),
    salary_max: hourly && Number(job.salaryMax) > 1000 ? Math.round(Number(job.salaryMax) / 2080) : (Number(job.salaryMax) || null),
    posted_at: job.pubDate || null,
    scraped_at: new Date().toISOString(),
    source_url: sourceUrl,
    source_name: "Jobicy",
    fit_score: null,
    gap_report: {},
  }
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

  const selected = requestedGeo === "all" ? Object.keys(REGIONS) : [requestedGeo]
  const geoRequests = [...new Set(selected.flatMap(region => REGIONS[region]))]
  const boards = requestedGeo === "all"
    ? [...LEVER_BOARDS, ...GREENHOUSE_BOARDS]
    : [...LEVER_BOARDS.filter(board => board.regions.includes(requestedGeo) || board.regions.includes("all")), ...GREENHOUSE_BOARDS.filter(board => board.regions.includes(requestedGeo) || board.regions.includes("all"))]
  const sources = [
    ...geoRequests.map(geo => ({ key: geo, fetch: async () => {
      const result = await fetchGeo(geo)
      return { items: result.jobs, truncated: result.truncated }
    }, map: (job, region) => toPublicListing(job, region) })),
    ...boards.map(board => ({ key: `company:${board.site || board.token}`, fetch: () => board.site ? fetchLever(board) : fetchGreenhouse(board), map: (item, region) => {
      const job = item.job || item
      const text = `${job.text || job.title || ""} ${job.descriptionPlain || job.content || ""} ${(job.categories || {}).location || (job.location || {}).name || ""}`
      if (!isRelevant({ jobTitle: job.text || job.title, jobExcerpt: text })) return null
      if (region !== "all" && !matchesRegion((job.categories || {}).location || (job.location || {}).name, region)) return null
      if (region === "all" && !matchesRegion((job.categories || {}).location || (job.location || {}).name, "all")) return null
      const mapped = board.site ? toLeverListing(job, item.company) : {
        id: `greenhouse-${job.id}`, title: cleanText(job.title, 180), company: item.company,
        location: cleanText((job.location || {}).name, 120), seniority: "unknown", remote_ok: /remote/i.test((job.location || {}).name || ""),
        salary_min: null, salary_max: null, posted_at: job.first_published_at || null,
        source_url: job.absolute_url, source_name: "Greenhouse", fit_score: null, gap_report: {},
      }
      if (!mapped || !safeExternalListing(mapped.source_url)) return null
      return mapped
    } })),
  ]

  const results = new Array(sources.length)
  let nextIndex = 0
  await Promise.all(Array.from({ length: Math.min(4, sources.length) }, async () => {
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
      if (!sources[i].key.startsWith("company:") && !isRelevant(job)) continue
      const geo = sourceKey.startsWith("company:") ? requestedGeo : sourceKey
      const region = selected.find(key => REGIONS[key].includes(geo)) || requestedGeo
      const normalized = result.value.map(item, region)
      if (normalized) jobsByUrl.set(normalized.source_url, normalized)
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
    return res.status(503).json({ error: "The public job feed is temporarily unavailable." })
  }

  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400")
  return res.status(200).json({
    jobs,
    source: "Jobicy, Lever, and Greenhouse public job APIs",
    source_url: "https://jobicy.com/jobs-rss-feed",
    refreshed_at: new Date().toISOString(),
    failed_regions: failedFeeds,
    partial: failedFeeds.length > 0 || truncated,
  })
}
