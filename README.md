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
      - uses: doist/send-review-reminder-action
        with:
          message: '%reviewer%, please review [#%pr_number% - %pr_title%](%pr_url%)'
          review_time_ms: 86400000 # 1 day in milliseconds
          twist_url: 'https://twist.com/api/v3/integration_incoming/post_data?install_id=[install id]&install_token=[install token]'
          token: ${{ secrets.DOIST_BOT_TOKEN }}

```

## Development

Switch into this folder after checking out the repository, run `npm install` to install all dependencies.

After applying your changes, run `npm run all`. It will check your code and compile a new version into the `dist` 
folder.
