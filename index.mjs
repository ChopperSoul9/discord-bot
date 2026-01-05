import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

// ================= CONFIG =================
const DISCORD_TOKEN = "MTQ1NzQyODE4NzU0NDgxNzgxNw.GPFr4w.y5SI0x3t7Sdv09UNMLNenZWLtHCeLcbKGK8aTY";
const CR_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6ImE0ZjVhN2U1LTc4OTQtNGQ2ZC04Y2E0LTk5NWRmM2Q2ODVlNCIsImlhdCI6MTc2NzU0OTUyMywic3ViIjoiZGV2ZWxvcGVyLzI3OTQ4NDMxLTVkMGQtZjY4NS1kZDViLTVlZWRhY2JjMzM1ZiIsInNjb3BlcyI6WyJyb3lhbGUiXSwibGltaXRzIjpbeyJ0aWVyIjoiZGV2ZWxvcGVyL3NpbHZlciIsInR5cGUiOiJ0aHJvdHRsaW5nIn0seyJjaWRycyI6WyI5NS4yMzQuNjIuMTA0Il0sInR5cGUiOiJjbGllbnQifV19.gBF0OPj9ZxvJeyJmEkMy3Q4e8yT3U1Hj1d-WqIhfXGUC-V9cfA31gUlmHGCcQwitjNJVYwyUDHk69HXJyJekSg";
const PLAYER_TAG = "%23VYPYYJGR9"; // es: "#ABCD1234"
const USER_ID = "1413397582578712719";   // ID utente che riceve DM

const CHECK_INTERVAL = 10_000;
// ==========================================

// ---------- CREAZIONE CLIENT ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

let lastBattleTime = null;

// ---------- FUNZIONE API ----------
async function fetchCR(endpoint) {
  const res = await fetch(`https://api.clashroyale.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${CR_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Errore API ${res.status}`);
  return res.json();
}

// ---------- FORMAT ORARIO ----------
function formatBattleTime(battleTime) {
  const formatted = battleTime.replace(
    /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
    "$1-$2-$3T$4:$5:$6"
  );
  return new Date(formatted).toLocaleString("it-IT");
}

// ---------- CONTROLLO BATTAGLIA ----------
async function checkBattle() {
  try {
    const battles = await fetchCR(`/players/${PLAYER_TAG}/battlelog`);
    if (!battles.length) return;

    const latest = battles[0];

    // primo avvio
    if (!lastBattleTime) {
      lastBattleTime = latest.battleTime;
      return;
    }

    if (latest.battleTime === lastBattleTime) return;

    lastBattleTime = latest.battleTime;

    const team = latest.team[0];
    const opponent = latest.opponent[0];

    const result = team.crowns > opponent.crowns ? "✅ Vinta" : "❌ Persa";
    const time = formatBattleTime(latest.battleTime);

    const trophyText =
      typeof team.trophyChange === "number"
        ? `${team.trophyChange > 0 ? "+" : ""}${team.trophyChange}`
        : "N/D";

    const user = await client.users.fetch(USER_ID);
    await user.send(
      `⚔️ **Valentina ha appena finito una battaglia!!**\n` +
      `🎯 Risultato: ${result}\n` +
      `🕒 Orario: ${time}\n` +
      `🏆 Coppe: ${trophyText}`
    );

  } catch (err) {
    console.error("Errore battaglia:", err.message);
  }
}

// ---------- COMANDO !player ----------
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (message.content !== "!player") return;

  try {
    const player = await fetchCR(`/players/${PLAYER_TAG}`);
    const battles = await fetchCR(`/players/${PLAYER_TAG}/battlelog`);

    const latestBattle = battles[0];
    let lastBattleText = "Non disponibile";

    if (latestBattle) {
      const team = latestBattle.team[0];
      const opponent = latestBattle.opponent[0];

      const result = team.crowns > opponent.crowns ? "✅ Vinta" : "❌ Persa";
      const time = formatBattleTime(latestBattle.battleTime);

      const trophyText =
        typeof team.trophyChange === "number"
          ? ` (${team.trophyChange > 0 ? "+" : ""}${team.trophyChange} 🏆)`
          : " (🏆 N/D)";

      lastBattleText = `${time} — ${result}${trophyText}`;
    }

    const clanName = player.clan ? player.clan.name : "Nessun clan";
    const deck = player.currentDeck?.map(c => c.name).join(", ") || "Non disponibile";

    const total = player.wins + player.losses;
    const winRate = total ? ((player.wins / total) * 100).toFixed(1) : "0";

    const statsMessage =
      `👑 **${player.name}**\n` +
      `🏆 Coppe attuali: ${player.trophies}\n` +
      `🥇 Best coppe: ${player.bestTrophies}\n` +
      `🛡️ Clan: ${clanName}\n` +
      `⚔️ Vittorie: ${player.wins}\n` +
      `💀 Sconfitte: ${player.losses}\n` +
      `📊 Win rate: ${winRate}%\n` +
      `🕒 Ultima battaglia: ${lastBattleText}\n` +
      `🃏 Deck attuale: ${deck}`;

    await message.reply(statsMessage);

  } catch (err) {
    console.error("Errore comando !player:", err.message);
    message.reply("❌ Errore nel recupero dei dati del player");
  }
});

// ---------- READY ----------
// ---------- READY ----------
client.once("clientReady", async () => {
  console.log("Bot online ✅");

  try {
    const user = await client.users.fetch(USER_ID);
    await user.send("💌 Bot attivo e pronto a monitorare Basala su Clash Royale!");
  } catch (err) {
    console.error("Errore DM avvio bot:", err.message);
  }

  setInterval(checkBattle, CHECK_INTERVAL);
});

// ---------- LOGIN ----------
client.login(DISCORD_TOKEN).catch(err => {
  console.error("Errore login Discord:", err.message);
});
