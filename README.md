# Send Review Reminder Action

This action checks all opened pull requests review request.

If a pull request has a pending review request and the specified review time 
has passed, the action sends a reminder message on twist.com.

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
          review_time_ms: 86400000 # 1 day in milliseconds
          twist_url: 'https://twist.com/api/v3/integration_incoming/post_data?install_id=[install id]&install_token=[install token]'
          token: ${{ secrets.DOIST_BOT_TOKEN }}

```

### Parameters

|name|required?|example|description|
|----|---------|-------|-----------|
|review_time_ms|yes|`86400000`|The time in milliseconds a PR has to wait before a reminder will be sen, example is 24 hours|
|message|yes|`%reviewer%, please review [#%pr_number% - %pr_title%](%pr_url%)`|The reminder message to send, takes 4 parameters for string interpolation: `%reviewer%`, `%pr_number%`, `%pr_title%` and `%pr_url%`|
|twist_url|yes|`https://twist.com/api/v3/integration_incoming/post_data?install_id=[install id]&install_token=[install token]`|The installed integration url for posting a message to a Twist thread|
|token|yes|adbc12431414|The token for accessing the GitHub API to query the state of the PRs in a repo|
|ignore_authors|no|`tom, renovate`|Usernames of PR creators who's PRs will be ignored|

## Development

Uses Node v20.x

Switch into this folder after checking out the repository, run `npm install` to install all dependencies.

After applying your changes, run `npm run all`. It will check your code and compile a new version into the `dist` 
folder.
