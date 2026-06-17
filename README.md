# Send Review Reminder Action

This action checks all opened pull requests in a repository to find those that
are expecting a review they haven't received in the specified timeframe.

Any PRs found that have been waiting too long will have a reminder sent to a
Comms thread on their behalf via the Todoist Comms API.

To post to Comms the action authenticates against Todoist's OAuth token endpoint
using the password grant, then posts the reminder as a comment. The OAuth
credentials must belong to a confidential Todoist application authorized for the
`comms:` scopes.

## Todoist integration (Client ID & Secret)

The `client_id` and `client_secret` come from a **Todoist Integration installed
in the account of the user who will be posting to Comms** (the same account given
by `todoist_username` / `todoist_password`). The integration must be authorized
for the `comms:` scopes. These integrations are managed at
<https://app.todoist.com/app/settings/integrations/app-management>.

Doist maintainers: the shared posting account already has a suitable integration
installed ("Todoist Comms Send Message") that you can reuse rather than creating a
new one. Since this is a public repository, the specific client id, account, and
integration link are not listed here — ask the team for the values and store them
as GitHub secrets.

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
          client_id: ${{ secrets.client_id }}
          client_secret: ${{ secrets.client_secret }}
          todoist_username: ${{ secrets.todoist_username }}
          todoist_password: ${{ secrets.todoist_password }}
          thread_id: ${{ secrets.thread_id }}
          token: ${{ secrets.DOIST_BOT_TOKEN }}
          author_to_comms_mapping: 'github_username_a:123,github_username_b:456'

```

### Parameters

|name|required?|description|
|----|---------|-----------|
|review_time_ms|yes|The time in milliseconds a PR has to wait before a reminder will be sen, example is 24 hours|
|message|yes|The reminder message to send, takes 4 parameters for string interpolation: `%reviewer%`, `%pr_number%`, `%pr_title%` and `%pr_url%`|
|client_id|yes|OAuth client id of the Todoist Integration installed in the posting user's account (see [Todoist integration](#todoist-integration-client-id--secret)). Provide via a GitHub secret|
|client_secret|yes|OAuth client secret for that Todoist Integration. Provide via a GitHub secret|
|todoist_username|yes|Todoist account email used to authenticate via the OAuth password grant. Provide via a GitHub secret|
|todoist_password|yes|Todoist account password used to authenticate via the OAuth password grant|
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
