"use client";

import { useMemo, useState } from "react";
import {
  Coins,
  Crown,
  Landmark,
  Pickaxe,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  GUILD_BUFFS,
  GUILD_CREATE_GOLD,
  GUILD_QUESTS,
  GUILD_SHOP,
  GUILD_SKILLS,
  GUILD_BOSS,
  GUILD_STRIKE_CD_MS,
  WORLD_GUILDS,
  canManageGuild,
  isInGuild,
  joinModeLabel,
  playerGuildRole,
  worldGuildOccupancy,
} from "@/lib/game/guild";
import { formatBuffCountdown } from "@/lib/game/activeBuffs";
import { formatFullDigits, formatNumber, guildXpToNext } from "@/lib/game/formulas";
import type { GuildJoinMode } from "@/lib/game/types";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { HealthBar } from "@/components/combat/HealthBar";

type Slice = "home" | "quests" | "boss" | "shop" | "skills" | "people";

export function GuildPanel() {
  const guild = useGameStore((s) => s.guild);
  const inGuild = isInGuild(guild);
  return inGuild ? <GuildHome /> : <GuildBrowser />;
}

function GuildBrowser() {
  const derived = useDerivedStats();
  const gold = useGameStore((s) => s.resources.gold);
  const applications = useGameStore((s) => s.guild.applications);
  const invites = useGameStore((s) => s.guild.invites);
  const createGuild = useGameStore((s) => s.createGuild);
  const applyListedGuild = useGameStore((s) => s.applyListedGuild);
  const joinListedGuild = useGameStore((s) => s.joinListedGuild);
  const acceptInvite = useGameStore((s) => s.acceptInvite);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [mode, setMode] = useState<GuildJoinMode>("open");
  const [motd, setMotd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
      <div className="es-plate overflow-hidden p-0">
        <div className="border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[var(--accent)]" />
            <span className="font-display text-[15px] text-white">Гильдии мира</span>
          </div>
        </div>
        <div className="space-y-2 p-3">
          {WORLD_GUILDS.length === 0 ? (
            <p className="px-1 py-6 text-center text-[12px] text-white/40">
              Мировые гильдии отключены. Создайте свою справа.
            </p>
          ) : null}
          {invites.filter((i) => !i.outgoing).length > 0 ? (
            <div className="space-y-1.5">
              {invites
                .filter((i) => !i.outgoing)
                .map((inv) => (
                  <div key={inv.id} className="es-well flex items-center justify-between px-3 py-2">
                    <span className="text-[13px] text-white">Приглашение: {inv.guildName}</span>
                    <button
                      type="button"
                      className="es-btn es-btn-cyan es-inv-control px-2.5"
                      onClick={() => setMsg(acceptInvite(inv.id).message)}
                    >
                      Принять
                    </button>
                  </div>
                ))}
            </div>
          ) : null}
          {WORLD_GUILDS.map((g) => {
            const occ = worldGuildOccupancy(g.id);
            const pending = applications.some((a) => a.guildId === g.id && !a.incoming);
            const weak = derived.powerScore < g.minBm;
            return (
              <div key={g.id} className="es-well px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display text-[14px] text-white">
                      {g.name}{" "}
                      <span className="text-[11px] text-[#8aa0b4]">[{g.tag}]</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#8aa0b4]">{g.motd}</p>
                    <div className="mt-1 text-[10px] text-white/45">
                      {joinModeLabel(g.joinMode)} · {occ}/{g.maxMembers} · от{" "}
                      {formatFullDigits(g.minBm)} БМ
                    </div>
                  </div>
                  {g.joinMode === "open" ? (
                    <button
                      type="button"
                      disabled={weak}
                      className="es-btn es-btn-cyan es-inv-control shrink-0 px-2.5"
                      onClick={() => setMsg(joinListedGuild(g.id).message)}
                    >
                      Вступить
                    </button>
                  ) : g.joinMode === "request" ? (
                    <button
                      type="button"
                      disabled={weak || pending}
                      className="es-btn es-inv-control shrink-0 px-2.5"
                      onClick={() => setMsg(applyListedGuild(g.id).message)}
                    >
                      {pending ? "Заявка" : "Заявка"}
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#6a7c8c]">инвайт</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="es-plate p-4">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-[#e4c36a]" />
          <span className="font-display text-[15px] text-white">Основать орден</span>
        </div>
        <p className="mt-1 text-[11px] text-[#8aa0b4]">{formatNumber(GUILD_CREATE_GOLD)} золота</p>
        <div className="mt-3 grid gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название"
            className="es-input h-10 px-3 text-sm"
          />
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="ТЕГ"
            className="es-input h-10 px-3 text-sm uppercase"
            maxLength={5}
          />
          <input
            value={motd}
            onChange={(e) => setMotd(e.target.value)}
            placeholder="Девиз"
            className="es-input h-10 w-full px-3 text-sm"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(["open", "request", "invite"] as GuildJoinMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn("es-btn es-inv-control px-2.5", mode === m && "es-btn-cyan")}
            >
              {joinModeLabel(m)}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={gold < GUILD_CREATE_GOLD}
          onClick={() => setMsg(createGuild(name, tag, mode, motd).message)}
          className="es-btn es-btn-amber mt-3 h-10 w-full px-3"
        >
          Создать
        </button>
        {msg ? <p className="mt-2 text-[11px] text-white/65">{msg}</p> : null}
      </div>
    </div>
  );
}

function GuildHome() {
  const guild = useGameStore((s) => s.guild);
  const donateToGuild = useGameStore((s) => s.donateToGuild);
  const leaveGuild = useGameStore((s) => s.leaveGuild);
  const setJoinMode = useGameStore((s) => s.setJoinMode);
  const claimGuildQuest = useGameStore((s) => s.claimGuildQuest);
  const strike = useGameStore((s) => s.strikeGuildBoss);
  const buyGuildItem = useGameStore((s) => s.buyGuildItem);
  const rankGuildSkill = useGameStore((s) => s.rankGuildSkill);
  const activateGuildBuff = useGameStore((s) => s.activateGuildBuff);
  const acceptApplicant = useGameStore((s) => s.acceptApplicant);
  const declineApplicant = useGameStore((s) => s.declineApplicant);
  const inviteToGuild = useGameStore((s) => s.inviteToGuild);
  const leaderboard = useGameStore((s) => s.leaderboard);
  const [slice, setSlice] = useState<Slice>("home");
  const [goldAmt, setGoldAmt] = useState(80);
  const [oreAmt, setOreAmt] = useState(20);
  const [msg, setMsg] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const xpNeed = guildXpToNext(guild.level);
  const manage = canManageGuild(guild);
  const role = playerGuildRole(guild);
  const members = [...guild.members].sort((a, b) => b.contribution - a.contribution);
  const boss = guild.boss;
  const strikeWait = boss ? Math.max(0, GUILD_STRIKE_CD_MS - (now - boss.lastStrikeAt)) : 0;

  const invitePool = useMemo(() => {
    const taken = new Set(guild.members.map((m) => m.name));
    return leaderboard.filter((h) => !taken.has(h.name)).slice(0, 8);
  }, [guild.members, leaderboard]);

  const tabs: { id: Slice; label: string; icon: typeof Shield }[] = [
    { id: "home", label: "Зал", icon: Shield },
    { id: "people", label: "Состав", icon: Users },
    { id: "quests", label: "Задания", icon: Sparkles },
    { id: "boss", label: "Босс", icon: Swords },
    { id: "shop", label: "Лавка", icon: ShoppingBag },
    { id: "skills", label: "Сила", icon: Landmark },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="es-plate overflow-hidden p-0">
        <div
          className="relative border-b border-white/8 px-4 py-4"
          style={{
            background:
              "radial-gradient(ellipse at 15% 40%, rgba(46,229,157,0.12), transparent 50%), radial-gradient(ellipse at 90% 20%, rgba(228,195,106,0.08), transparent 45%)",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                {role === "leader" ? "Глава" : role === "officer" ? "Офицер" : "Член"} · ур.{" "}
                {guild.level}
              </div>
              <div className="mt-1 font-display text-[18px] text-white">
                {guild.name}{" "}
                <span className="text-[13px] text-[#8aa0b4]">[{guild.tag || "—"}]</span>
              </div>
              {guild.motd ? (
                <p className="mt-1 max-w-md text-[12px] text-[#8aa0b4]">{guild.motd}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="es-chip !py-1.5 text-[11px]">
                <Coins className="h-3.5 w-3.5 text-[#e4c36a]" />
                {formatNumber(guild.treasuryGold)}
              </span>
              <span className="es-chip !py-1.5 text-[11px]">
                <Pickaxe className="h-3.5 w-3.5" />
                {formatNumber(guild.treasuryOre)}
              </span>
              <span className="es-chip !py-1.5 text-[11px]">
                монеты {formatNumber(guild.coins)}
              </span>
            </div>
          </div>
          <div className="mt-3 max-w-md">
            <HealthBar current={guild.xp} max={xpNeed} label="Прогресс" variant="xp" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-3 py-2.5">
          <input
            type="number"
            min={1}
            value={goldAmt}
            onChange={(e) => setGoldAmt(Number(e.target.value))}
            className="es-input h-8 w-16 px-2 text-sm"
          />
          <button
            type="button"
            onClick={() => donateToGuild("gold", goldAmt)}
            className="es-btn es-btn-amber es-inv-control px-2.5"
          >
            Золото
          </button>
          <input
            type="number"
            min={1}
            value={oreAmt}
            onChange={(e) => setOreAmt(Number(e.target.value))}
            className="es-input h-8 w-16 px-2 text-sm"
          />
          <button
            type="button"
            onClick={() => donateToGuild("ore", oreAmt)}
            className="es-btn es-btn-cyan es-inv-control px-2.5"
          >
            Руда
          </button>
          {manage ? (
            <div className="flex flex-wrap gap-1">
              {(["open", "request", "invite"] as GuildJoinMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMsg(setJoinMode(m).message)}
                  className={cn(
                    "es-btn es-inv-control px-2 text-[10px]",
                    guild.joinMode === m && "es-btn-cyan",
                  )}
                >
                  {joinModeLabel(m)}
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setMsg(leaveGuild().message)}
            className="es-btn es-inv-control ml-auto px-2.5"
          >
            Покинуть
          </button>
        </div>

        <div className="flex gap-0.5 overflow-x-auto border-b border-white/8 px-2 py-1.5 [scrollbar-width:none]">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSlice(t.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition",
                  slice === t.id
                    ? "bg-white/10 text-white"
                    : "text-[#8aa0b4] hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-3">
          {slice === "home" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="es-well p-3">
                <div className="es-label mb-2">Активные баффы</div>
                {guild.buffs.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {guild.buffs.map((b) => {
                      const def = GUILD_BUFFS.find((x) => x.id === b.id);
                      return (
                        <span key={b.id} className="es-chip !py-1 text-[11px]">
                          {def?.name ?? b.id} ·{" "}
                          {formatBuffCountdown((b.expiresAt - Date.now()) / 1000)}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[12px] text-[#8aa0b4]">Нет активных баффов</p>
                )}
              </div>
              <div className="es-well p-3">
                <div className="es-label mb-2">Состав</div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--accent)]" />
                  <span className="font-display text-[16px] text-white">{members.length}</span>
                  <span className="text-[11px] text-[#8aa0b4]">охотников</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSlice("people")}
                  className="es-btn es-inv-control mt-2 px-2.5"
                >
                  Открыть ростер
                </button>
              </div>
            </div>
          ) : null}

          {slice === "quests" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {guild.quests.map((q) => {
                const def = GUILD_QUESTS.find((d) => d.id === q.defId);
                if (!def) return null;
                const ready = q.progress >= def.target && !q.claimed;
                return (
                  <div key={q.defId} className="es-well p-3">
                    <div className="font-display text-[13px] text-white">{def.name}</div>
                    <p className="mt-0.5 text-[11px] text-[#8aa0b4]">{def.blurb}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]/70"
                        style={{
                          width: `${Math.min(100, (q.progress / def.target) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] tabular-nums text-white/55">
                        {Math.min(q.progress, def.target)}/{def.target} · {def.coins} монет
                      </span>
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => setMsg(claimGuildQuest(q.defId).message)}
                        className="es-btn es-btn-amber es-inv-control shrink-0 px-2.5"
                      >
                        {q.claimed ? "Получено" : "Забрать"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {slice === "boss" ? (
            <div className="es-well mx-auto max-w-md p-4 text-center">
              <Swords className="mx-auto h-8 w-8 text-[#fb7185]" />
              <div className="mt-2 font-display text-[16px] text-white">{GUILD_BOSS.name}</div>
              <p className="mt-1 text-[11px] text-[#8aa0b4]">{GUILD_BOSS.blurb}</p>
              {boss ? (
                <>
                  <div className="mt-4">
                    <HealthBar current={boss.hp} max={boss.maxHp} variant="enemy" label="HP" />
                  </div>
                  <button
                    type="button"
                    disabled={boss.hp <= 0 || strikeWait > 0}
                    onClick={() => setMsg(strike().message)}
                    className="es-btn es-btn-amber mt-4 h-10 w-full px-3"
                  >
                    {boss.hp <= 0
                      ? "Пал сегодня"
                      : strikeWait > 0
                        ? `Удар через ${Math.ceil(strikeWait / 1000)}с`
                        : "Ударить"}
                  </button>
                </>
              ) : (
                <p className="mt-3 text-[12px] text-[#8aa0b4]">Босс появится сегодня.</p>
              )}
            </div>
          ) : null}

          {slice === "shop" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {GUILD_SHOP.map((item) => (
                <div key={item.id} className="es-well flex items-center justify-between gap-2 p-3">
                  <div>
                    <div className="font-display text-[13px] text-white">{item.name}</div>
                    <p className="text-[11px] text-[#8aa0b4]">{item.blurb}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMsg(buyGuildItem(item.id).message)}
                    className="es-btn es-btn-cyan es-inv-control shrink-0 px-2.5"
                  >
                    {item.coins}
                  </button>
                </div>
              ))}
              {GUILD_BUFFS.map((b) => {
                const live = guild.buffs.find((x) => x.id === b.id && x.expiresAt > Date.now());
                const remain = live
                  ? formatBuffCountdown((live.expiresAt - Date.now()) / 1000)
                  : null;
                return (
                  <div key={b.id} className="es-well flex items-center justify-between gap-2 p-3">
                    <div>
                      <div className="font-display text-[13px] text-white">{b.name}</div>
                      <p className="text-[11px] text-[#8aa0b4]">
                        {b.blurb}
                        {remain ? ` · ещё ${remain}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMsg(activateGuildBuff(b.id).message)}
                      className="es-btn es-inv-control shrink-0 px-2.5"
                    >
                      {b.coins}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {slice === "skills" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {GUILD_SKILLS.map((sk) => {
                const rank = guild.skillRanks[sk.id] ?? 0;
                return (
                  <div key={sk.id} className="es-well p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-display text-[13px] text-white">{sk.name}</div>
                      <span className="text-[11px] tabular-nums text-[#8aa0b4]">
                        {rank}/{sk.maxRank}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#8aa0b4]">{sk.blurb}</p>
                    <div className="mt-2 flex gap-1">
                      {Array.from({ length: sk.maxRank }, (_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1.5 flex-1 rounded-full",
                            i < rank ? "bg-[var(--accent)]" : "bg-white/10",
                          )}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={rank >= sk.maxRank}
                      onClick={() => setMsg(rankGuildSkill(sk.id).message)}
                      className="es-btn es-btn-cyan es-inv-control mt-2 px-2.5"
                    >
                      {rank >= sk.maxRank ? "Макс" : sk.costs[rank]}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {slice === "people" ? (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.85fr)]">
              <div>
                <div className="es-label mb-2">Ростер</div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "es-well flex items-center justify-between px-3 py-2.5 text-[13px]",
                        m.isPlayer && "border-[var(--accent)]/30",
                      )}
                    >
                      <div className="min-w-0">
                        <div className={m.isPlayer ? "text-[var(--accent)]" : "text-white"}>
                          {m.name}
                          {m.isPlayer ? " (вы)" : ""}
                        </div>
                        <div className="text-[10px] text-[#6a7c8c]">{m.role ?? "member"}</div>
                      </div>
                      <span className="font-mono text-[11px] text-[#8aa0b4]">
                        {formatNumber(m.contribution)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {manage && guild.applications.filter((a) => a.incoming).length > 0 ? (
                  <div>
                    <div className="es-label mb-2">Заявки</div>
                    {guild.applications
                      .filter((a) => a.incoming)
                      .map((a) => (
                        <div
                          key={a.id}
                          className="es-well mb-1.5 flex items-center justify-between px-3 py-2"
                        >
                          <span className="text-[12px] text-white">
                            {a.name} · {formatFullDigits(a.power)} БМ
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="es-btn es-btn-cyan es-inv-control px-2"
                              onClick={() => setMsg(acceptApplicant(a.id).message)}
                            >
                              Да
                            </button>
                            <button
                              type="button"
                              className="es-btn es-inv-control px-2"
                              onClick={() => declineApplicant(a.id)}
                            >
                              Нет
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : null}
                {manage ? (
                  <div>
                    <div className="es-label mb-2">Пригласить</div>
                    {invitePool.map((h) => (
                      <div
                        key={h.id}
                        className="es-well mb-1.5 flex items-center justify-between px-3 py-2"
                      >
                        <span className="text-[12px] text-white">
                          {h.name} · {formatFullDigits(h.power)} БМ
                        </span>
                        <button
                          type="button"
                          className="es-btn es-inv-control px-2.5"
                          onClick={() => setMsg(inviteToGuild(h).message)}
                        >
                          +
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {msg ? <p className="mt-3 text-[11px] text-white/65">{msg}</p> : null}
        </div>
      </div>
    </div>
  );
}
