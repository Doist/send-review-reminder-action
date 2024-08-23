# Send Review Reminder Action

This action checks all opened pull requests in a repository to find those that
are expecting a review they haven't received in the specified timeframe.

Any PRs found that have been waiting too long will have a reminder sent to a
Twist thread on their behalf.

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
          exclude_draft_prs: true
          review_time_ms: 86400000 # 1 day in milliseconds
          twist_url: 'https://twist.com/api/v3/integration_incoming/post_data?install_id=[install id]&install_token=[install token]'
          token: ${{ secrets.DOIST_BOT_TOKEN }}

```

### Parameters

|name|required?|example|description|
|----|---------|-------|-----------|
|review_time_ms|yes|`86400000`|The time in milliseconds a PR has to wait before a reminder will be sen, example is 24 hours|
|message|yes|`%reviewer%, `<br/>`please review `<br/>`[#%pr_number% - %pr_title%](%pr_url%)`|The reminder message to send, takes 4 parameters for string interpolation: `%reviewer%`, `%pr_number%`, `%pr_title%` and `%pr_url%`|
|twist_url|yes|`https://twist.com/api/v3/integration_incoming/`<br/>`post_data?`<br/>`install_id=[install id]`<br/>`&install_token=[install token]`|The installed integration url for posting a message to a Twist thread|
|token|yes|`adbc12431414`|The token for accessing the GitHub API to query the state of the PRs in a repo|
|ignore_authors|no|`tom, renovate`|Usernames of PR creators who's PRs will be ignored|
|exclude_draft_prs|no|`false`|Whether we should exclude draft PRs when checking reviews, defaults to false|

## Development

Uses Node v20.x

Switch into this folder after checking out the repository, run `npm install` to install all dependencies.

After applying your changes, run `npm run all`. It will check your code and compile a new version into the `dist` 
folder.
