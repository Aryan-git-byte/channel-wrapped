const { App } = require('@slack/bolt');

const SLACK_BOT_TOKEN = '';
const SLACK_APP_TOKEN = '';
const SLACK_SIGNING_SECRET = '';

const app = new App({
    token: SLACK_BOT_TOKEN,
    signingSecret: SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: SLACK_APP_TOKEN,
});

app.event('app_mention', async ({ event, client }) => { // checks for mention
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
    let done = false;


    const reply = await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts, // so it replies in the thread (spam is bad)
        text: `${expr} ${resp}` // expression (wow!) and response (let's see what happened!)
    })

    const messageTime = reply.ts;
    await new Promise(resolve => setTimeout(resolve, 5000));

    // here's where I add the actual logic
    
    



    while (!done) { // while you wait
        const load = loadingMsg[Math.floor(Math.random() * loadingMsg.length)]; // pick random loading message
        await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5 seconds
    
        await client.chat.update({
            channel: event.channel,
            ts: messageTime,
            text: load
        });
    }

    
    await client.chat.update({ // the final one
        channel: event.channel,
        ts: messageTime,
        text: fini
    });
}),

(async () => { // this executes when it starts
    await app.start();
    console.log('hello world');
})();
