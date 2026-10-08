import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const KEY_LENGTH = 64

/** Stored as scrypt$N$r$p$salt$hash. Not a Supabase hash; those cannot be copied. */
export function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, KEY_LENGTH, SCRYPT)
  return [
    'scrypt',
    String(SCRYPT.N),
    String(SCRYPT.r),
    String(SCRYPT.p),
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$')
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts
  const n = Number(nRaw)
  const r = Number(rRaw)
  const p = Number(pRaw)
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false
  const salt = Buffer.from(saltB64, 'base64')
  const expected = Buffer.from(hashB64, 'base64')
  if (salt.length === 0 || expected.length === 0) return false
  const actual = scryptSync(password, salt, expected.length, {
    N: n,
    r,
    p,
    maxmem: SCRYPT.maxmem,
  })
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

function encode(value) {
  return Buffer.from(value).toString('base64url')
}

export function signJwt(payload, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000)
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = encode(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }))
  const data = `${header}.${body}`
  const signature = createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${signature}`
}

export function verifyJwt(token, secret) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, signature] = parts
  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null
  let payload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!payload || typeof payload.exp !== 'number') return null
  if (payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}
