const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const emoji = require('emoji-dictionary');

const SLACK_BOT_TOKEN = '';
const SLACK_APP_TOKEN = '';
const SLACK_SIGNING_SECRET = '';
const SLACK_USER_TOKEN = '';

const app = new App({
    token: SLACK_BOT_TOKEN,
    signingSecret: SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: SLACK_APP_TOKEN,
});
const userClient = new WebClient(SLACK_USER_TOKEN);

const channelInProgress = new Set();
let EMOJI_JSON = {};

(async () => {
    EMOJI_JSON = await loadEmojis('https://badger.hackclub.dev/api/emoji'); // Hack Club custom emojis
})();

async function loadEmojis(url) {
    const res = await fetch(url);
    return await res.json();
}

function getTwemojiURL(emojiChar) { // Twemoji for Unicode emojis that the other API misses
    const codepoints = Array.from(emojiChar)
      .map(c => c.codePointAt(0).toString(16))
      .join('-');
    return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codepoints}.png`;
  }
  
function getEmojiURL(name) {
    const unicode = emoji.getUnicode(name);
  
    if (unicode) {
      return getTwemojiURL(unicode);
    } else if (EMOJI_JSON[name]) {
      return EMOJI_JSON[name];
    } else {
      return name;
    }
  }
  
async function getMessageStats(channelName, userId, startDate, endDate) {
    console.log(`let's do this!!`)
    let totalMessages = 0;     
    let yourMessages = 0;
    let page = 1;
    const count = 100;
    const messagesByUser = {};

    while (true) {
        const theSearch = await userClient.search.messages({ // searches
            query: `in:#${channelName} after:${startDate} before:${endDate}`, // queries the channel for messages from 01-01 to 01-01 (next year, 01-01 is not included, at least I don't think)
            page,
            count
        });
        console.log(theSearch.query);
        if (!theSearch.messages || !theSearch.messages.matches.length) break; // if there are no messages, stop

        for (const msg of theSearch.messages.matches) { // every message adds to the total messages
            console.log('and another!!')
            totalMessages ++
            console.log(`${totalMessages}`)
            if (msg.user === userId) yourMessages++;
            if (msg.user) {
                messagesByUser[msg.user] = (messagesByUser[msg.user] || 0) + 1;
            }            

        }
        
        if (page >= theSearch.messages.paging.pages) break; // if it gets to the last page, stop

        page++ // next page
        
        await new Promise(resolve => setTimeout(resolve,1234)) // be kind to the api
    }
    return { totalMessages, yourMessages, messagesByUser };
}

async function getReactions(channelId, client, startDate, endDate) {
    const oldest = Math.floor(new Date(startDate).getTime() / 1000);
    const latest = Math.floor(new Date(endDate).getTime() / 1000);
    const totalReactions = {};
    let cursor;

    do {
        const history = await client.conversations.history({
            channel: channelId,
            oldest,
            latest,
            limit: 200,
            cursor
        });

        if (!history?.messages?.length) break;

        for (const msg of history.messages) {
            const reactions = msg.reactions ?? [];
            for (const r of reactions) {
                totalReactions[r.name] = (totalReactions[r.name] || 0) + r.count;
            }
        }

        cursor = history.response_metadata?.next_cursor;
        await new Promise(r => setTimeout(r, 300));
    } while (cursor);

    return totalReactions;
}

app.event('app_mention', async ({ event, client }) => { // checks for mention
    const userId = event.user;
    const channelId = event.channel;

    if (channelInProgress.has(channelId)) { // checks if another wrap is in progress in the channel
        await client.chat.postMessage({
            channel: event.channel,
            thread_ts: event.ts,
            text: `i'm already wrapping here!`
        });
        return;
    }

    channelInProgress.add(channelId);
    try {
    const channelInfo = await client.conversations.info({ channel: channelId });
    const channelName = channelInfo.channel.name;
    const text = event.text.toLowerCase();
    if (!/\bwrap\b|\bwrapped\b/i.test(text)) return; // ignore anything other than 'wrap' and 'wrapped'
    const firstRespExpr = ["ooo", "wow!", "ok!", "heyo!", "got it!", "alright!"];
    const firstRespMsg = ["wrapping!", "one moment please!", "generating!", "let's see what happened!", "starting your wrapped!", "getting your stats!", "let's wrap this!"];
    const loadingMsg = ["almost there...", "doing some quick math...", "wow this channel talks a lot...", "still crunching...", "thinking...", "wrapping it up...", "dolphins can hold their breath underwater for eight to ten minutes...", "the sky is blue...", "stealing your messages...", "are you ready..."];
    const finishedMsg = ["i'm done!", "here's what I found!", "it's time!", "those are some big numbers...", "finally!", "finished!", "all wrapped for you!", "thank you for using channelwrapped", "it's wrapped time!", "it's rewind time!", "thank you for your patience"]
    const expr = firstRespExpr[Math.floor(Math.random() * firstRespExpr.length)];
    const resp = firstRespMsg[Math.floor(Math.random() * firstRespMsg.length)];
    const load = loadingMsg[Math.floor(Math.random() * loadingMsg.length)];
    const fini = finishedMsg[Math.floor(Math.random() * finishedMsg.length)];
    const userMessage = event.text;
    const yearMatch = (userMessage || '').match(/\b(20\d{2})\b/);
    const year = yearMatch ? yearMatch[1] : '2025';
    const yearNum = Number(year);
    const startDate = `${yearNum}-01-01`;
    const endDate = `${yearNum + 1}-01-01`;

    const reply = await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts, // so it replies in the thread (spam is bad)
        text: `${expr} ${resp}` // expression (wow!) and response (let's see what happened!)
    })
    
    const messageTime = reply.ts;
    await new Promise(resolve => setTimeout(resolve, 2345));
    
    let interval = setInterval(async () => {
        const i = Math.floor(Math.random() * loadingMsg.length); // pick a random silly message
        await client.chat.update({
            channel: event.channel,
            ts: messageTime,
            text: loadingMsg[i]
        });
    }, 5000);
    
    const { totalMessages, yourMessages, messagesByUser } = await getMessageStats(channelName, userId, startDate, endDate);

    const totalReactions = await getReactions(channelId, userClient, startDate, endDate);
    clearInterval(interval);
    const top3Reactions = Object.entries(totalReactions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    const top3Urls = top3Reactions.map(([name, count]) => getEmojiURL(name)); // the top 3 emojis URLs
    const top1Url = top3Urls[0] ?? null;
    const top2Url = top3Urls[1] ?? null;
    const top3Url = top3Urls[2] ?? null;
    console.log(top1Url, top2Url, top3Url);
    
    const yourPercent = totalMessages === 0 ? 0 : (yourMessages / totalMessages) * 100;
    const ypR = Math.round(yourPercent)

    const top3 = Object.entries(messagesByUser) // top 3 most active users
    .sort((a,b) => b[1] - a[1])
    .slice(0, 3);

    const mostActiveUser = top3[0];
    const mauUser = mostActiveUser ? mostActiveUser[0] : 'no one';
    const mauCount = mostActiveUser ? mostActiveUser[1] : 0;
    console.log(mauUser, mauCount)
    const secondMAU = top3[1];
    const smauUser = secondMAU ? secondMAU[0] : 'no one';
    const smauCount = secondMAU ? secondMAU[1] : 0;
    console.log(smauUser, smauCount)
    const thirdMAU = top3[2];
    const tmauUser = thirdMAU ? thirdMAU[0] : 'no one';
    const tmauCount = thirdMAU ? thirdMAU[1] : 0;
    console.log(tmauUser, tmauCount)

    await client.chat.update({ // the final one
        channel: event.channel,
        ts: messageTime,
        text: `${fini} ${totalMessages} in ${channelName} (and ${ypR}% or ${yourMessages} were yours! top three were ${mauUser} with ${mauCount}, ${smauUser} with ${smauCount} and ${tmauUser} with ${tmauCount})\n ${top1Url}, ${top2Url}, ${top3Url}`
    });
    
} finally {
    channelInProgress.delete(channelId); // unlocks
}
});

(async () => { // this executes when it starts
    await app.start();
    console.log('hello world');
})();
