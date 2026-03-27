/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Express middleware that automatically invalidates Redis cache after any
 * mutating request (POST / PUT / PATCH / DELETE) completes successfully.
 *
 * Attach to individual routes or router-level via:
 *   router.post("/", authenticate, cacheInvalidate("members"), controller.create)
 *   router.put("/:id", authenticate, cacheInvalidate("members"), controller.update)
 *
 * Domain → patterns map keeps invalidation logic in one place.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { cacheInvalidatePattern, cacheDel, keys } = require("../lib/redis")

// Maps a domain name → array of glob patterns to wipe
const INVALIDATION_MAP = {
  members:       ["members:*", "dashboard:*"],
  contributions: ["contributions:*", "dashboard:*", "members:detail:*"],
  claims:        ["claims:*", "dashboard:*"],
  loans:         ["loans:*", "dashboard:*", "members:detail:*"],
  groups:        ["groups:*", "members:*"],
  announcements: ["announcements:*"],
  notifications: ["notifications:*"],
  payments:      ["contributions:*", "dashboard:*"],
  dashboard:     ["dashboard:*"],
}

/**
 * Returns an Express middleware that invalidates cache for `domain`
 * after the response has been successfully sent (2xx).
 *
 * @param {string} domain - key from INVALIDATION_MAP
 * @param {string|null} idParam - optional req.params key to also del detail cache
 */
const cacheInvalidate = (domain, idParam = null) => {
  return (req, res, next) => {
    // Only intercept mutating methods
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      return next()
    }

    // Hook into response finish event
    const originalJson = res.json.bind(res)
    res.json = function (body) {
      originalJson(body)

      // Only invalidate on success (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patterns = INVALIDATION_MAP[domain] || []

        Promise.all(patterns.map((p) => cacheInvalidatePattern(p)))
          .then(() => {
            // Also bust specific detail key if idParam provided
            if (idParam && req.params[idParam]) {
              const detailKey = keys[`${domain.slice(0, -1)}Detail`]?.(req.params[idParam])
              if (detailKey) cacheDel(detailKey)
            }
          })
          .catch((err) =>
            console.error("⚠️  Post-response cache invalidation failed:", err.message)
          )
      }
    }

    next()
  }
}

module.exports = { cacheInvalidate, INVALIDATION_MAP }
