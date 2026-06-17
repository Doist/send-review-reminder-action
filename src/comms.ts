import { HttpClient, HttpClientResponse } from '@actions/http-client'
import { randomBytes } from 'node:crypto'

/** Socket timeout (ms) applied to all network calls so a hung connection
 * doesn't burn CI minutes on the library's 3-minute default. */
const SOCKET_TIMEOUT_MS = 30000

/** Host used to exchange credentials for an OAuth access token. */
const TOKEN_HOST = 'https://app.todoist.com'
/** Host of the Comms API used to post comments. */
const COMMS_HOST = 'https://comms.todoist.com'
/** Comms identifies its protected resource (audience) by this URL. */
const COMMS_RESOURCE = 'https://comms.todoist.com'
/** Scopes required to post a reminder comment into a Comms thread. */
const COMMS_SCOPE = 'comms:content:write,comms:messages:write'

/** Base58 alphabet (Bitcoin-style: no 0, O, I or l). */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

type AccessTokenResponse = {
    access_token?: string
}

/**
 * Authenticates against Todoist's OAuth token endpoint using the password grant
 * and returns a comms-scoped bearer token.
 *
 * Integrations no longer exist in the Comms API, so instead of a baked-in
 * integration URL we exchange real credentials for a short-lived token. The
 * `resource` parameter is what makes the issued token a comms-audience token.
 *
 * @param clientId OAuth client id of a confidential Todoist application.
 * @param clientSecret OAuth client secret for that application.
 * @param username Todoist account email.
 * @param password Todoist account password.
 * @returns The access token string to use as a bearer credential.
 */
export async function getCommsAccessToken(
    clientId: string,
    clientSecret: string,
    username: string,
    password: string,
): Promise<string> {
    const body = new URLSearchParams({
        grant_type: 'password',
        client_id: clientId,
        client_secret: clientSecret,
        username: username,
        password: password,
        scope: COMMS_SCOPE,
        resource: COMMS_RESOURCE,
    }).toString()

    const httpClient = new HttpClient('send-review-reminder', [], {
        socketTimeout: SOCKET_TIMEOUT_MS,
    })
    const response = await httpClient.post(`${TOKEN_HOST}/oauth/access_token`, body, {
        'content-type': 'application/x-www-form-urlencoded',
    })

    const responseBody = await response.readBody()
    const statusCode = response.message.statusCode ?? 0
    if (statusCode >= 300) {
        throw new Error(`Failed to obtain Comms access token: ${statusCode} - ${responseBody}`)
    }

    const parsed = JSON.parse(responseBody) as AccessTokenResponse
    if (!parsed.access_token) {
        throw new Error('Comms access token response did not contain an access_token')
    }

    return parsed.access_token
}

/**
 * Posts a comment into a Comms thread.
 *
 * @param token A comms-scoped bearer token from {@link getCommsAccessToken}.
 * @param threadId The Comms thread to post the comment into.
 * @param content The rendered reminder message.
 * @param recipients Numeric Comms user ids to notify.
 * @returns Awaitable http post response.
 */
export async function postComment(
    token: string,
    threadId: string,
    content: string,
    recipients: Array<number>,
): Promise<HttpClientResponse> {
    const httpClient = new HttpClient('send-review-reminder', [], {
        socketTimeout: SOCKET_TIMEOUT_MS,
    })
    return httpClient.post(
        `${COMMS_HOST}/api/v1/comments/add`,
        JSON.stringify({
            content: content,
            recipients: recipients,
            thread_id: threadId,
            // Client-generated id, used by Comms as the comment's stable identifier.
            id: generateCommentId(),
        }),
        {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
        },
    )
}

/**
 * Generates a client-side comment id: a UUIDv7-style 16-byte value (48-bit
 * millisecond timestamp, version 7, variant bits, and random bytes) encoded
 * using the base58 alphabet.
 *
 * @returns A base58-encoded comment id.
 */
function generateCommentId(): string {
    const ts = Date.now()

    // 10 cryptographically-random bytes; the layout below consumes them in order.
    const rnd = randomBytes(10)

    // 6 big-endian timestamp bytes, then version (0111) + variant (10) + random.
    const bytes = [
        Math.floor(ts / 1099511627776) & 255,
        Math.floor(ts / 4294967296) & 255,
        Math.floor(ts / 16777216) & 255,
        Math.floor(ts / 65536) & 255,
        Math.floor(ts / 256) & 255,
        ts & 255,
        112 | (rnd.readUInt8(0) & 15),
        rnd.readUInt8(1),
        128 | (rnd.readUInt8(2) & 63),
        rnd.readUInt8(3),
        rnd.readUInt8(4),
        rnd.readUInt8(5),
        rnd.readUInt8(6),
        rnd.readUInt8(7),
        rnd.readUInt8(8),
        rnd.readUInt8(9),
    ]

    // Big-endian base58 encoding of the 16-byte value.
    const digits = [0]
    for (const byte of bytes) {
        let carry = byte
        for (let j = 0; j < digits.length; j++) {
            carry += (digits[j] ?? 0) << 8
            digits[j] = carry % 58
            carry = (carry / 58) | 0
        }
        while (carry > 0) {
            digits.push(carry % 58)
            carry = (carry / 58) | 0
        }
    }

    return digits
        .reverse()
        .map((index) => BASE58_ALPHABET[index])
        .join('')
}
