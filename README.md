# ChannelWrapped
## Interesting statistics of your Slack channel in a graphic like Spotify Wrapped (less cool though)
<img width="400" height="450" alt="result" src="https://github.com/user-attachments/assets/7cc146d2-90fa-4bd4-b57b-ee03629c786d" />

## Features
- Total messages sent in the year
- Number of messages the user sent (with percentage)
- Most active month
- Top 3 most active users and their message counts
- Top 3 most used reactions

## Requirements
- Node.js 18+
- Slack Bot Token
- Slack User Token (for search)
- Slack App Token (Socket Mode enabled)

## To install
- Install the Node.js dependencies (npm install @slack/bolt emoji-dictionary @slack/socket-mode@latest @slack/web-api @napi-rs/canvas)
- Download the bot.js file
- Add your tokens to the file
- Run the bot (node bot.js)

## Slack token scopes
### Bot
- app_mentions:read
- chat:write
- channels:read
- groups:read
- files:write
- emoji:read
### User
- search:read
- channels:history
- groups:history
- users:read
### App
- connections:write

## Using the bot
- Add @ChannelWrapped to your Slack channel
- Send "@ChannelWrapped wrap" or "@ChannelWrapped wrapped" in your channel
- It defaults to messages from 2025, but you can choose the year by adding a year after the command

## Limitations
- If your channel is private, add the user associated with the user token to the channel
- Large channels may take longer to process due to rate limits
