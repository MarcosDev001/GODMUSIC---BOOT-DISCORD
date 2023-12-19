//desenvolvido por marcos boni

const { Client, GatewayIntentBits } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  AudioPlayerStatus,
  entersState,
} = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const ytSearch = require("yt-search");

const token = ""; 
const clientId = ""; 
const guildId = "";
const musicChannelId = "";
const callChannelId = ""; 

const commands = [
  {
    name: "play",
    description: "Tocar uma música na call",
    options: [
      {
        name: "musica",
        type: 3, 
        description: "Nome da música ou URL do YouTube",
        required: true,
      },
    ],
  },
  {
    name: "pause",
    description: "Pausar a música",
  },
  {
    name: "skip",
    description: "Pular para a próxima música",
  },
];

const rest = new REST({ version: "9" }).setToken(token);

async function pauseMusic(interaction) {
  const connection = voiceConnections.get(guildId);

  if (!connection) {
    return interaction.reply("O bot não está conectado a um canal de voz.");
  }

  const player = connection.state.subscription.player;

  if (player) {
    player.pause();
    interaction.reply("Música pausada.");
  } else {
    interaction.reply("Não há música sendo reproduzida para pausar.");
  }
}

async function skipMusic(interaction) {
  const connection = voiceConnections.get(guildId);

  if (!connection) {
    return interaction.reply("O bot não está conectado a um canal de voz.");
  }

  const player = connection.state.subscription.player;

  if (player) {
    player.stop();
    interaction.reply("Música pulada para a próxima.");
  } else {
    interaction.reply("Não há música sendo reproduzida para pular.");
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const voiceConnections = new Map();

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === "play") {
    const musica = options.getString("musica");
    playMusic(interaction, musica);
  } else if (commandName === "pause") {
    pauseMusic(interaction);
  } else if (commandName === "skip") {
    skipMusic(interaction);
  }
});

async function playMusic(interaction, musica) {
  try {
    await interaction.deferReply();

    const voiceChannel = interaction.guild.channels.cache.get(callChannelId);
    const musicChannel = interaction.guild.channels.cache.get(musicChannelId);

    if (!voiceChannel || !musicChannel) {
      return interaction.followUp("Canal de voz ou canal de música não encontrado.");
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();

    const url = await buscarUrlDaMusica(musica);

    if (!url) {
      return interaction.followUp("Não foi possível encontrar a URL da música.");
    }

    const resource = createAudioResource(ytdl(url), {
      inputType: StreamType.Opus,
    });

    player.play(resource);

    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
      voiceConnections.delete(guildId);
      connection.destroy();
    });

    player.on("error", (error) => {
      console.error("Erro no player:", error);
    });

    connection.on("error", (error) => {
      console.error("Erro na conexão:", error);
    });

    connection.on("stateChange", (state) => {
      console.log('Estado da conexão:', state);
    });

    await entersState(player, AudioPlayerStatus.Playing, 5_000);

    voiceConnections.set(guildId, connection);

    await interaction.followUp(`Tocando a música na call de voz.`);
  } catch (error) {
    console.error("Erro geral:", error);

    await interaction.followUp("Ocorreu um erro ao tocar a música.");
  }
}

async function buscarUrlDaMusica(nomeMusica) {
  try {
    const result = await ytSearch({ query: nomeMusica, pageStart: 1, pageEnd: 1 });

    if (result && result.videos && result.videos.length > 0) {
      const video = result.videos[0];
      const url = `https://www.youtube.com/watch?v=${video.videoId}`;
      console.log('URL da Música:', url);
      return url;
    } else {
      throw new Error("Não foi possível encontrar a URL da música.");
    }
  } catch (error) {
    console.error("Erro ao buscar URL da música:", error.message);
    throw error;
  }
}

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

client.login(token);