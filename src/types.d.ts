type User = {
    login: string
}

type PullRequest = {
    number: number
    title: string
    user: User
    html_url: string
    requested_reviewers: User[]
}

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
