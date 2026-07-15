# BitFlow Automated Test Report

**Generated:** 2026-06-24T08:10:12.646Z

---

## 🟡 Summary

| Metric | Value |
|--------|-------|
| Total Tests | 25 |
| ✅ Passed | 20 |
| ❌ Failed | 5 |
| Score | **80%** |

---

## ✅ Pages (6/6)

| Status | Test | Detail |
|--------|------|--------|
| ✅ | Landing page | HTTP 200 |
| ✅ | Login page | HTTP 200 |
| ✅ | Sandbox page | HTTP 200 |
| ✅ | Learn page | HTTP 200 |
| ✅ | Arena page | HTTP 200 |
| ✅ | Academy page | HTTP 200 |

## ⚠️ Auth (5/6)

| Status | Test | Detail |
|--------|------|--------|
| ✅ | Student registration | HTTP 200 |
| ✅ | Student login | HTTP 200 |
| ✅ | Session persists (/api/auth/me) | test_student_1782288612646 |
| ✅ | Login rejects bad password | HTTP 400 |
| ✅ | Logout succeeds | HTTP 200 |
| ❌ | Session cleared after logout | Session still active! |

## ❌ Problems API (0/1)

| Status | Test | Detail |
|--------|------|--------|
| ❌ | GET /api/problems returns list | HTTP 200 |

## ⚠️ Submissions (1/2)

| Status | Test | Detail |
|--------|------|--------|
| ❌ | POST /api/submissions saves submission | Problem not found: test-slug |
| ✅ | POST /api/submissions rejects unauthenticated | HTTP 404 |

## ✅ Progress (1/1)

| Status | Test | Detail |
|--------|------|--------|
| ✅ | GET /api/progress returns data | HTTP 200 |

## ✅ Arena/Learn (2/2)

| Status | Test | Detail |
|--------|------|--------|
| ✅ | Arena hub page loads | HTTP 200 |
| ✅ | Learn hub page loads | HTTP 200 |

## ⚠️ Sandbox (1/2)

| Status | Test | Detail |
|--------|------|--------|
| ❌ | Verilog simulation runs (half adder) | HTTP 422 |
| ✅ | FastAPI backend reachable | HTTP 307 |

## ⚠️ Admin (4/5)

| Status | Test | Detail |
|--------|------|--------|
| ✅ | Admin registration with secret key | HTTP 200 |
| ✅ | Admin login | ADMIN |
| ❌ | Admin can create question via POST /api/problems | Internal Server Error |
| ✅ | Admin page route exists | HTTP 200 |
| ✅ | Admin page is reachable | HTTP 200 |

---

## 🔧 Failed Tests

- **[Auth] Session cleared after logout** — `Session still active!`
- **[Problems API] GET /api/problems returns list** — `HTTP 200`
- **[Submissions] POST /api/submissions saves submission** — `Problem not found: test-slug`
- **[Sandbox] Verilog simulation runs (half adder)** — `HTTP 422`
- **[Admin] Admin can create question via POST /api/problems** — `Internal Server Error`

---

*BitFlow Test Suite — http://localhost:3000*
