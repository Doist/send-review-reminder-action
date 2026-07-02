#!/usr/bin/env node
// Smoke test for the Comms code path: post a comment into a Comms thread
// using a Todoist API token.
//
// This mirrors src/comms.ts but is standalone (uses Node's global fetch, no
// build needed) so you can verify the Comms call without needing an overdue
// PR. Secrets come from local-test/.env.local, which is git-ignored — see
// local-test/.env.example for the variables to set.
//
// Usage:
//   node local-test/comms-smoke-test.mjs              # post a comment
//   node local-test/comms-smoke-test.mjs --dry-run    # print the comment
//                                                     # request, don't post

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const COMMS_HOST = 'https://comms.todoist.com'
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

// --- Load local-test/.env.local into process.env (without overriding real env) ---
function loadEnv() {
    const here = dirname(fileURLToPath(import.meta.url))
    let raw
    try {
        raw = readFileSync(join(here, '.env.local'), 'utf8')
    } catch {
        return // no .env.local, rely on the ambient environment
    }
    for (const line of raw.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        // Strip surrounding quotes the way a shell `source` would.
        const value = trimmed
            .slice(eq + 1)
            .trim()
            .replace(/^(['"])(.*)\1$/, '$2')
        if (!(key in process.env)) process.env[key] = value
    }
}

function required(name) {
    const value = process.env[name]
    if (!value) {
        console.error(`Missing required env var: ${name} (set it in local-test/.env.local)`)
        process.exit(1)
    }
    return value
}

function generateCommentId() {
    const ts = Date.now()
    const r = () => Math.floor(Math.random() * 256)
    const bytes = [
        Math.floor(ts / 1099511627776) & 255,
        Math.floor(ts / 4294967296) & 255,
        Math.floor(ts / 16777216) & 255,
        Math.floor(ts / 65536) & 255,
        Math.floor(ts / 256) & 255,
        ts & 255,
        112 | (r() & 15),
        r(),
        128 | (r() & 63),
        r(), r(), r(), r(), r(), r(), r(),
    ]
    const digits = [0]
    for (const byte of bytes) {
        let carry = byte
        for (let j = 0; j < digits.length; j++) {
            carry += digits[j] << 8
            digits[j] = carry % 58
            carry = (carry / 58) | 0
        }
        while (carry > 0) {
            digits.push(carry % 58)
            carry = (carry / 58) | 0
        }
    }
    return digits.reverse().map((i) => BASE58_ALPHABET[i]).join('')
}

async function postComment() {
    const token = required('TODOIST_API_TOKEN')
    const recipients = (process.env.RECIPIENTS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
    const payload = {
        content: process.env.CONTENT || 'Local smoke test',
        recipients,
        thread_id: required('THREAD_ID'),
        id: generateCommentId(),
    }

    console.log(`> POST ${COMMS_HOST}/api/v1/comments/add`)
    console.log(JSON.stringify(payload, null, 2))

    if (process.argv.includes('--dry-run')) {
        console.log('\n(--dry-run: not posting)')
        return
    }

    const res = await fetch(`${COMMS_HOST}/api/v1/comments/add`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    })
    const text = await res.text()
    console.log(`< ${res.status} ${res.statusText}`)
    console.log(text)
    if (!res.ok) process.exit(1)
}

loadEnv()
await postComment()
console.log('\nDone.')
