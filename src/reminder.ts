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
): Promise<HttpClientResponse> {
    const httpClient = new HttpClient()
    const reviewers = pullRequest.requested_reviewers.map((rr) => `${rr.login}`).join(', ')
    const message = messageTemplate
        .replace('%reviewer%', reviewers)
        .replace('%pr_number%', pullRequest.number.toString())
        .replace('%pr_title%', pullRequest.title)
        .replace('%pr_url%', pullRequest.html_url)
    const data = {
        content: message,
    }
    const headers = {
        'content-type': 'application/json',
    }
    return httpClient.post(twistUrl, JSON.stringify(data), headers)
}
