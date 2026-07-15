# BitFlow Automated Test Report

**Generated:** 2026-06-24T12:14:52.592Z

---

## 🟡 Summary

| Metric | Value |
|--------|-------|
| Total Tests | 27 |
| ✅ Passed | 23 |
| ❌ Failed | 4 |
| Score | **85%** |

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
| ✅ | Session persists (/api/auth/me) | test_student_1782303292596 |
| ✅ | Login rejects bad password | HTTP 400 |
| ✅ | Logout succeeds | HTTP 200 |
| ❌ | Session cleared after logout | Session still active! |

## ✅ Problems API (3/3)

| Status | Test | Detail |
|--------|------|--------|
| ✅ | GET /api/problems returns list | 103 problems |
| ✅ | GET /api/problems/[slug] | largest-digit-fsm |
| ✅ | GET /api/problems/[slug] returns 404 for unknown | HTTP 404 |

## ⚠️ Submissions (1/2)

| Status | Test | Detail |
|--------|------|--------|
| ❌ | POST /api/submissions saves submission | Internal Server Error |
| ✅ | POST /api/submissions handles unauthenticated | HTTP 500 |

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
| ❌ | Verilog simulation runs (half adder) | 422 — required fields: body.design_v, body.testbench_v |
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
- **[Submissions] POST /api/submissions saves submission** — `Internal Server Error`
- **[Sandbox] Verilog simulation runs (half adder)** — `422 — required fields: body.design_v, body.testbench_v`
- **[Admin] Admin can create question via POST /api/problems** — `Internal Server Error`

---

*BitFlow Test Suite — http://localhost:3000*
