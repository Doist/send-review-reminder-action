import { HttpClient, HttpClientResponse } from '@actions/http-client'

import type { PullRequest } from './types'

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
