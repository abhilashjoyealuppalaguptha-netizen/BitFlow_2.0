# BitFlow Automated Test Report

**Generated:** 2026-06-24T07:00:44.525Z

---

## 🔴 Summary

| Metric | Value |
|--------|-------|
| Total Tests | 23 |
| ✅ Passed | 3 |
| ❌ Failed | 20 |
| Score | **13%** |

---

## ❌ Pages (0/6)

| Status | Test | Detail |
|--------|------|--------|
| ❌ | Landing page | HTTP ERR |
| ❌ | Login page | HTTP ERR |
| ❌ | Sandbox page | HTTP ERR |
| ❌ | Learn page | HTTP ERR |
| ❌ | Arena page | HTTP ERR |
| ❌ | Academy page | HTTP ERR |

## ⚠️ Auth (1/6)

| Status | Test | Detail |
|--------|------|--------|
| ❌ | Student registration | HTTP 0 |
| ❌ | Student login | HTTP 0 |
| ❌ | Session persists (/api/auth/me) | HTTP 0 |
| ❌ | Login rejects bad password | HTTP 0 |
| ❌ | Logout succeeds | HTTP 0 |
| ✅ | Session cleared after logout | Cleared |

## ❌ Problems API (0/1)

| Status | Test | Detail |
|--------|------|--------|
| ❌ | GET /api/problems returns list | HTTP 0 |

## ❌ Submissions (0/1)

| Status | Test | Detail |
|--------|------|--------|
| ❌ | Skipped (no session) | Auth failed earlier |

## ❌ Progress (0/1)

| Status | Test | Detail |
|--------|------|--------|
| ❌ | Skipped (no session) | Auth failed earlier |

## ❌ Arena/Learn (0/2)

| Status | Test | Detail |
|--------|------|--------|
| ❌ | Arena hub page loads | HTTP 0 |
| ❌ | Learn hub page loads | HTTP 0 |

## ⚠️ Sandbox (1/2)

| Status | Test | Detail |
|--------|------|--------|
| ❌ | Verilog simulation runs (half adder) | HTTP 422 |
| ✅ | FastAPI backend reachable | HTTP 307 |

## ⚠️ Admin (1/4)

| Status | Test | Detail |
|--------|------|--------|
| ❌ | Admin registration with secret key | HTTP 0 |
| ❌ | Admin login | HTTP 0 |
| ✅ | Admin page route exists | HTTP 0 |
| ❌ | Admin page is reachable | HTTP 0 |

---

## 🔧 Failed Tests

- **[Pages] Landing page** — `HTTP ERR`
- **[Pages] Login page** — `HTTP ERR`
- **[Pages] Sandbox page** — `HTTP ERR`
- **[Pages] Learn page** — `HTTP ERR`
- **[Pages] Arena page** — `HTTP ERR`
- **[Pages] Academy page** — `HTTP ERR`
- **[Auth] Student registration** — `HTTP 0`
- **[Auth] Student login** — `HTTP 0`
- **[Auth] Session persists (/api/auth/me)** — `HTTP 0`
- **[Auth] Login rejects bad password** — `HTTP 0`
- **[Auth] Logout succeeds** — `HTTP 0`
- **[Problems API] GET /api/problems returns list** — `HTTP 0`
- **[Submissions] Skipped (no session)** — `Auth failed earlier`
- **[Progress] Skipped (no session)** — `Auth failed earlier`
- **[Arena/Learn] Arena hub page loads** — `HTTP 0`
- **[Arena/Learn] Learn hub page loads** — `HTTP 0`
- **[Sandbox] Verilog simulation runs (half adder)** — `HTTP 422`
- **[Admin] Admin registration with secret key** — `HTTP 0`
- **[Admin] Admin login** — `HTTP 0`
- **[Admin] Admin page is reachable** — `HTTP 0`

---

*BitFlow Test Suite — http://localhost:3000*
