import * as core from '@actions/core'
import * as github from '@actions/github'

import { fetchPullRequests, isMissingReview } from './pullrequest'
import { sendReminder } from './reminder'

const GITHUB_REPO_OWNER = github.context.repo.owner
const GITHUB_REPO = github.context.repo.repo

const GITHUB_TOKEN = core.getInput('token', { required: true })
const REVIEW_TIME_MS = parseInt(core.getInput('review_time_ms', { required: true }))
const TWIST_URL = core.getInput('twist_url', { required: true })
const REMINDER_MESSAGE = core.getInput('message', { required: true })

async function run(): Promise<void> {
    const pullRequests = await fetchPullRequests(GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO)
    for (const pullRequest of pullRequests) {
        core.info(`Checking #${pullRequest.number} "${pullRequest.title}"`)
        const remind = await isMissingReview(
            pullRequest,
            REVIEW_TIME_MS,
            GITHUB_TOKEN,
            GITHUB_REPO_OWNER,
            GITHUB_REPO,
        )
        if (remind) {
            core.info(`Sending reminder`)
            const response = await sendReminder(pullRequest, REMINDER_MESSAGE, TWIST_URL)
            const statusCode = response.message.statusCode as number
            if (statusCode >= 300) {
                const message = response.message.statusMessage as string
                core.setFailed(`Cannot post message to Twist: ${statusCode} - ${message}`)
                return
            }
        }
    }
}

run().catch((error) => core.setFailed((error as Error).message))
