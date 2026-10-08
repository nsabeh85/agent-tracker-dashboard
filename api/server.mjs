import { createServer } from 'node:http'
import { request as httpRequest } from 'node:http'
import { spawn } from 'node:child_process'
import pg from 'pg'
import { hashPassword, signJwt, verifyJwt } from './authCrypto.mjs'
import {
  generateTemporaryPassword,
  parseAccountRequest,
} from '../src/lib/manageAccounts.ts'
import {
  mapJiraWebhookPayload,
  secretsMatch,
  webhookSecretFromHeaders,
} from '../src/lib/jiraApprovedImport.ts'

const PORT = Number(process.env.PORT || 8080)
const POSTGREST_PORT = Number(process.env.POSTGREST_PORT || 3001)
const JWT_TTL_SECONDS = 60 * 60 * 12
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: true } : undefined,
  max: 5,
})

function corsHeaders(req) {
  const origin = req.headers.origin
  const allow =
    origin && (ALLOWED_ORIGINS.size === 0 || ALLOWED_ORIGINS.has(origin)) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allow || '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, prefer, accept',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    Vary: 'Origin',
  }
}

function sendJson(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    ...extraHeaders,
  })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) {
        resolve(null)
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function bearer(req) {
  const header = req.headers.authorization || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

async function withUser(claims, run) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(claims),
    ])
    await client.query('SET LOCAL ROLE authenticated')
    const result = await run(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

function digitalRealtyEmail(value) {
  const email = String(value || '').trim().toLowerCase()
  return /@digitalrealty\.com$/.test(email) ? email : ''
}

function clientPrincipal(req) {
  const raw = req.headers['x-ms-client-principal']
  if (typeof raw !== 'string' || !raw) return null
  try {
    const principal = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
    const claimEmail = Array.isArray(principal.claims)
      ? principal.claims
          .map((claim) => digitalRealtyEmail(claim?.val))
          .find(Boolean)
      : ''
    const email = digitalRealtyEmail(principal.userDetails) || claimEmail || ''
    if (!email) return null
    return { email, id: String(principal.userId || email) }
  } catch {
    return null
  }
}

function issueSession(res, req, user) {
  const accessToken = signJwt(
    { role: 'authenticated', email: user.email, sub: user.id },
    process.env.JWT_SECRET,
    JWT_TTL_SECONDS,
  )
  sendJson(
    res,
    200,
    {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: JWT_TTL_SECONDS,
      user: { id: user.id, email: user.email },
    },
    corsHeaders(req),
  )
}

async function sessionFromSso(req, res) {
  const user = clientPrincipal(req)
  if (!user) {
    sendJson(res, 401, { error: 'unauthorized' }, corsHeaders(req))
    return
  }
  issueSession(res, req, user)
}

async function accounts(req, res) {
  const claims = verifyJwt(bearer(req), process.env.JWT_SECRET || '')
  if (!claims || claims.role !== 'authenticated' || typeof claims.email !== 'string') {
    sendJson(res, 401, { error: 'unauthorized' }, corsHeaders(req))
    return
  }
  let payload
  try {
    payload = await readBody(req)
  } catch {
    sendJson(res, 400, { error: 'invalid_json' }, corsHeaders(req))
    return
  }
  const parsed = parseAccountRequest(payload)
  if (!parsed.ok) {
    sendJson(res, 422, { error: parsed.reason }, corsHeaders(req))
    return
  }
  const request = parsed.value
  const isAdmin = await withUser(claims, async (client) => {
    const result = await client.query('SELECT public.is_admin() AS is_admin')
    return result.rows[0]?.is_admin === true
  })
  if (!isAdmin) {
    sendJson(res, 403, { error: 'forbidden' }, corsHeaders(req))
    return
  }

  if (request.action === 'list') {
    const result = await pool.query(
      'SELECT id, email, created_at, last_sign_in_at FROM app_private.users ORDER BY email',
    )
    sendJson(res, 200, { accounts: result.rows }, corsHeaders(req))
    return
  }

  if (request.action === 'remove') {
    if (request.email === claims.email.toLowerCase()) {
      sendJson(res, 422, { error: 'cannot_remove_self' }, corsHeaders(req))
      return
    }
    const removed = await pool.query('DELETE FROM app_private.users WHERE lower(email) = $1', [
      request.email,
    ])
    if (removed.rowCount === 0) {
      sendJson(res, 404, { error: 'not_found' }, corsHeaders(req))
      return
    }
    sendJson(res, 200, { removed: true }, corsHeaders(req))
    return
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = hashPassword(temporaryPassword)
  if (request.action === 'create') {
    const inserted = await pool.query(
      `INSERT INTO app_private.users (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING
       RETURNING email`,
      [request.email, passwordHash],
    )
    if (inserted.rowCount === 0) {
      sendJson(res, 409, { error: 'already_exists' }, corsHeaders(req))
      return
    }
    sendJson(
      res,
      200,
      { email: request.email, temporary_password: temporaryPassword },
      corsHeaders(req),
    )
    return
  }

  const updated = await pool.query(
    'UPDATE app_private.users SET password_hash = $2 WHERE lower(email) = $1 RETURNING email',
    [request.email, passwordHash],
  )
  if (updated.rowCount === 0) {
    sendJson(res, 404, { error: 'not_found' }, corsHeaders(req))
    return
  }
  sendJson(
    res,
    200,
    { email: request.email, temporary_password: temporaryPassword },
    corsHeaders(req),
  )
}

async function jiraImport(req, res) {
  const expected = process.env.JIRA_WEBHOOK_SECRET || ''
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value)
  }
  if (!secretsMatch(expected, webhookSecretFromHeaders(headers))) {
    sendJson(res, 401, { error: 'unauthorized' })
    return
  }
  let payload
  try {
    payload = await readBody(req)
  } catch {
    sendJson(res, 400, { error: 'invalid_json' })
    return
  }
  const mapped = mapJiraWebhookPayload(payload)
  if (!mapped.ok) {
    sendJson(res, 422, { error: mapped.reason })
    return
  }
  const value = mapped.value
  try {
    const result = await pool.query(
      `SELECT public.import_approved_jira_request(
         $1, $2, $3, $4, $5, $6, $7, $8, $9::public.agent_priority, $10
       ) AS result`,
      [
        value.issueKey,
        value.issueType,
        value.status,
        value.projectKey,
        value.title,
        value.requesterName,
        value.requesterDepartment,
        value.description,
        value.priority,
        value.sourceUrl,
      ],
    )
    sendJson(res, 200, result.rows[0]?.result ?? {})
  } catch (error) {
    const reason = error instanceof Error ? error.message.split('\n')[0] : 'import_failed'
    const known = [
      'not_approved',
      'wrong_project',
      'wrong_issue_type',
      'invalid_key',
      'invalid_source_url',
      'missing_title',
    ]
    sendJson(res, known.includes(reason) ? 422 : 500, {
      error: known.includes(reason) ? reason : 'import_failed',
    })
  }
}

function proxyRest(req, res) {
  const path = (req.url || '/').replace(/^\/rest\/v1/, '') || '/'
  const headers = { ...req.headers, host: `127.0.0.1:${POSTGREST_PORT}` }
  const upstream = httpRequest(
    {
      hostname: '127.0.0.1',
      port: POSTGREST_PORT,
      path,
      method: req.method,
      headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, {
        ...upstreamRes.headers,
        ...corsHeaders(req),
      })
      upstreamRes.pipe(res)
    },
  )
  upstream.on('error', () => {
    sendJson(res, 502, { error: 'data_api_unavailable' }, corsHeaders(req))
  })
  req.pipe(upstream)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function startPostgrest() {
  const child = spawn(process.env.POSTGREST_BIN || 'postgrest', [], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PGRST_SERVER_PORT: String(POSTGREST_PORT),
      PGRST_SERVER_HOST: '127.0.0.1',
      PGRST_DB_SCHEMAS: 'public',
      PGRST_DB_ANON_ROLE: 'anon',
      PGRST_DB_EXTRA_SEARCH_PATH: 'public',
      PGRST_JWT_SECRET: process.env.JWT_SECRET,
      PGRST_DB_URI: process.env.PGRST_DB_URI,
    },
  })
  child.on('exit', (code) => {
    console.error(`postgrest exited ${code}`)
    process.exit(1)
  })
}

async function waitForPostgrest() {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const ready = await new Promise((resolve) => {
      const probe = httpRequest(
        { hostname: '127.0.0.1', port: POSTGREST_PORT, path: '/', method: 'GET', timeout: 500 },
        (response) => {
          response.resume()
          resolve((response.statusCode || 500) < 500)
        },
      )
      probe.on('error', () => resolve(false))
      probe.end()
    })
    if (ready) return
    await sleep(200)
  }
}

async function main() {
  if (!process.env.DATABASE_URL || !process.env.PGRST_DB_URI || !process.env.JWT_SECRET) {
    throw new Error('DATABASE_URL, PGRST_DB_URI, and JWT_SECRET are required')
  }
  startPostgrest()
  await waitForPostgrest()

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost')
    const path = url.pathname.replace(/^\/api(?=\/)/, '') || '/'
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders(req))
      res.end()
      return
    }
    try {
      if (req.method === 'GET' && path === '/health') {
        sendJson(res, 200, { ok: true })
        return
      }
      if (req.method === 'POST' && path === '/auth/session') {
        await sessionFromSso(req, res)
        return
      }
      if (req.method === 'POST' && path === '/accounts') {
        await accounts(req, res)
        return
      }
      if (req.method === 'POST' && path === '/jira/import') {
        await jiraImport(req, res)
        return
      }
      if (path.startsWith('/rest/v1')) {
        req.url = `${path}${url.search}`
        proxyRest(req, res)
        return
      }
      sendJson(res, 404, { error: 'not_found' }, corsHeaders(req))
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'request failed')
      if (!res.headersSent) sendJson(res, 500, { error: 'server_error' }, corsHeaders(req))
    }
  })
  server.listen(PORT, () => {
    console.log(`tracker api listening on ${PORT}`)
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'failed to start')
  process.exit(1)
})
