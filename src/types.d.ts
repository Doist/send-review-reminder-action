/** Details of a GitHub user profile */
type User = {
    /** GitHub username */
    login: string
}

/** A label associated with a PR */
type PullRequestLabel = {
    name: string
}

/** The head refernece for the PR (eg the branch reference) */
type PullRequestHead = {
    ref: string
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
    /** Whether the PR is currently in draft mode */
    draft?: boolean
    /** Collection of labels associated with the PR */
    labels: PullRequestLabel[] | undefined
    /** Details on the branch the PR is coming from */
    head: PullRequestHead
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
