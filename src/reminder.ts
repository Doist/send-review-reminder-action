import { HttpClient, HttpClientResponse } from '@actions/http-client'

import type { PullRequest } from './types'

/**
 * Sends a reminder about the stalled pull request to a Twist thread
 * @param pullRequest The PR to send the reminer about
 * @param messageTemplate The message template to fill with details of the review
 * @param twistUrl The integration link for Twist used to post the message to a thread / channel
 * @returns Awaitable http post response
 */
export async function sendReminder(
    pullRequest: PullRequest,
    messageTemplate: string,
    twistUrl: string,
    authorToTwistMapping: { [id: string]: number },
): Promise<HttpClientResponse> {
    const recipients: Array<number> = []
    const reviewers = pullRequest.requested_reviewers
        .map((rr) => {
            const twistUserID = authorToTwistMapping[rr.login]

            if (twistUserID) {
                recipients.push(twistUserID)
                return `[${rr.login}](twist-mention://${twistUserID})`
            }
            return `${rr.login}`
        })
        .join(', ')

    const message = messageTemplate
        .replace('%reviewer%', reviewers)
        .replace('%pr_number%', pullRequest.number.toString())
        .replace('%pr_title%', pullRequest.title)
        .replace('%pr_url%', pullRequest.html_url)

    const httpClient = new HttpClient()
    return httpClient.post(
        twistUrl,
        JSON.stringify({
            content: message,
            recipients: recipients,
        }),
        { 'content-type': 'application/json' },
    )
}
