/** Details of a GitHub user profile */
type User = {
    /** GitHub username */
    login: string
}

/** Details of a pending pull request on GitHub */
type PullRequest = {
    /** PR number */
    number: number
    /** The title of the PR */
    title: string
    /** The user who initiated the PR */
    user: User
    /** A link to the PR */
    html_url: string
    /** A list of users who a review has been requested from */
    requested_reviewers: User[]
}

/** Result expected from our GraphQL request to GitHub for PR details */
type GraphQlPullRequestResponse = {
    repository: {
        pullRequest: {
            timelineItems: {
                nodes: GraphQlNode[]
            }
            reviews: {
                nodes: GraphQlNode[]
            }
        }
    }
}

type GraphQlNode = {
    __typename: string
    createdAt: string
}

export { GraphQlNode, GraphQlPullRequestResponse, PullRequest, User }
