import {
    Client,
    GatewayIntentBits,
    ReactionUserManager,
    ButtonStyle,
    ButtonBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    AttachmentBuilder,
} from "discord.js"

import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { isValidURL } from "niconico-dl.js";
const { default: NiconicoDL } = require("niconico-dl.js")
import ytdl from "ytdl-core"
import ytpl from "ytpl"
import {
    entersState,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    StreamType,
    generateDependencyReport,
} from "@discordjs/voice"

process.on("uncaughtException", function (err) {
    console.log(err);
});

console.log(generateDependencyReport());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

client.token = process.env.token;

var voption = {};

function shuffle(array) {
    for (let i = array.length - 1; 0 < i; i--) {
        let r = Math.floor(Math.random() * (i + 1));
        let tmp = array[i];
        array[i] = array[r];
        array[r] = tmp;
    }
    return array;
}

client.login();

function next(gid) {
    voption[gid].p = createAudioPlayer();
    voption[gid].c.subscribe(voption[gid].p);
    voption[gid].s = ytdl(ytdl.getURLVideoID(voption[gid].q[0]), {
        filter: (format) =>
            format.audioCodec === "opus" && format.container === "webm",
        quality: "highest",
        highWaterMark: 32 * 1024 * 1024,
    });
    voption[gid].r = createAudioResource(voption[gid].s, {
        inputType: StreamType.WebmOpus,
    });
    voption[gid].p.play(voption[gid].r);
    entersState(voption[gid].p, AudioPlayerStatus.Playing, 10 * 1000).then(
        function () {
            entersState(
                voption[gid].p,
                AudioPlayerStatus.Idle,
                24 * 60 * 60 * 1000
            ).then(function () {
                if (!(voption[gid].m == 1 || voption[gid].m == 4)) {
                    if (voption[gid].m == 2) {
                        voption[gid].q.push(voption[gid].q[0]);
                    }
                    voption[gid].q.shift();
                    if (voption[gid].m == 3) {
                        voption[gid].q = shuffle(voption[gid].q);
                    }
                }
                if (voption[gid].m == 4) {
                    voption[gid].q = shuffle(voption[gid].q);
                }
                if (!voption[gid].q) {
                    voption[gid].c.destroy();
                    voption[gid] = {};
                } else {
                    next(gid);
                }
            });
        }
    );
}

//commands
client.on("messageCreate", async (msg) => {
    if (msg.author.bot) {
        return;
    }
    if (msg.content == "am2!ping") {
        msg.reply(
            `ws:${client.ws.ping}ms\nAPI:${Date.now() - msg.createdTimestamp}ms`
        );
    } else if (msg.content == "am2!help") {
        msg.reply({
            embeds: [
                {
                    title: "コマンド一覧",
                    color: 3998965,
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: "created by arch_herobrine",
                    },
                    fields: [
                        {
                            name: "am2!help",
                            value: "これ",
                        },
                        {
                            name: "am2!ping",
                            value: "ping",
                        },
                        {
                            name: "am2!play <youtubeの動画のURL | youtubeのplaylistのURL | ニコ動の動画URL>",
                            value:
                                "音楽再生。当然だが非公開のリストは再生できない。ニコ動のリストは非対応。",
                        },
                        {
                            name: "am2!stop",
                            value: "音楽止める。ループ設定も破棄される",
                        },
                        {
                            name: "am2!next",
                            value: "再生中の止めてキューの中の次の音楽を再生",
                        },
                        {
                            name: "am2!loop <one|queue|shuffle|queueshuffle>",
                            value:
                                "ループモードの設定。oneは一曲ループ。queueでキュー内の曲を全てループ。shuffleでキュー内からランダムに選出(ループなし)。queueshuffleでキュー内からランダムに選出(キュー内ループ)。",
                        },
                    ],
                },
            ],
        });
    } else if (msg.content.replace(/ +/g, " ").split(" ")[0] == "am2!play") {
        if (!voption[msg.guild.id]) {
            voption[msg.guild.id] = {};
        }
        var url = msg.content.replace(/ +/g, " ").split(" ")[1];
        const queue = voption[msg.guild.id].q;

        if (!ytdl.validateURL(url)) {
            if (ytpl.validateID(url)) {
                let playlist = await ytpl(url, { limit: Infinity });
                if (!voption[msg.guild.id].q) {
                    voption[msg.guild.id].q = [];
                }
                playlist.items.forEach((v) => {
                    voption[msg.guild.id].q.push(v.shortUrl);
                });
            } else {
                if (isValidURL(url)) {
                    if (!voption[msg.guild.id].q) {
                        voption[msg.guild.id].q = [];
                    }
                    voption[msg.guild.id].q.push(url);
                } else {
                    msg.reply("Falal Error()");
                    return;
                }
            }
        } else {
            if (voption[msg.guild.id].q) {
                voption[msg.guild.id].q.push(url);
            } else {
                voption[msg.guild.id].q = [url];
            }
        }
        const channel = msg.member.voice.channel;
        if (!channel) {
            msg.reply("先にボイチャに接続してクレメンス()");
            return;
        }
        if (
            !msg.guild.members.me.voice.channel ||
            (msg.guild.members.me.voice.channel && !queue)
        ) {
            voption[msg.guild.id].c = joinVoiceChannel({
                adapterCreator: channel.guild.voiceAdapterCreator,
                channelId: channel.id,
                guildId: channel.guild.id,
                selfDeaf: true,
                selfMute: false,
            });
            if (ytpl.validateID(url)) {
                msg.reply(`${url} の中身全部キューにぶち込んで再生したよたぶん()`);
            } else {
                msg.reply(`${url} を再生したよたぶん()`);
            }
            console.log(voption[msg.guild.id].q);
            next(msg.guild.id);
        } else {
            if (ytpl.validateID(url)) {
                msg.reply(`${url} の中身全部キューにぶち込んだよたぶん()`);
            } else {
                msg.reply(`${url} をキューにぶち込んだよたぶん()`);
            }
        }
        async function next(gid) {
            voption[gid].p = createAudioPlayer();
            voption[gid].c.subscribe(voption[gid].p);
            if (ytdl.validateURL(voption[gid].q[0])) {
                voption[gid].s = ytdl(ytdl.getURLVideoID(voption[gid].q[0]), {
                    filter: (format) =>
                        format.audioCodec === "opus" && format.container === "webm",
                    quality: "highest",
                    highWaterMark: 32 * 1024 * 1024,
                });
                voption[gid].r = createAudioResource(voption[gid].s, {
                    inputType: StreamType.WebmOpus,
                });
            } else if (isValidURL(voption[gid].q[0])) {
                voption[gid].s = await new NiconicoDL(
                    voption[gid].q[0],
                    "low"
                ).download();

                voption[gid].r = createAudioResource(voption[gid].s);
            } else {
                if (!(voption[gid].m == 1 || voption[gid].m == 4)) {
                    if (voption[gid].m == 2) {
                        voption[gid].q.push(voption[gid].q[0]);
                    }
                    voption[gid].q.shift();
                    if (voption[gid].m == 3) {
                        voption[gid].q = shuffle(voption[gid].q);
                    }
                }
                if (voption[gid].m == 4) {
                    voption[gid].q = shuffle(voption[gid].q);
                }
                if (!voption[gid].q) {
                    voption[gid].c.destroy();
                    voption[gid] = {};
                } else {
                    await next(gid);
                }
            }
            voption[gid].p.play(voption[gid].r);
            entersState(voption[gid].p, AudioPlayerStatus.Playing, 10 * 1000).then(
                async function () {
                    entersState(
                        voption[gid].p,
                        AudioPlayerStatus.Idle,
                        24 * 60 * 60 * 1000
                    ).then(async function () {
                        if (!(voption[gid].m == 1 || voption[gid].m == 4)) {
                            if (voption[gid].m == 2) {
                                voption[gid].q.push(voption[gid].q[0]);
                            }
                            voption[gid].q.shift();
                            if (voption[gid].m == 3) {
                                voption[gid].q = shuffle(voption[gid].q);
                            }
                        }
                        if (voption[gid].m == 4) {
                            voption[gid].q = shuffle(voption[gid].q);
                        }
                        if (!voption[gid].q) {
                            voption[gid].c.destroy();
                            voption[gid] = {};
                        } else {
                            await next(gid);
                        }
                    });
                }
            );
        }
    } else if (msg.content == "am2!stop") {
        if (!(msg.member.voice.channel == msg.guild.members.me.voice.channel)) {
            msg.reply("ボイチャに接続してクレメンス()");
            return;
        }
        msg.reply("たぶん流してた音楽止めたよ()");
        voption[msg.guild.id].c.destroy();
        voption[msg.guild.id] = {};
    } else if (msg.content == "am2!next") {
        console.log(msg.member.voice.channel);
        console.log(msg.guild.members.me.voice.channel);
        if (!(msg.member.voice.channel == msg.guild.members.me.voice.channel)) {
            msg.reply("ボイチャに接続してクレメンス()");
            return;
        }
        voption[msg.guild.id].p.stop();
        if (voption[msg.guild.id].m == 1) {
            voption[msg.guild.id].q.shift();
        }
        msg.reply("たぶん次の音楽流し始めたよ()");
    } else if (msg.content.replace(/ +/g, " ").split(" ")[0] == "am2!loop") {
        if (!(msg.member.voice.channel == msg.guild.members.me.voice.channel)) {
            msg.reply("ボイチャに接続してクレメンス()");
            return;
        }
        if (msg.content.replace(/ +/g, " ").split(" ")[1] == "one") {
            voption[msg.guild.id].m = 1;
            msg.reply("単体でループするよう設定したよ()");
        } else if (msg.content.replace(/ +/g, " ").split(" ")[1] == "queue") {
            voption[msg.guild.id].m = 2;
            msg.reply("キュー内でループするよう設定したよ()");
        } else if (msg.content.replace(/ +/g, " ").split(" ")[1] == "shuffle") {
            voption[msg.guild.id].m = 3;
            msg.reply("キュー内からランダムに選出(ループなし)に設定したよ()");
        } else if (
            msg.content.replace(/ +/g, " ").split(" ")[1] == "queueshuffle"
        ) {
            voption[msg.guild.id].m = 4;
            msg.reply("キュー内からランダムに選出(キュー内でループ)に設定したよ()");
        } else {
            voption[msg.guild.id].m = undefined;
            msg.reply("ノーマルに設定したよ()");
        }
    }
});

/*
 空
  白
   錬
    成
     用
      ダ
       ミ
        ー
         コ
          メ
           ン
            ト
*/

client.on("ready", async () => {
    const data = [];
    await client.application.commands.set(data);

    console.log(`${client.user.tag}でログインしたンゴ`);
});