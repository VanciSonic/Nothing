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

// 🔐 GANTI TOKEN SETELAH RESET!
const TOKEN = process.env.DISCORD_TOKEN;

// 🔧 GANTI INI
const CLIENT_ID = "1483759539533775009";
const GUILD_ID = "1067074769855451216";

const CLAIM_ROLE = "1180539917521145867";
const ADMIN_ROLE = "1074007333845340180";

// 🚀 Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 📂 Load DB
function loadDB() {
    return JSON.parse(fs.readFileSync('./db.json'));
}

// 💾 Save DB
function saveDB(data) {
    fs.writeFileSync('./db.json', JSON.stringify(data, null, 2));
}

// 🚀 READY + REGISTER COMMAND
client.once('ready', async () => {
    console.log(`🔥 Bot nyala: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('panel')
            .setDescription('Open HWID panel')
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

    // 🟢 SLASH COMMAND
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === "panel") {

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('claim')
                    .setLabel('🎁 Claim Key')
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId('add')
                    .setLabel('➕ Add Key')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({
                content: "**KEY PANEL**",
                components: [row]
            });
        }
    }

    // 🔘 BUTTON
    if (interaction.isButton()) {

        const userId = interaction.user.id;

        // 🎁 CLAIM
        if (interaction.customId === "claim") {

            await interaction.deferReply({ ephemeral: true }); // ⚡ langsung respon
        
            const db = loadDB();
        
            if (!interaction.member.roles.cache.has(CLAIM_ROLE)) {
                return interaction.editReply("❌ No Access");
            }
        
            if (db.claimed_keys[interaction.user.id]) {
                return interaction.editReply("❌ Already claimed!");
            }
        
            if (db.available_keys.length === 0) {
                return interaction.editReply("❌ Stock empty!");
            }
        
            const key = db.available_keys.shift();
            db.claimed_keys[interaction.user.id] = key;
        
            saveDB(db);
        
            await interaction.editReply("✅ Sending key to DM...");
        
            try {
                await interaction.user.send(`🎉 Your Key:\n${key}`);
            } catch {
                return interaction.editReply("❌ DM kamu ketutup");
            }
        }

        // ➕ ADD KEY
        if (interaction.customId === "add") {

            if (!interaction.member.roles.cache.has(ADMIN_ROLE)) {
                return interaction.reply({ content: "❌ Admin only!", ephemeral: true });
            }

            await interaction.reply({
                content: "✏️ Kirim key di chat (15 detik)",
                ephemeral: true
            });

            const filter = m => m.author.id === interaction.user.id;

            const collector = interaction.channel.createMessageCollector({
                filter,
                time: 15000,
                max: 1
            });

            collector.on('collect', msg => {
                const db = loadDB();

                const key = msg.content.trim();

                db.available_keys.push(key);
                saveDB(db);

                msg.reply("✅ Key berhasil ditambahkan!");
            });
        }
    }
});

// 🚀 LOGIN
client.login(TOKEN);
