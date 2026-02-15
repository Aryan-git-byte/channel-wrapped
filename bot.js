const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const emoji = require('emoji-dictionary');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

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

const finishedMsg = ["i'm done!", "here's what I found!", "it's time!", "those are some big numbers...", "finally!", "finished!", "all wrapped for you!", "thank you for using channelwrapped", "it's wrapped time!", "it's rewind time!", "thank you for your patience"];
const fini = finishedMsg[Math.floor(Math.random() * finishedMsg.length)];

async function getMessageStats(channelName, userId, startDate, endDate) {
    console.log(`let's do this!!`)
    let totalMessages = 0;     
    let yourMessages = 0;
    let page = 1;
    const count = 100;
    const messagesByUser = {};
    const messagesByMonth = {};

    while (true) {
        const theSearch = await userClient.search.messages({ // searches
            query: `in:#${channelName} after:${startDate} before:${endDate}`, // queries the channel for messages from 01-01 to 01-01 (next year, 01-01 is not included, at least I don't think)
            page,
            count
        });
      //  console.log(theSearch.query);
        if (!theSearch.messages || !theSearch.messages.matches.length) break; // if there are no messages, stop

        for (const msg of theSearch.messages.matches) { // every message adds to the total messages
            totalMessages ++
            console.log(`${totalMessages}`)
            if (msg.user === userId) yourMessages++;
            if (msg.user) {
                messagesByUser[msg.user] = (messagesByUser[msg.user] || 0) + 1;
            }
            const month = new Date(Number(msg.ts) * 1000).getMonth();
            messagesByMonth[month] = (messagesByMonth[month] || 0) + 1;
        }
        
        if (page >= theSearch.messages.paging.pages) break; // if it gets to the last page, stop

        page++ // next page
        
        await new Promise(resolve => setTimeout(resolve,1234)) // be kind to the api
    }
    return { totalMessages, yourMessages, messagesByUser, messagesByMonth };
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
    const text = (event.text || "").toLowerCase();

    // ignore anything without wrap / wrapped
    if (!/\bwrap\b|\bwrapped\b/i.test(text)) {
        return;
    }

    if (channelInProgress.has(channelId)) { // checks if another wrap is in progress in the channel
        await client.chat.postMessage({
            channel: channelId,
            thread_ts: event.ts,
            text: `i'm already wrapping here!`
        });
        return;
    }

    channelInProgress.add(channelId);

    let channelInfo;
    let messageTime;

    try {
        channelInfo = await client.conversations.info({ channel: channelId });
        const channelName = channelInfo.channel.name;

        if (!/\bwrap\b|\bwrapped\b/i.test(text)) {
            channelInProgress.delete(channelId);
            return;    
        }; // ignore anything other than 'wrap' and 'wrapped'
        const firstRespExpr = ["ooo", "wow!", "ok!", "heyo!", "got it!", "alright!"];
        const firstRespMsg = ["wrapping!", "one moment please!", "generating!", "let's see what happened!", "starting your wrapped!", "getting your stats!", "let's wrap this!"];
        const loadingMsg = ["almost there...", "doing some quick math...", "wow this channel talks a lot...", "still crunching...", "thinking...", "wrapping it up...", "dolphins can hold their breath underwater for eight to ten minutes...", "the sky is blue...", "stealing your messages...", "are you ready..."];
        const expr = firstRespExpr[Math.floor(Math.random() * firstRespExpr.length)];
        const resp = firstRespMsg[Math.floor(Math.random() * firstRespMsg.length)];
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
    
        messageTime = reply.ts;
        await new Promise(resolve => setTimeout(resolve, 2345));
    
        let interval = setInterval(async () => {
            const i = Math.floor(Math.random() * loadingMsg.length); // pick a random silly message
            await client.chat.update({
                channel: event.channel,
                ts: messageTime,
                text: loadingMsg[i]
            });
        }, 5000);
    
        const { totalMessages, yourMessages, messagesByUser, messagesByMonth } = await getMessageStats(channelName, userId, startDate, endDate);
        const totalReactions = await getReactions(channelId, userClient, startDate, endDate);

        async function generateCW(data) {
        const canvas = createCanvas(800, 900);
        const ctx = canvas.getContext('2d');
      
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
      
        ctx.font = 'bold 48px sans-serif';
        ctx.fillText('Channel Wrapped', 400, 80);
        ctx.font = '32px sans-serif';
        ctx.fillText(`#${data.channelName}`, 400, 125);
      
        ctx.font = 'bold 56px sans-serif';
        ctx.fillText(`${data.totalMessages}`, 150, 225);
        ctx.font = '22px sans-serif';
        ctx.fillText('TOTAL MESSAGES', 150, 270);
        
        ctx.font = 'bold 56px sans-serif';
        ctx.fillText(`${data.yourPercent}%`, 400, 225);
        ctx.font = '22px sans-serif';
        ctx.fillText(`WERE YOURS (${data.yourMessages})`, 400, 270);

        ctx.font = 'bold 56px sans-serif';
        ctx.fillText(data.month ?? '—', 650, 225);
        ctx.font = '22px sans-serif';
        ctx.fillText('MOST ACTIVE MONTH', 650, 270);
        
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText('TOP TALKERS', 400, 370);

        const avatarSize = 110;
        const y = 380;
        const count = data.topUsers.length;
        const sectionWidth = canvas.width / count;

        for (let i = 0; i < count; i++) {
            const user = data.topUsers[i];
            const x = sectionWidth * i + sectionWidth / 2;
            if (user.photo) {
                try {
                    const img = await loadImage(user.photo);
                    ctx.save();
                    ctx.beginPath();
                    ctx.roundRect(x - avatarSize / 2, y, avatarSize, avatarSize, 20);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(img, x - avatarSize / 2, y, avatarSize, avatarSize);
                    ctx.restore();
                } catch {}
            }

            ctx.font = 'bold 24px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(user.name, x, y + avatarSize + 30);

            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#d9d9d9';
            ctx.fillText(`${user.count} messages`, x, y + avatarSize + 55);
        }

        if (data.topEmojiUrls.length) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px sans-serif';
            ctx.fillText('TOP REACTIONS', 400, 625);
            const images = await Promise.all(
                data.topEmojiUrls.map(url =>
                loadImage(url).catch(() => null)
                )
            );
            
            images.forEach((img, i) => {
                if (!img) return;
            
                const x = sectionWidth * i + sectionWidth / 2;
            
                ctx.drawImage(img, x - 40, 665, 80, 80);
            });
            
        }
      
        const buffer = canvas.toBuffer('image/png');
        const path = `/tmp/wrapped-${Date.now()}.png`;
        fs.writeFileSync(path, buffer);
      
        return path;
    }

    clearInterval(interval);
    const top3Reactions = Object.entries(totalReactions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    const top3Urls = top3Reactions.map(([name]) => getEmojiURL(name)); // the top 3 emojis URLs
    const top1Url = top3Urls[0] ?? null;
    const top2Url = top3Urls[1] ?? null;
    const top3Url = top3Urls[2] ?? null;
    console.log(top1Url, top2Url, top3Url);
    
    const yourPercent = totalMessages === 0 ? 0 : (yourMessages / totalMessages) * 100;
    const ypR = Math.round(yourPercent)

    const top3 = Object.entries(messagesByUser) // top 3 most active users
    .sort((a,b) => b[1] - a[1])
    .slice(0, 3);
    
    async function getDisplayName(userId) {
        try {
            const res = await userClient.users.info({ user: userId });
            return {
                name:
                    res.user.profile.display_name ||
                    res.user.real_name ||
                    res.user.name ||
                    userId,
                photo: res.user.profile.image_192
            };
        } catch (err) {
            console.warn('Failed to get user info for', userId);
            return userId; // uses id if error
        }
    }
    const topUsers = [];
    for (const [id, count] of top3) {
      const info = await getDisplayName(id);
      topUsers.push({
        id,
        name: info.name,
        photo: info.photo,
        count
      });
    }

    let topMonth = null;
    let topMonthCount = 0;

    for (const month in messagesByMonth) {
        if (messagesByMonth[month] > topMonthCount) {
            topMonth = month;
            topMonthCount = messagesByMonth[month];
        }
    }

    let montht;
    if (topMonth === "0") {
        montht = "January";
    } else if (topMonth === "1") {
        montht = "February";
    } else if (topMonth === "2") {
        montht = "March";
    } else if (topMonth === "3") {
        montht = "April";
    } else if (topMonth === "4") {
        montht = "May";
    } else if (topMonth === "5") {
        montht = "June";
    } else if (topMonth === "6") {
        montht = "July";
    } else if (topMonth === "7") {
        montht = "August";
    } else if (topMonth === "8") {
        montht = "September";
    } else if (topMonth === "9") {
        montht = "October";
    } else if (topMonth === "10") {
        montht = "November";
    } else if (topMonth === "11") {
        montht = "December";
    }
    
    const imagePath = await generateCW({
        channelName,
        totalMessages,
        yourMessages,
        yourPercent: ypR,
        month: montht,
        topUsers,
        topEmojiUrls: [top1Url, top2Url, top3Url].filter(Boolean),
    });

    await client.files.uploadV2({
        channel_id: channelId,
        thread_ts: messageTime,
        file: imagePath,
        filename: 'channel-wrapped.png',
        title: 'Channel Wrapped',
        initial_comment: `${fini}`,
    });
  
    } catch (err) {
      console.error("Wrap failed:", err);
   
      if (err?.data?.error === "channel_not_found") {
        await client.chat.update({
            channel: channelId,
            ts: messageTime,
            text: `fsh needs to be in the channel for this to work!`,
        });
        
      } else {
         await client.chat.postMessage({
            channel: event.channel,
            thread_ts: event.ts,
            text: `something went wrong 😭 please dm fsh`,
         });
      }
   }
   finally {
    channelInProgress.delete(channelId);

    await client.chat.update({
        channel: event.channel,
        ts: messageTime,
        text: fini
    });
   }
});

(async () => { // this executes when it starts
    await app.start();
    console.log('hello world');
})();
