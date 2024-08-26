import * as core from '@actions/core'
import * as github from '@actions/github'

import {
    fetchPullRequests,
    isMissingReview,
    isPRFailingStatusChecks,
    shouldIgnore,
} from './pullrequest'
import { sendReminder } from './reminder'

const GITHUB_REPO_OWNER = github.context.repo.owner
const GITHUB_REPO = github.context.repo.repo

const GITHUB_TOKEN = core.getInput('token', { required: true })
const REVIEW_TIME_MS = parseInt(core.getInput('review_time_ms', { required: true }))
const IGNORE_AUTHORS = core.getInput('ignore_authors', { required: false })
const TWIST_URL = core.getInput('twist_url', { required: true })
const REMINDER_MESSAGE = core.getInput('message', { required: true })
const IGNORE_DRAFT_PRS = core.getBooleanInput('ignore_draft_prs', { required: true })
const IGNORE_LABELS = core.getInput('ignore_labels', { required: false })
const IGNORE_PRS_WITH_FAILING_CHECKS = core.getBooleanInput('ignore_prs_with_failing_checks', {
    required: true,
})

async function run(): Promise<void> {
    const pullRequests = await fetchPullRequests(GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO)
    for (const pullRequest of pullRequests) {
        if (shouldIgnore(pullRequest, IGNORE_AUTHORS, IGNORE_DRAFT_PRS, IGNORE_LABELS)) {
            core.info(`Ignoring #${pullRequest.number} "${pullRequest.title}"`)
            continue
        }

        if (IGNORE_PRS_WITH_FAILING_CHECKS) {
            const prFailingStatusChecks = await isPRFailingStatusChecks(
                GITHUB_TOKEN,
                GITHUB_REPO_OWNER,
                GITHUB_REPO,
                pullRequest,
            )

            if (prFailingStatusChecks) {
                core.info(
                    `Ignoring #${pullRequest.number} "${pullRequest.title} as the status checks are failing"`,
                )
                continue
            }
        }

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
