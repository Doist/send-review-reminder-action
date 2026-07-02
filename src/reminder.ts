import { postComment } from './comms'

import type { HttpClientResponse } from '@actions/http-client'
import type { PullRequest } from './types'

/**
 * Sends a reminder about the stalled pull request to a Comms thread.
 * @param pullRequest The PR to send the reminder about
 * @param messageTemplate The message template to fill with details of the review
 * @param token The Todoist API token used to authenticate the Comms API call
 * @param threadId The Comms thread to post the reminder into
 * @param authorToCommsMapping GitHub username to Comms user id mapping used to notify reviewers
 * @returns Awaitable http post response
 */
export async function sendReminder(
    pullRequest: PullRequest,
    messageTemplate: string,
    token: string,
    threadId: string,
    authorToCommsMapping: { [id: string]: number },
): Promise<HttpClientResponse> {
    const recipients: Array<number> = []
    const userReviewers = pullRequest.requested_reviewers.map((rr) => {
        const commsUserID = authorToCommsMapping[rr.login]

        if (commsUserID) {
            recipients.push(commsUserID)
            return `[${rr.login}](comms-mention://${commsUserID})`
        }
        return `${rr.login}`
    })

    // Reviews can also be requested from a team (e.g. "Backend Hero") rather than
    // an individual. Teams have no Comms user id, so they're listed as plain text.
    const teamReviewers = (pullRequest.requested_teams ?? []).map((team) => team.name)

    const reviewers = [...userReviewers, ...teamReviewers].join(', ')

    const message = messageTemplate
        .replace('%reviewer%', reviewers)
        .replace('%pr_number%', pullRequest.number.toString())
        .replace('%pr_title%', pullRequest.title)
        .replace('%pr_url%', pullRequest.html_url)

    return postComment(token, threadId, message, recipients)
}
