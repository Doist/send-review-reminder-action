import * as core from '@actions/core'
import * as github from '@actions/github'

import { getCommsAccessToken } from './comms'
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
const CLIENT_ID = core.getInput('client_id', { required: true })
const CLIENT_SECRET = core.getInput('client_secret', { required: true })
const TODOIST_USERNAME = core.getInput('todoist_username', { required: true })
const TODOIST_PASSWORD = core.getInput('todoist_password', { required: true })
const THREAD_ID = core.getInput('thread_id', { required: true })
const REMINDER_MESSAGE = core.getInput('message', { required: true })
const AUTHOR_TO_COMMS_MAPPING = core.getInput('author_to_comms_mapping', { required: false })
const IGNORE_DRAFT_PRS = core.getBooleanInput('ignore_draft_prs', { required: true })
const IGNORE_LABELS = core.getInput('ignore_labels', { required: false })
const IGNORE_PRS_WITH_FAILING_CHECKS = core.getBooleanInput('ignore_prs_with_failing_checks', {
    required: true,
})
const IGNORE_REVIEW_BOTS = core.getInput('ignore_review_bots', { required: false })

async function run(): Promise<void> {
    const authorToCommsMap = createAuthorToCommsMap(AUTHOR_TO_COMMS_MAPPING)
    const pullRequests = await fetchPullRequests(GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO)

    // Fetched lazily on the first due reminder so quiet runs make no auth call.
    let accessToken: string | null = null

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
            IGNORE_REVIEW_BOTS,
        )
        if (remind) {
            core.info(`Sending reminder`)
            if (accessToken === null) {
                accessToken = await getCommsAccessToken(
                    CLIENT_ID,
                    CLIENT_SECRET,
                    TODOIST_USERNAME,
                    TODOIST_PASSWORD,
                )
            }
            const response = await sendReminder(
                pullRequest,
                REMINDER_MESSAGE,
                accessToken,
                THREAD_ID,
                authorToCommsMap,
            )
            const statusCode = response.message.statusCode as number
            if (statusCode >= 300) {
                const message = response.message.statusMessage as string
                core.setFailed(`Cannot post message to Comms: ${statusCode} - ${message}`)
                return
            }
        }
    }
}

/**
 * Takes in a string in the format `username:comms_user_id,username:comms_user_id` (eg `bob:123,jane:456`)
 * and parses it into a map of GitHub usernames to their associated Comms User IDs.
 *
 * @param input The string to process.
 * @returns A map of GitHub usernames to their associated Comms User IDs.
 */
function createAuthorToCommsMap(input: string): { [id: string]: number } {
    const mapping: { [id: string]: number } = {}

    if (!input) {
        return mapping
    }

    for (const individual of input.split(',')) {
        const [username, commsUserID] = individual.split(':')

        if (!username || !commsUserID) {
            continue
        }

        mapping[username] = parseInt(commsUserID)
    }

    return mapping
}

run().catch((error) => core.setFailed((error as Error).message))
