require("dotenv").config();
const fs = require("fs");
const express = require("express");

const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(express.json());

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Load / buat config kalau belum ada
if (!fs.existsSync("./config.json")) {
    fs.writeFileSync("./config.json", JSON.stringify({ donationChannel: null }, null, 2));
}

let config = require("./config.json");

// BOT READY
client.once("ready", () => {
    console.log(`Bot login sebagai ${client.user.tag}`);
});

// SLASH COMMAND HANDLER
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "setdonation") {
        const channel = interaction.options.getChannel("channel");

        config.donationChannel = channel.id;

        fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));

        await interaction.reply(`✅ Channel donasi diset ke ${channel}`);
    }
});

// WEBHOOK TRAKTEER
app.post("/webhook", async (req, res) => {
    try {
        if (req.headers["authorization"] !== process.env.TRAKTEER_API_KEY) {
            return res.sendStatus(403);
        }

        const data = req.body;

        // reload config biar update
        config = JSON.parse(fs.readFileSync("./config.json"));

        if (!config.donationChannel) {
            return res.sendStatus(200);
        }

        const channel = await client.channels.fetch(config.donationChannel);

        if (!channel) return res.sendStatus(200);

        await channel.send({
            embeds: [{
                title: "💰 Donasi Masuk!",
                fields: [
                    { name: "Nama", value: data.supporter_name, inline: true },
                    { name: "Jumlah", value: `Rp${data.amount}`, inline: true },
                    { name: "Pesan", value: data.message || "-", inline: false }
                ],
                timestamp: new Date()
            }]
        });

        res.sendStatus(200);

    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

// START
client.login(process.env.BOT_TOKEN);

app.listen(3000, () => {
    console.log("Server webhook jalan");
});
