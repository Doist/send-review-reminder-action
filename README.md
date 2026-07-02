# Send Review Reminder Action

This action checks all opened pull requests in a repository to find those that
are expecting a review they haven't received in the specified timeframe.

Any PRs found that have been waiting too long will have a reminder sent to a
Comms thread on their behalf via the Todoist Comms API.

To post to Comms the action authenticates with a **Todoist personal access
token** belonging to the user who will post the reminders. Personal access
tokens can be created at
<https://app.todoist.com/app/settings/integrations/developer>. Store the token
as a GitHub secret — tokens are easy to revoke and rotate if they ever leak.

## Usage:

```yaml
name: 'Send review reminders'

on:
  schedule:
    # Every day at 10 AM.
    - cron: '0 10 * * *'
      
jobs:
  remind:
    runs-on: ubuntu-latest

    steps:
      - uses: doist/send-review-reminder-action@main
        with:
          message: '%reviewer%, please review [#%pr_number% - %pr_title%](%pr_url%)'
          ignore_authors: 'tom, renovate'
          ignore_draft_prs: true
          ignore_labels: 'do not merge, blocked'
          ignore_prs_with_failing_checks: true
          review_time_ms: 86400000 # 1 day in milliseconds
          todoist_access_token: ${{ secrets.todoist_access_token }}
          thread_id: ${{ secrets.thread_id }}
          token: ${{ secrets.DOIST_BOT_TOKEN }}
          author_to_comms_mapping: 'github_username_a:123,github_username_b:456'

```

### Parameters

|name|required?|description|
|----|---------|-----------|
|review_time_ms|yes|The time in milliseconds a PR has to wait before a reminder will be sen, example is 24 hours|
|message|yes|The reminder message to send, takes 4 parameters for string interpolation: `%reviewer%`, `%pr_number%`, `%pr_title%` and `%pr_url%`|
|todoist_access_token|yes|Todoist personal access token of the user who will post the reminders to Comms. Provide via a GitHub secret|
|thread_id|yes|The Comms thread id to post reminder messages into|
|token|yes|The token for accessing the GitHub API to query the state of the PRs in a repo|
|ignore_authors|no|Usernames of PR creators who's PRs will be ignored|
|ignore_draft_prs|no|Whether we should ignore draft PRs when checking reviews, defaults to false|
|ignore_labels|no|If provided any PRs with these labels will skip the review reminder check|
|ignore_prs_with_failing_checks|no|If the PR has any failing or errored status checks, ignore it|
|author_to_comms_mapping|no|A mapping of each possible reviewer's GitHub username to their associated Comms (Todoist) user id. If provided it will ensure the correct user is notified in Comms when a review is overdue|

## Development

Uses Node v20.x

Switch into this folder after checking out the repository, run `npm install` to install all dependencies.

After applying your changes, run `npm run all`. It will check your code and compile a new version into the `dist` 
folder.

### Testing locally

The `local-test/` folder contains two harnesses. Both read their configuration
(including secrets) from `local-test/.env.local`, which is git-ignored — copy
`local-test/.env.example` to `local-test/.env.local` and fill it in.

To verify the Comms integration in isolation (posts a test comment into the
configured thread using your `TODOIST_ACCESS_TOKEN`, no build needed):

```shell
node local-test/comms-smoke-test.mjs           # post a test comment
node local-test/comms-smoke-test.mjs --dry-run # print the request without posting
```

To run the full built action exactly as GitHub Actions would (requires
`npm run all` first; makes real GitHub API calls and, if any PR is overdue,
a real Comms post):

```shell
./local-test/run-action-locally.sh
```
