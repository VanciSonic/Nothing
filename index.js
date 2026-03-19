const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');

const fs = require('fs');

const TOKEN = process.env.DISCORD_TOKEN;

const CLIENT_ID = "1483759539533775009";
const GUILD_ID = "1067074769855451216";

const CLAIM_ROLE = "1180539917521145867";
const ADMIN_ROLE = "1074007333845340180";

// 🔥 FIREBASE URL
const BASE = "https://rchub-2d652-default-rtdb.firebaseio.com";

// 🚀 Client
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// 📂 Load DB
function loadDB() {
    return JSON.parse(fs.readFileSync('./db.json'));
}

// 💾 Save DB
function saveDB(data) {
    fs.writeFileSync('./db.json', JSON.stringify(data, null, 2));
}

// 🔥 SAVE KE FIREBASE
async function saveClaimToFirebase(userId, key) {
    try {
        await fetch(`${BASE}/claimed_keys/${userId}.json`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(key)
        });
        console.log("✅ Saved to Firebase:", userId);
    } catch (err) {
        console.error("❌ Firebase Error:", err);
    }
}

// 🚀 READY
client.once('ready', async () => {
    console.log(`🔥 Bot nyala: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('panel')
            .setDescription('Open key panel')
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

    console.log("✅ Command /panel ready");
});

// 🎛️ INTERACTION
client.on(Events.InteractionCreate, async (interaction) => {

    // SLASH COMMAND
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === "panel") {

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('claim')
                    .setLabel('Claim Key')
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId('add')
                    .setLabel('Add Key')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({
                content: "**GET KEY PANEL**",
                components: [row]
            });
        }
    }

    // BUTTON
    if (interaction.isButton()) {

        const userId = interaction.user.id;

        // 🎁 CLAIM
        if (interaction.customId === "claim") {
            try {
                await interaction.deferReply({ ephemeral: true });

                const db = loadDB();

                const member = await interaction.guild.members.fetch(userId);

                if (!member.roles.cache.has(CLAIM_ROLE)) {
                    return await interaction.editReply("❌ No Access");
                }

                if (db.claimed_keys[userId]) {
                    return await interaction.editReply("❌ Already claimed!");
                }

                if (!db.available_keys || db.available_keys.length === 0) {
                    return await interaction.editReply("❌ Stock empty!");
                }

                const key = db.available_keys.shift();
                db.claimed_keys[userId] = key;

                saveDB(db);

                // 🔥 SIMPAN KE FIREBASE
                await saveClaimToFirebase(userId, key);

                await interaction.user.send(`DONT SHARE YOUR KEY !! :\n${key}`);

                return await interaction.editReply("✅ Check DM!");

            } catch (err) {
                console.error(err);
                return interaction.editReply("❌ Error terjadi");
            }
        }

        // ➕ ADD KEY
        if (interaction.customId === "add") {

            if (!interaction.member.roles.cache.has(ADMIN_ROLE)) {
                return interaction.reply({ content: "❌ Admin only!", ephemeral: true });
            }

            await interaction.reply({
                content: "✏️ Kirim key (15 detik)",
                ephemeral: true
            });

            const filter = m => m.author.id === interaction.user.id;

            const collector = interaction.channel.createMessageCollector({
                filter,
                time: 15000,
                max: 1
            });

            collector.on('collect', msg => {
                try {
                    const db = loadDB();

                    db.available_keys.push(msg.content.trim());

                    saveDB(db);

                    msg.reply("✅ Key berhasil ditambahkan!");
                } catch (err) {
                    console.error(err);
                    msg.reply("❌ Error tambah key");
                }
            });
        }
    }
});

// 🚀 LOGIN
client.login(TOKEN);
