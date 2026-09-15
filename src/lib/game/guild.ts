import { guildXpToNext } from "./balance";
import { NPC_HUNTERS } from "./constants";
import { localDayKey } from "./dungeons";
import { irand } from "./rng";
import type {
  GameData,
  GuildApplication,
  GuildBossState,
  GuildJoinMode,
  GuildMember,
  GuildQuestState,
  GuildRole,
  GuildState,
} from "./types";

function gid(prefix = "g") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const GUILD_CREATE_GOLD = 450;
export const GUILD_STRIKE_CD_MS = 8000;
export const GUILD_BUFF_MS = 60 * 60 * 1000;
export const GUILD_MAX_MEMBERS = 24;

export interface WorldGuildDef {
  id: string;
  name: string;
  tag: string;
  motd: string;
  accent: string;
  joinMode: GuildJoinMode;
  minBm: number;
  maxMembers: number;
}

export const WORLD_GUILDS: WorldGuildDef[] = [
  {
    id: "void-blades",
    name: "Клинки Пустоты",
    tag: "VOID",
    motd: "Режем тень. Открытый набор.",
    accent: "#818cf8",
    joinMode: "open",
    minBm: 0,
    maxMembers: 40,
  },
  {
    id: "gold-crown",
    name: "Золотая Корона",
    tag: "GOLD",
    motd: "Казна любит сильных. Заявка, затем смотр.",
    accent: "#fbbf24",
    joinMode: "request",
    minBm: 1800,
    maxMembers: 28,
  },
  {
    id: "night-wolves",
    name: "Ночные Волки",
    tag: "WOLF",
    motd: "Только по зову стаи.",
    accent: "#94a3b8",
    joinMode: "invite",
    minBm: 0,
    maxMembers: 18,
  },
  {
    id: "ashen-dawn",
    name: "Пепельный Рассвет",
    tag: "ASH",
    motd: "Первый костёр охотников. Вход свободный.",
    accent: "#fb7185",
    joinMode: "open",
    minBm: 0,
    maxMembers: 36,
  },
  {
    id: "essence-choir",
    name: "Хор Эссенции",
    tag: "ECHO",
    motd: "Поём жилам. Нужна мощь.",
    accent: "#22d3ee",
    joinMode: "request",
    minBm: 8000,
    maxMembers: 22,
  },
  {
    id: "iron-pact",
    name: "Железный Пакт",
    tag: "IRON",
    motd: "Щит и штольня. Берём всех, кто держит строй.",
    accent: "#a8a29e",
    joinMode: "open",
    minBm: 600,
    maxMembers: 32,
  },
  {
    id: "dusk-court",
    name: "Двор Сумерек",
    tag: "DUSK",
    motd: "Элита рифта. Заявка и смотр БМ.",
    accent: "#c084fc",
    joinMode: "request",
    minBm: 22000,
    maxMembers: 16,
  },
];

export const WORLD_GUILD_BY_ID: Record<string, WorldGuildDef> = Object.fromEntries(
  WORLD_GUILDS.map((g) => [g.id, g]),
);

export type GuildQuestKind = "kills" | "gold" | "ore" | "boss-kill";

export interface GuildQuestDef {
  id: string;
  name: string;
  blurb: string;
  kind: GuildQuestKind;
  target: number;
  coins: number;
  xp: number;
}

export const GUILD_QUESTS: GuildQuestDef[] = [
  {
    id: "hunt",
    name: "Охота ордена",
    blurb: "Убейте монстров в мире или данже.",
    kind: "kills",
    target: 70,
    coins: 28,
    xp: 70,
  },
  {
    id: "tribute",
    name: "Дань казне",
    blurb: "Пожертвуйте золото гильдии.",
    kind: "gold",
    target: 500,
    coins: 22,
    xp: 55,
  },
  {
    id: "vein",
    name: "Жила эссенции",
    blurb: "Добудьте руду в шахте.",
    kind: "ore",
    target: 90,
    coins: 24,
    xp: 50,
  },
  {
    id: "raid",
    name: "Натиск",
    blurb: "Добейте ежедневного босса гильдии.",
    kind: "boss-kill",
    target: 1,
    coins: 42,
    xp: 95,
  },
];

export const GUILD_QUEST_BY_ID: Record<string, GuildQuestDef> = Object.fromEntries(
  GUILD_QUESTS.map((q) => [q.id, q]),
);

export interface GuildSkillDef {
  id: string;
  name: string;
  blurb: string;
  maxRank: number;
  costs: number[];
  xpBonus?: number;
  dropBonus?: number;
  goldMult?: number;
  attack?: number;
  health?: number;
  defense?: number;
  skillHaste?: number;
}

export const GUILD_SKILLS: GuildSkillDef[] = [
  {
    id: "mentor",
    name: "Наставничество",
    blurb: "Больше опыта с убийств.",
    maxRank: 5,
    costs: [40, 70, 110, 160, 220],
    xpBonus: 0.035,
  },
  {
    id: "fortune",
    name: "Удача ордена",
    blurb: "Выше шанс дропа.",
    maxRank: 5,
    costs: [40, 70, 110, 160, 220],
    dropBonus: 0.03,
  },
  {
    id: "ledger",
    name: "Казначей",
    blurb: "Больше золота с монстров.",
    maxRank: 5,
    costs: [35, 65, 100, 150, 210],
    goldMult: 0.07,
  },
  {
    id: "war",
    name: "Боевой клич",
    blurb: "Атака всех членов.",
    maxRank: 5,
    costs: [45, 80, 120, 175, 240],
    attack: 10,
  },
  {
    id: "ironhide",
    name: "Стойкость",
    blurb: "Запас здоровья.",
    maxRank: 5,
    costs: [45, 80, 120, 175, 240],
    health: 28,
    defense: 4,
  },
  {
    id: "march",
    name: "Марш",
    blurb: "Скорость навыков.",
    maxRank: 3,
    costs: [60, 110, 180],
    skillHaste: 0.025,
  },
];

export const GUILD_SKILL_BY_ID: Record<string, GuildSkillDef> = Object.fromEntries(
  GUILD_SKILLS.map((s) => [s.id, s]),
);

export interface GuildShopItem {
  id: string;
  name: string;
  blurb: string;
  coins: number;
  gold?: number;
  ore?: number;
  shards?: number;
  blessing?: number;
}

export const GUILD_SHOP: GuildShopItem[] = [
  { id: "ore-crate", name: "Ящик руды", blurb: "AFK-материал без шахты.", coins: 32, ore: 140 },
  { id: "gold-crate", name: "Мешок золота", blurb: "На заточку и вход.", coins: 32, gold: 2200 },
  { id: "shard-box", name: "Горсть осколков", blurb: "Редкая валюта усиления.", coins: 52, shards: 14 },
  { id: "bless-vial", name: "Искры благословения", blurb: "Мастерская.", coins: 78, blessing: 4 },
];

export interface GuildBuffDef {
  id: string;
  name: string;
  blurb: string;
  coins: number;
  attack?: number;
  health?: number;
  dropBonus?: number;
  xpBonus?: number;
  skillHaste?: number;
}

export const GUILD_BUFFS: GuildBuffDef[] = [
  {
    id: "horn",
    name: "Боевой рог",
    blurb: "Час атаки и скорости навыков.",
    coins: 48,
    attack: 22,
    skillHaste: 0.04,
  },
  {
    id: "luck",
    name: "Фортуна ордена",
    blurb: "Час опыта и дропа.",
    coins: 48,
    dropBonus: 0.12,
    xpBonus: 0.08,
  },
  {
    id: "ward",
    name: "Стена гильдии",
    blurb: "Час запаса здоровья.",
    coins: 42,
    health: 90,
  },
];

export const GUILD_BUFF_BY_ID: Record<string, GuildBuffDef> = Object.fromEntries(
  GUILD_BUFFS.map((b) => [b.id, b]),
);

export const GUILD_BOSS = {
  id: "wraith",
  name: "Призрак ордена",
  blurb: "Ежедневный босс. Урон от вашей БМ. Один раз в сутки на гильдию.",
};

export interface GuildCombatBonus {
  xpBonus: number;
  dropBonus: number;
  goldMult: number;
  attack: number;
  health: number;
  defense: number;
  skillHaste: number;
}

export function emptyGuildState(): GuildState {
  return {
    id: null,
    name: "",
    tag: "",
    level: 1,
    xp: 0,
    treasuryGold: 0,
    treasuryOre: 0,
    coins: 0,
    members: [],
    joinMode: "request",
    motd: "",
    skillRanks: {},
    buffs: [],
    quests: [],
    questDay: "",
    applications: [],
    invites: [],
    boss: null,
    createdByPlayer: false,
  };
}

export function isInGuild(guild: GuildState | null | undefined): boolean {
  return !!guild?.id;
}

export function playerGuildRole(guild: GuildState): GuildRole {
  const m = guild.members.find((x) => x.isPlayer);
  return m?.role ?? (guild.createdByPlayer ? "leader" : "member");
}

export function canManageGuild(guild: GuildState) {
  if (!isInGuild(guild)) return false;
  const role = playerGuildRole(guild);
  return role === "leader" || role === "officer";
}

export function worldGuildOccupancy(id: string) {
  const def = WORLD_GUILD_BY_ID[id];
  if (!def) return 0;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return Math.min(def.maxMembers - 2, 8 + (h % 14));
}

export function guildBossMaxHp(level: number, memberCount: number) {
  return Math.round(5200 + level * 3400 + memberCount * 480);
}

export function makeGuildBoss(level: number, memberCount: number, dayKey: string): GuildBossState {
  const maxHp = guildBossMaxHp(level, memberCount);
  return {
    defId: GUILD_BOSS.id,
    hp: maxHp,
    maxHp,
    dayKey,
    lastStrikeAt: 0,
  };
}

function defaultQuests(): GuildQuestState[] {
  return GUILD_QUESTS.map((q) => ({ defId: q.id, progress: 0, claimed: false }));
}

export function normalizeGuild(raw: Partial<GuildState> | undefined | null): GuildState {
  const base = emptyGuildState();
  if (!raw) return base;
  const id = raw.id === undefined || raw.id === "" ? null : raw.id;
  const members = (raw.members ?? []).map((m) => ({
    ...m,
    role: m.role ?? (m.isPlayer && (raw.createdByPlayer || raw.id === "ashen-dawn") ? "leader" : m.isPlayer ? "member" : "member"),
    power: m.power ?? 0,
  }));
  if (id && members.length && !members.some((m) => m.isPlayer)) {
    /* keep as-is; caller may inject */
  }
  return {
    ...base,
    ...raw,
    id,
    name: raw.name ?? "",
    tag: ((raw.tag ?? "").slice(0, 5).toUpperCase() ||
      (raw.name ?? "").replace(/[^a-zA-Zа-яА-Я0-9]/g, "").slice(0, 4).toUpperCase()),
    level: Math.max(1, raw.level ?? 1),
    xp: Math.max(0, raw.xp ?? 0),
    treasuryGold: Math.max(0, raw.treasuryGold ?? 0),
    treasuryOre: Math.max(0, raw.treasuryOre ?? 0),
    coins: Math.max(0, raw.coins ?? 0),
    members,
    joinMode: raw.joinMode ?? "open",
    motd: raw.motd ?? "",
    skillRanks: { ...(raw.skillRanks ?? {}) },
    buffs: [...(raw.buffs ?? [])],
    quests: raw.quests?.length ? raw.quests : defaultQuests(),
    questDay: raw.questDay ?? "",
    applications: [...(raw.applications ?? [])],
    invites: [...(raw.invites ?? [])],
    boss: raw.boss ?? null,
    createdByPlayer: !!raw.createdByPlayer,
  };
}

export function guildCombatBonuses(guild: GuildState | null | undefined, now = Date.now()): GuildCombatBonus {
  const acc: GuildCombatBonus = {
    xpBonus: 0,
    dropBonus: 0,
    goldMult: 0,
    attack: 0,
    health: 0,
    defense: 0,
    skillHaste: 0,
  };
  if (!guild?.id) return acc;
  acc.xpBonus += (guild.level - 1) * 0.02;
  acc.dropBonus += (guild.level - 1) * 0.015;
  for (const [id, rank] of Object.entries(guild.skillRanks ?? {})) {
    if (rank <= 0) continue;
    const def = GUILD_SKILL_BY_ID[id];
    if (!def) continue;
    acc.xpBonus += (def.xpBonus ?? 0) * rank;
    acc.dropBonus += (def.dropBonus ?? 0) * rank;
    acc.goldMult += (def.goldMult ?? 0) * rank;
    acc.attack += (def.attack ?? 0) * rank;
    acc.health += (def.health ?? 0) * rank;
    acc.defense += (def.defense ?? 0) * rank;
    acc.skillHaste += (def.skillHaste ?? 0) * rank;
  }
  for (const buff of guild.buffs ?? []) {
    if (buff.expiresAt <= now) continue;
    const def = GUILD_BUFF_BY_ID[buff.id];
    if (!def) continue;
    acc.xpBonus += def.xpBonus ?? 0;
    acc.dropBonus += def.dropBonus ?? 0;
    acc.attack += def.attack ?? 0;
    acc.health += def.health ?? 0;
    acc.skillHaste += def.skillHaste ?? 0;
  }
  return acc;
}

export function sanitizeGuildTag(raw: string) {
  return raw.replace(/[^a-zA-Zа-яА-Я0-9]/g, "").slice(0, 5).toUpperCase();
}

export function sanitizeGuildName(raw: string) {
  return raw.trim().slice(0, 22);
}

function npcMember(name: string, contribution: number, power: number, role: GuildRole = "member"): GuildMember {
  return {
    id: gid("m"),
    name,
    contribution,
    isPlayer: false,
    role,
    power,
  };
}

function pickHunters(count: number, exclude: Set<string>) {
  const pool = NPC_HUNTERS.filter((n) => !exclude.has(n));
  const out: string[] = [];
  const used = new Set<string>();
  while (out.length < count && pool.length > used.size) {
    const n = pool[irand(0, pool.length - 1)]!;
    if (used.has(n)) continue;
    used.add(n);
    out.push(n);
  }
  return out;
}

export function seedWorldGuildMembers(def: WorldGuildDef, playerName: string, playerPower: number): GuildMember[] {
  const names = pickHunters(Math.min(6, worldGuildOccupancy(def.id)), new Set([playerName]));
  const members: GuildMember[] = [
    {
      id: "player",
      name: playerName,
      contribution: 0,
      isPlayer: true,
      role: "member",
      power: playerPower,
    },
  ];
  names.forEach((name, i) => {
    members.push(
      npcMember(name, 180 + i * 90 + irand(0, 120), Math.round(playerPower * (0.7 + i * 0.08)), i === 0 ? "leader" : "member"),
    );
  });
  return members;
}

export function addGuildXp(guild: GuildState, amount: number) {
  if (!guild.id || amount <= 0) return 0;
  guild.xp += amount;
  let leveled = 0;
  while (guild.xp >= guildXpToNext(guild.level)) {
    guild.xp -= guildXpToNext(guild.level);
    guild.level += 1;
    leveled += 1;
  }
  return leveled;
}

function bumpQuest(guild: GuildState, kind: GuildQuestKind, amount: number) {
  if (!guild.id || amount <= 0) return;
  for (const q of guild.quests) {
    const def = GUILD_QUEST_BY_ID[q.defId];
    if (!def || def.kind !== kind || q.claimed) continue;
    q.progress = Math.min(def.target, q.progress + amount);
  }
}

export function noteGuildKills(guild: GuildState, n = 1) {
  bumpQuest(guild, "kills", n);
}

export function noteGuildGoldTribute(guild: GuildState, gold: number) {
  bumpQuest(guild, "gold", gold);
}

export function noteGuildOre(guild: GuildState, ore: number) {
  bumpQuest(guild, "ore", ore);
}

export function noteGuildBossKill(guild: GuildState) {
  bumpQuest(guild, "boss-kill", 1);
}

export function ensureGuildDay(guild: GuildState, now = Date.now()) {
  const day = localDayKey(now);
  if (guild.questDay !== day) {
    guild.questDay = day;
    guild.quests = defaultQuests();
  }
  if (guild.id) {
    if (!guild.boss || guild.boss.dayKey !== day) {
      guild.boss = makeGuildBoss(guild.level, guild.members.length, day);
    }
  } else {
    guild.boss = null;
  }
  guild.buffs = (guild.buffs ?? []).filter((b) => b.expiresAt > now);
}

export function tickGuild(state: GameData, now = Date.now()) {
  state.guild = normalizeGuild(state.guild);
  const g = state.guild;
  ensureGuildDay(g, now);
  const player = g.members.find((m) => m.isPlayer);
  if (player) {
    player.name = state.character.name;
    player.power = player.power ?? 0;
  }

  if (!g.id && g.invites.length === 0 && Math.random() < 0.00008) {
    const def = WORLD_GUILDS.find((w) => w.joinMode === "invite") ?? WORLD_GUILDS[0]!;
    g.invites.push({
      id: gid("inv"),
      hunterId: "world",
      name: def.name,
      power: 0,
      guildId: def.id,
      guildName: def.name,
      outgoing: false,
    });
  }

  if (g.id && g.createdByPlayer && canManageGuild(g) && g.joinMode !== "invite") {
    if (g.applications.filter((a) => a.incoming).length < 2 && Math.random() < 0.00012) {
      const taken = new Set(g.members.map((m) => m.name));
      const name = pickHunters(1, taken)[0];
      if (name) {
        g.applications.push({
          id: gid("app"),
          hunterId: gid("h"),
          name,
          power: Math.round((player?.power ?? 400) * (0.55 + Math.random() * 0.7)),
          incoming: true,
          guildId: g.id,
          guildName: g.name,
        });
      }
    }
  }

  if (!g.id) {
    for (const app of [...g.applications]) {
      if (app.incoming) continue;
      const def = WORLD_GUILD_BY_ID[app.guildId];
      if (!def || def.joinMode !== "request") continue;
      if (Math.random() > 0.012) continue;
      g.applications = g.applications.filter((a) => a.id !== app.id);
      g.invites.push({
        id: gid("inv"),
        hunterId: "world",
        name: def.name,
        power: 0,
        guildId: def.id,
        guildName: def.name,
        outgoing: false,
      });
    }
  }
}

export function claimQuestReward(guild: GuildState, defId: string): { ok: boolean; message: string } {
  if (!guild.id) return { ok: false, message: "Нет гильдии" };
  const q = guild.quests.find((x) => x.defId === defId);
  const def = GUILD_QUEST_BY_ID[defId];
  if (!q || !def) return { ok: false, message: "Нет задания" };
  if (q.claimed) return { ok: false, message: "Уже получено" };
  if (q.progress < def.target) return { ok: false, message: "Ещё не выполнено" };
  q.claimed = true;
  guild.coins += def.coins;
  const lv = addGuildXp(guild, def.xp);
  return {
    ok: true,
    message: `+${def.coins} монет гильдии${lv ? ` · гильдия ур. ${guild.level}` : ""}`,
  };
}

export function strikeGuildBoss(
  guild: GuildState,
  power: number,
  now = Date.now(),
): { ok: boolean; message: string; killed: boolean; damage: number } {
  if (!guild.id || !guild.boss) return { ok: false, message: "Нет босса", killed: false, damage: 0 };
  if (guild.boss.hp <= 0) return { ok: false, message: "Босс уже пал сегодня", killed: false, damage: 0 };
  if (now - guild.boss.lastStrikeAt < GUILD_STRIKE_CD_MS) {
    const wait = Math.ceil((GUILD_STRIKE_CD_MS - (now - guild.boss.lastStrikeAt)) / 1000);
    return { ok: false, message: `Удар через ${wait}с`, killed: false, damage: 0 };
  }
  const damage = Math.max(40, Math.round(power * (0.28 + Math.random() * 0.12)));
  guild.boss.lastStrikeAt = now;
  guild.boss.hp = Math.max(0, guild.boss.hp - damage);
  const player = guild.members.find((m) => m.isPlayer);
  if (player) player.contribution += Math.round(damage / 40);
  if (guild.boss.hp > 0) {
    return { ok: true, message: `−${damage} HP`, killed: false, damage };
  }
  noteGuildBossKill(guild);
  const coins = 70 + guild.level * 8;
  const xp = 160 + guild.level * 35;
  guild.coins += coins;
  guild.treasuryGold += 400 + guild.level * 80;
  const lv = addGuildXp(guild, xp);
  return {
    ok: true,
    message: `${GUILD_BOSS.name} пал. +${coins} монет${lv ? ` · ур. ${guild.level}` : ""}`,
    killed: true,
    damage,
  };
}

export function buyGuildShopItem(
  state: GameData,
  itemId: string,
): { ok: boolean; message: string } {
  const item = GUILD_SHOP.find((x) => x.id === itemId);
  const g = state.guild;
  if (!item) return { ok: false, message: "Нет товара" };
  if (!g.id) return { ok: false, message: "Нет гильдии" };
  if (g.coins < item.coins) return { ok: false, message: "Мало монет гильдии" };
  g.coins -= item.coins;
  if (item.gold) state.resources.gold += item.gold;
  if (item.ore) state.resources.ore += item.ore;
  if (item.shards) state.resources.shards += item.shards;
  if (item.blessing) state.resources.blessing = (state.resources.blessing ?? 0) + item.blessing;
  return { ok: true, message: `Куплено: ${item.name}` };
}

export function rankGuildSkill(guild: GuildState, skillId: string): { ok: boolean; message: string } {
  const def = GUILD_SKILL_BY_ID[skillId];
  if (!def) return { ok: false, message: "Нет навыка" };
  if (!guild.id) return { ok: false, message: "Нет гильдии" };
  const current = guild.skillRanks[skillId] ?? 0;
  if (current >= def.maxRank) return { ok: false, message: "Максимум" };
  const needLevel = 1 + current;
  if (guild.level < needLevel) return { ok: false, message: `Нужен ${needLevel} ур. гильдии` };
  const cost = def.costs[current] ?? def.costs[def.costs.length - 1]!;
  if (guild.coins < cost) return { ok: false, message: `Нужно ${cost} монет` };
  guild.coins -= cost;
  guild.skillRanks[skillId] = current + 1;
  return { ok: true, message: `${def.name} ${current + 1}/${def.maxRank}` };
}

export function activateGuildBuff(guild: GuildState, buffId: string, now = Date.now()): { ok: boolean; message: string } {
  const def = GUILD_BUFF_BY_ID[buffId];
  if (!def) return { ok: false, message: "Нет баффа" };
  if (!guild.id) return { ok: false, message: "Нет гильдии" };
  if (guild.coins < def.coins) return { ok: false, message: "Мало монет" };
  guild.coins -= def.coins;
  const rest = (guild.buffs ?? []).filter((b) => b.id !== buffId && b.expiresAt > now);
  rest.push({ id: buffId, expiresAt: now + GUILD_BUFF_MS });
  guild.buffs = rest;
  return { ok: true, message: `${def.name} на час` };
}

export function joinModeLabel(mode: GuildJoinMode) {
  if (mode === "open") return "Свободный вход";
  if (mode === "request") return "По заявке";
  return "Только приглашение";
}

export function createPlayerGuild(
  state: GameData,
  name: string,
  tag: string,
  joinMode: GuildJoinMode,
  motd: string,
): { ok: boolean; message: string } {
  if (state.guild.id) return { ok: false, message: "Вы уже в гильдии" };
  const n = sanitizeGuildName(name);
  const t = sanitizeGuildTag(tag);
  if (n.length < 3) return { ok: false, message: "Имя — минимум 3 символа" };
  if (t.length < 2) return { ok: false, message: "Тег — 2–5 символов" };
  if (state.resources.gold < GUILD_CREATE_GOLD) {
    return { ok: false, message: `Нужно ${GUILD_CREATE_GOLD} золота` };
  }
  state.resources.gold -= GUILD_CREATE_GOLD;
  const power = 0;
  state.guild = {
    ...emptyGuildState(),
    id: gid("pg"),
    name: n,
    tag: t,
    joinMode,
    motd: motd.trim().slice(0, 80),
    createdByPlayer: true,
    treasuryGold: 80,
    members: [
      {
        id: "player",
        name: state.character.name,
        contribution: 40,
        isPlayer: true,
        role: "leader",
        power,
      },
    ],
  };
  ensureGuildDay(state.guild);
  return { ok: true, message: `Гильдия «${n}» основана` };
}

export function leavePlayerGuild(state: GameData): { ok: boolean; message: string } {
  if (!state.guild.id) return { ok: false, message: "Вы не в гильдии" };
  const name = state.guild.name;
  state.guild = emptyGuildState();
  return { ok: true, message: `Вы покинули «${name}»` };
}

export function joinWorldGuild(
  state: GameData,
  guildId: string,
  playerPower: number,
): { ok: boolean; message: string } {
  if (state.guild.id) return { ok: false, message: "Сначала покиньте гильдию" };
  const def = WORLD_GUILD_BY_ID[guildId];
  if (!def) return { ok: false, message: "Гильдия не найдена" };
  if (playerPower < def.minBm) return { ok: false, message: `Нужно ${def.minBm} БМ` };
  state.guild = {
    ...emptyGuildState(),
    id: def.id,
    name: def.name,
    tag: def.tag,
    motd: def.motd,
    joinMode: def.joinMode,
    createdByPlayer: false,
    level: 1 + Math.floor(worldGuildOccupancy(def.id) / 8),
    treasuryGold: 1200,
    treasuryOre: 80,
    coins: 12,
    members: seedWorldGuildMembers(def, state.character.name, playerPower),
  };
  ensureGuildDay(state.guild);
  return { ok: true, message: `Вы в гильдии «${def.name}»` };
}

export function applyToWorldGuild(
  state: GameData,
  guildId: string,
  playerPower: number,
): { ok: boolean; message: string } {
  if (state.guild.id) return { ok: false, message: "Вы уже в гильдии" };
  const def = WORLD_GUILD_BY_ID[guildId];
  if (!def) return { ok: false, message: "Гильдия не найдена" };
  if (def.joinMode === "open") return joinWorldGuild(state, guildId, playerPower);
  if (def.joinMode === "invite") return { ok: false, message: "Только по приглашению" };
  if (playerPower < def.minBm) return { ok: false, message: `Нужно ${def.minBm} БМ` };
  if (state.guild.applications.some((a) => a.guildId === guildId)) {
    return { ok: false, message: "Заявка уже отправлена" };
  }
  state.guild.applications.push({
    id: gid("app"),
    hunterId: "player",
    name: state.character.name,
    power: playerPower,
    incoming: false,
    guildId: def.id,
    guildName: def.name,
  });
  return { ok: true, message: `Заявка в «${def.name}» отправлена. Ждите ответ.` };
}

export function acceptGuildInvite(state: GameData, inviteId: string, playerPower: number) {
  const inv = state.guild.invites.find((i) => i.id === inviteId);
  if (!inv) return { ok: false, message: "Приглашение не найдено" };
  if (inv.outgoing) return { ok: false, message: "Это ваше исходящее" };
  state.guild.invites = state.guild.invites.filter((i) => i.id !== inviteId);
  return joinWorldGuild(state, inv.guildId, playerPower);
}

export function acceptIncomingApplication(
  state: GameData,
  applicationId: string,
): { ok: boolean; message: string } {
  const g = state.guild;
  if (!canManageGuild(g)) return { ok: false, message: "Нет прав" };
  const app = g.applications.find((a) => a.id === applicationId && a.incoming);
  if (!app) return { ok: false, message: "Нет заявки" };
  if (g.members.length >= GUILD_MAX_MEMBERS) return { ok: false, message: "Гильдия полна" };
  g.applications = g.applications.filter((a) => a.id !== applicationId);
  g.members.push(npcMember(app.name, 10, app.power));
  return { ok: true, message: `${app.name} принят в гильдию` };
}

export function declineIncomingApplication(guild: GuildState, applicationId: string) {
  guild.applications = guild.applications.filter((a) => a.id !== applicationId);
  return { ok: true, message: "Заявка отклонена" };
}

export function inviteHunterToGuild(
  state: GameData,
  hunter: { id: string; name: string; power: number },
): { ok: boolean; message: string } {
  const g = state.guild;
  if (!canManageGuild(g) || !g.id) return { ok: false, message: "Нет прав" };
  if (g.members.some((m) => m.name === hunter.name)) return { ok: false, message: "Уже в гильдии" };
  if (g.members.length >= GUILD_MAX_MEMBERS) return { ok: false, message: "Гильдия полна" };
  if (g.invites.some((i) => i.outgoing && i.hunterId === hunter.id)) {
    return { ok: false, message: "Приглашение уже отправлено" };
  }
  const accepts = hunter.power <= (g.members.find((m) => m.isPlayer)?.power ?? 0) * 1.45 + 80;
  if (accepts) {
    g.members.push(npcMember(hunter.name, 8, hunter.power));
    return { ok: true, message: `${hunter.name} принял приглашение` };
  }
  g.invites.push({
    id: gid("inv"),
    hunterId: hunter.id,
    name: hunter.name,
    power: hunter.power,
    guildId: g.id,
    guildName: g.name,
    outgoing: true,
  });
  return { ok: true, message: `${hunter.name} думает над приглашением` };
}

export function setGuildJoinMode(guild: GuildState, mode: GuildJoinMode): { ok: boolean; message: string } {
  if (!canManageGuild(guild)) return { ok: false, message: "Нет прав" };
  guild.joinMode = mode;
  return { ok: true, message: joinModeLabel(mode) };
}
