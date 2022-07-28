import * as github from '@actions/github'

import type { GraphQlNode, GraphQlPullRequestResponse, PullRequest } from './types'

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
    if (now - reviewRequestTime < reviewDeadline) {
        // There is still time for review.
        return false
    }
    if (reviewTime && reviewTime > reviewRequestTime) {
        // Review is done.
        return false
    }

    return true
}

function getLatestCreatedAtTime(nodes: GraphQlNode[]): number | undefined {
    if (nodes.length === 0) {
        return undefined
    }

    const times = nodes.map((el) => new Date(el.createdAt).getTime())

    return Math.max(...times)
}
