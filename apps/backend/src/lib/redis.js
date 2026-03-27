/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Redis client powered by Upstash (serverless, free tier).
 *
 * Setup:
 *   1. Go to https://upstash.com → create a free Redis database
 *   2. Copy the "UPSTASH_REDIS_URL" from the REST section (ioredis format)
 *      e.g.  rediss://:<password>@<host>:6379
 *   3. Add to your .env:
 *        REDIS_URL=rediss://:<password>@<host>:6379
 *        REDIS_ENABLED=true          ← set false to bypass cache in dev
 *
 * All cache helpers (get / set / del / invalidate) are exported here so
 * every controller uses one shared, resilient client.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Redis = require("ioredis")

// ── Client ─────────────────────────────────────────────────────────────────
let client = null

const getClient = () => {
  if (!client) {
    const url = process.env.REDIS_URL

    if (!url) {
      console.warn("⚠️  REDIS_URL not set — caching disabled")
      return null
    }

    client = new Redis(url, {
      maxRetriesPerRequest:    3,
      enableReadyCheck:        false,   // Required for Upstash TLS
      connectTimeout:          5_000,
      lazyConnect:             true,
      tls:                     url.startsWith("rediss://") ? {} : undefined,
    })

    client.on("connect",  () => console.log("✅ Redis connected"))
    client.on("error",    (err) => console.error("❌ Redis error:", err.message))
    client.on("close",    () => console.warn("⚠️  Redis connection closed"))
  }
  return client
}

// ── Enabled guard ───────────────────────────────────────────────────────────
const isEnabled = () =>
  process.env.REDIS_ENABLED !== "false" && !!process.env.REDIS_URL

// ── TTL constants (seconds) ─────────────────────────────────────────────────
const TTL = {
  MEMBERS_LIST:   60 * 5,    //  5 min  — paginated member lists
  MEMBER_DETAIL:  60 * 10,   // 10 min  — single member + dependents
  DASHBOARD:      60 * 2,    //  2 min  — dashboard summary stats
  CONTRIBUTIONS:  60 * 5,    //  5 min  — contribution lists
  CLAIMS:         60 * 5,    //  5 min  — claims lists
  LOANS:          60 * 5,    //  5 min  — loans lists
  ANNOUNCEMENTS:  60 * 15,   // 15 min  — rarely changes
  GROUPS:         60 * 30,   // 30 min  — very stable
  NOTIFICATIONS:  60 * 1,    //  1 min  — near real-time
  SHORT:          60 * 1,    //  1 min  — generic short-lived
}

// ── Key factory ─────────────────────────────────────────────────────────────
//  All keys are namespaced by domain to make wildcard invalidation easy.
const keys = {
  membersList:    (query) => `members:list:${query}`,
  memberDetail:   (id)    => `members:detail:${id}`,
  dashboard:      ()      => `dashboard:summary`,
  contributions:  (query) => `contributions:list:${query}`,
  claims:         (query) => `claims:list:${query}`,
  loans:          (query) => `loans:list:${query}`,
  announcements:  ()      => `announcements:list`,
  groups:         ()      => `groups:list`,
  notifications:  (uid)   => `notifications:user:${uid}`,
}

// ── Core helpers ────────────────────────────────────────────────────────────

/**
 * Get a cached value. Returns null on miss or any Redis error.
 */
const cacheGet = async (key) => {
  if (!isEnabled()) return null
  try {
    const redis = getClient()
    if (!redis) return null
    const raw = await redis.get(key)
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    console.error(`⚠️  Cache GET failed [${key}]:`, err.message)
    return null   // Graceful degradation — never break the request
  }
}

/**
 * Set a value with TTL. Silently fails on error.
 */
const cacheSet = async (key, value, ttl = TTL.SHORT) => {
  if (!isEnabled()) return
  try {
    const redis = getClient()
    if (!redis) return
    await redis.setex(key, ttl, JSON.stringify(value))
  } catch (err) {
    console.error(`⚠️  Cache SET failed [${key}]:`, err.message)
  }
}

/**
 * Delete exact keys. Pass multiple keys as separate arguments.
 */
const cacheDel = async (...cacheKeys) => {
  if (!isEnabled()) return
  try {
    const redis = getClient()
    if (!redis) return
    const valid = cacheKeys.filter(Boolean)
    if (valid.length) await redis.del(...valid)
  } catch (err) {
    console.error("⚠️  Cache DEL failed:", err.message)
  }
}

/**
 * Invalidate all keys matching a pattern (e.g. "members:*").
 * Uses SCAN — safe for production, never blocks like KEYS.
 */
const cacheInvalidatePattern = async (pattern) => {
  if (!isEnabled()) return
  try {
    const redis = getClient()
    if (!redis) return

    let cursor = "0"
    let deleted = 0

    do {
      const [nextCursor, foundKeys] = await redis.scan(
        cursor, "MATCH", pattern, "COUNT", 100
      )
      cursor = nextCursor
      if (foundKeys.length) {
        await redis.del(...foundKeys)
        deleted += foundKeys.length
      }
    } while (cursor !== "0")

    if (deleted > 0) {
      console.log(`🗑️  Cache invalidated ${deleted} key(s) matching "${pattern}"`)
    }
  } catch (err) {
    console.error(`⚠️  Cache INVALIDATE failed [${pattern}]:`, err.message)
  }
}

/**
 * Cache-aside helper — read through with auto-populate.
 *
 * Usage:
 *   const data = await withCache(keys.memberDetail(id), TTL.MEMBER_DETAIL, async () => {
 *     return await prisma.user.findUnique(...)
 *   })
 */
const withCache = async (key, ttl, fetchFn) => {
  const cached = await cacheGet(key)
  if (cached !== null) return cached

  const fresh = await fetchFn()
  if (fresh !== null && fresh !== undefined) {
    await cacheSet(key, fresh, ttl)
  }
  return fresh
}

module.exports = {
  getClient,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheInvalidatePattern,
  withCache,
  TTL,
  keys,
}
