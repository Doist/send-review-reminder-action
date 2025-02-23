import * as github from '@actions/github'

import type { GraphQlNode, GraphQlPullRequestResponse, PullRequest } from './types'

/**
 * Get a list of all currently open pull requests in a repository
 *
 * @param gitHubToken The token used to authenticate with GitHub to access the repo
 * @param repoOwner The owner of the repo
 * @param repo The name of the repo
 * @returns An awaiting collection of pull request objects
 */
export async function fetchPullRequests(
    gitHubToken: string,
    repoOwner: string,
    repo: string,
): Promise<PullRequest[]> {
    const octokit = github.getOctokit(gitHubToken)
    const { data } = await octokit.rest.pulls.list({
        owner: repoOwner,
        repo,
        state: 'open',
    })

    return data as PullRequest[]
}

/**
 * Decide whether to ignore this pull request and not send any reminders about it.
 * Uses the collection of authors to determine whether it should be ignored.
 *
 * @param pullRequest The PR being processed.
 * @param ignoreAuthors
 *     A list of usernames, if the PR was created by any of these authors we will ignore it.
 * @param ignoreDraftPRs If true any PR in draft state will be ignored.
 * @param ignoreLabels A list of labels, if the PR has any of these attached it will be ignored.
 * @returns True if we should ignore the PR, otherwise false.
 */
export function shouldIgnore(
    pullRequest: PullRequest,
    ignoreAuthors: string,
    ignoreDraftPRs: boolean,
    ignoreLabels: string,
): boolean {
    if (pullRequest.requested_reviewers.length === 0) {
        return true
    }
    const ignoreAuthorsArray = splitStringList(ignoreAuthors)

    if (ignoreAuthorsArray.includes(pullRequest.user.login)) {
        return true
    }

    if (ignoreDraftPRs && pullRequest.draft) {
        return true
    }

    if (pullRequest.labels) {
        const ignoreLabelsArray = splitStringList(ignoreLabels)

        for (const labelOnPR of pullRequest.labels) {
            if (ignoreLabelsArray.includes(labelOnPR.name)) {
                return true
            }
        }
    }

    return false
}

/**
 * Returns whether the provided PR is failing it's status checks
 * @param gitHubToken The token used to authenticate with GitHub to access the repo
 * @param repoOwner The owner of the repo
 * @param repo The name of the repo
 * @param pullRequest The pull request to check.
 * @returns
 *     True if any status checks are in error or failing state,
 *     false if checks are pending or have succeeded.
 */
export async function isPRFailingStatusChecks(
    gitHubToken: string,
    repoOwner: string,
    repo: string,
    pullRequest: PullRequest,
): Promise<boolean> {
    const octokit = github.getOctokit(gitHubToken)
    const { data } = await octokit.rest.repos.getCombinedStatusForRef({
        owner: repoOwner,
        repo,
        ref: pullRequest.head.ref,
    })

    // Possible values are `success,pending,error,failure`
    return ['error', 'failure'].includes(data.state)
}

/**
 * Identifies whether the PR being passed in has not had any review activity in the last 24 hours.
 *
 * @param pullRequest The pull request to check
 * @param reviewDeadline The total time in ms before a PR is considered stale
 * @param gitHubToken The token used to authenticate with GitHub to access the repo
 * @param repoOwner The owner of the repo
 * @param repo The name of the repo
 * @returns An awaitable bool indicating whether this PR is missing a review.
 */
export async function isMissingReview(
    pullRequest: PullRequest,
    reviewDeadline: number,
    gitHubToken: string,
    repoOwner: string,
    repo: string,
): Promise<boolean> {
    const octokit = github.getOctokit(gitHubToken)
    const response = await octokit.graphql<GraphQlPullRequestResponse>(
        `
        query($owner: String!, $name: String!, $number: Int!) {
          repository(owner: $owner, name: $name) {
            pullRequest(number: $number) {
              timelineItems(first: 50, itemTypes: [REVIEW_REQUESTED_EVENT]) {
                nodes {
                  __typename
                  ... on ReviewRequestedEvent {
                    createdAt
                  }
                }
              },
              reviews(first: 50, states: [APPROVED, CHANGES_REQUESTED, COMMENTED]) {
                nodes {
                  __typename
                  ... on PullRequestReview {
                    createdAt
                  }
                }
              }
            }
          }
        }
        `,
        {
            owner: repoOwner,
            name: repo,
            number: pullRequest.number,
        },
    )

    const latestReviewRequestTime = getLatestCreatedAtTime(
        response.repository.pullRequest.timelineItems.nodes,
    )
    const latestReviewTime = getLatestCreatedAtTime(response.repository.pullRequest.reviews.nodes)

    return isAfterReviewDeadline(latestReviewRequestTime, latestReviewTime, reviewDeadline)
}

/**
 * Receives a collection of events from the PR and identifies what the time of the last event was.
 *
 * @param nodes Events taken from the PR
 * @returns The time the last event occurred (milliseconds from epoch)
 */
function getLatestCreatedAtTime(nodes: GraphQlNode[]): number | undefined {
    if (nodes.length === 0) {
        return undefined
    }

    const times = nodes.map((el) => new Date(el.createdAt).getTime())

    return Math.max(...times)
}

/**
 * Check whether this PR has been waiting over 24 hours for a review,
 * based on the time between when the review was requested, and whether
 * there has been any review activity since then.
 *
 * Only counts weekdays, excludes weekends when checking if 24 hours have passed.
 *
 * @param reviewRequestTime The latest time the creator requested a person review the PR
 * @param reviewTime The latest time the PR was reviewed
 * @param reviewDeadline The total time in ms before a PR is considered stale
 * @returns True if the PR is considered stale, otherwise false
 */
function isAfterReviewDeadline(
    reviewRequestTime: number | undefined,
    reviewTime: number | undefined,
    reviewDeadline: number,
): boolean {
    if (!reviewRequestTime) {
        // There is no review request.
        return false
    }
    const now = new Date().getTime()

    let adjustedReviewDeadline = reviewDeadline
    if (isWeekend(new Date(reviewRequestTime + reviewDeadline))) {
        // Push the deadline past the weekend (shift forward by 2 days)
        adjustedReviewDeadline = reviewDeadline + 172800000
    }

    if (now - reviewRequestTime < adjustedReviewDeadline) {
        // There is still time for review.
        return false
    }
    if (reviewTime && reviewTime > reviewRequestTime) {
        // Review is done.
        return false
    }

    return true
}

function splitStringList(input: string): Array<string> {
    return input.split(',').map((item) => item.trim())
}

function isWeekend(date: Date): boolean {
    return date.getDay() % 6 === 0
}
