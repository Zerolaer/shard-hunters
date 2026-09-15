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
import { formatFullDigits, formatNumber, guildXpToNext } from "@/lib/game/formulas";
import type { GuildJoinMode } from "@/lib/game/types";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { HealthBar } from "@/components/combat/HealthBar";
import { RpChip, RpHead } from "@/components/layout/RightChrome";

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
    <div className="flex flex-col gap-3">
      <div className="rp-card p-4">
        <RpHead icon={Shield} title="Гильдии мира" meta="Вступите или основайте свой орден" />
        {invites.filter((i) => !i.outgoing).length > 0 ? (
          <div className="mt-3 space-y-1.5">
            {invites
              .filter((i) => !i.outgoing)
              .map((inv) => (
                <div key={inv.id} className="rp-inset flex items-center justify-between px-3 py-2">
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
        <div className="mt-3 space-y-2">
          {WORLD_GUILDS.map((g) => {
            const occ = worldGuildOccupancy(g.id);
            const pending = applications.some((a) => a.guildId === g.id && !a.incoming);
            const weak = derived.powerScore < g.minBm;
            return (
              <div key={g.id} className="rp-inset px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display text-[14px] text-white">
                      {g.name} <span className="text-[11px] text-[#8aa0b4]">[{g.tag}]</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#8aa0b4]">{g.motd}</p>
                    <div className="mt-1 text-[10px] text-white/45">
                      {joinModeLabel(g.joinMode)} · {occ}/{g.maxMembers} · от {formatFullDigits(g.minBm)} БМ
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
                    <span className="text-[11px] text-[#6a7c8c]">только инвайт</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rp-card p-4">
        <RpHead icon={Crown} title="Основать гильдию" meta={`${formatNumber(GUILD_CREATE_GOLD)} золота`} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
        </div>
        <input
          value={motd}
          onChange={(e) => setMotd(e.target.value)}
          placeholder="Девиз"
          className="es-input mt-2 h-10 w-full px-3 text-sm"
        />
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
          className="es-btn es-btn-amber mt-3 h-9 px-3"
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
    { id: "home", label: "Обзор", icon: Shield },
    { id: "quests", label: "Задания", icon: Sparkles },
    { id: "boss", label: "Босс", icon: Swords },
    { id: "shop", label: "Магазин", icon: ShoppingBag },
    { id: "skills", label: "Сила", icon: Landmark },
    { id: "people", label: "Состав", icon: Users },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="rp-card p-4">
        <RpHead
          icon={Users}
          title={`${guild.name} [${guild.tag || "—"}]`}
          meta={`ур. ${guild.level} · ${role === "leader" ? "глава" : role === "officer" ? "офицер" : "член"}`}
          action={
            <div className="flex flex-wrap justify-end gap-1.5">
              <RpChip>монеты {formatNumber(guild.coins)}</RpChip>
            </div>
          }
        />
        <div className="mt-3">
          <HealthBar current={guild.xp} max={xpNeed} label="Прогресс" variant="xp" />
        </div>
        {guild.motd ? <p className="mt-2 text-[12px] text-[#8aa0b4]">{guild.motd}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <RpChip>
            <Coins className="h-3.5 w-3.5" />
            {formatNumber(guild.treasuryGold)}
          </RpChip>
          <RpChip>
            <Pickaxe className="h-3.5 w-3.5" />
            {formatNumber(guild.treasuryOre)}
          </RpChip>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            value={goldAmt}
            onChange={(e) => setGoldAmt(Number(e.target.value))}
            className="es-input h-9 w-20 px-2 text-sm"
          />
          <button type="button" onClick={() => donateToGuild("gold", goldAmt)} className="es-btn es-btn-amber es-inv-control px-2.5">
            Золото
          </button>
          <input
            type="number"
            min={1}
            value={oreAmt}
            onChange={(e) => setOreAmt(Number(e.target.value))}
            className="es-input h-9 w-20 px-2 text-sm"
          />
          <button type="button" onClick={() => donateToGuild("ore", oreAmt)} className="es-btn es-btn-cyan es-inv-control px-2.5">
            Руда
          </button>
          <button type="button" onClick={() => setMsg(leaveGuild().message)} className="es-btn es-inv-control ml-auto px-2.5">
            Покинуть
          </button>
        </div>
        {manage ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["open", "request", "invite"] as GuildJoinMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMsg(setJoinMode(m).message)}
                className={cn("es-btn es-inv-control px-2.5", guild.joinMode === m && "es-btn-cyan")}
              >
                {joinModeLabel(m)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/8 bg-black/20 p-1 sm:grid-cols-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSlice(t.id)}
              className={cn("es-btn h-9 text-[11px]", slice === t.id && "es-btn-cyan")}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {slice === "home" ? (
        <div className="rp-card p-4 text-[12px] leading-relaxed text-[#8aa0b4]">
          Монеты гильдии копятся с заданий, босса и дани. Навыки и баффы усиливают персонажа: опыт, дроп, атака, HP.
          {guild.buffs.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {guild.buffs.map((b) => {
                const def = GUILD_BUFFS.find((x) => x.id === b.id);
                return (
                  <RpChip key={b.id}>
                    {def?.name ?? b.id} · {Math.max(0, Math.ceil((b.expiresAt - Date.now()) / 60000))}м
                  </RpChip>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {slice === "quests" ? (
        <div className="space-y-2">
          {guild.quests.map((q) => {
            const def = GUILD_QUESTS.find((d) => d.id === q.defId);
            if (!def) return null;
            const ready = q.progress >= def.target && !q.claimed;
            return (
              <div key={q.defId} className="rp-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-[13px] text-white">{def.name}</div>
                    <p className="mt-0.5 text-[11px] text-[#8aa0b4]">{def.blurb}</p>
                    <p className="mt-1 text-[11px] tabular-nums text-white/55">
                      {Math.min(q.progress, def.target)}/{def.target} · {def.coins} монет
                    </p>
                  </div>
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
        <div className="rp-card p-4">
          <RpHead icon={Swords} title={GUILD_BOSS.name} meta={GUILD_BOSS.blurb} />
          {boss ? (
            <>
              <div className="mt-3">
                <HealthBar current={boss.hp} max={boss.maxHp} variant="enemy" label="HP" />
              </div>
              <button
                type="button"
                disabled={boss.hp <= 0 || strikeWait > 0}
                onClick={() => setMsg(strike().message)}
                className="es-btn es-btn-amber mt-3 h-9 px-3"
              >
                {boss.hp <= 0 ? "Пал сегодня" : strikeWait > 0 ? `Удар через ${Math.ceil(strikeWait / 1000)}с` : "Ударить"}
              </button>
            </>
          ) : (
            <p className="mt-2 text-[12px] text-[#8aa0b4]">Босс появится сегодня.</p>
          )}
        </div>
      ) : null}

      {slice === "shop" ? (
        <div className="space-y-2">
          {GUILD_SHOP.map((item) => (
            <div key={item.id} className="rp-card flex items-center justify-between gap-2 p-3">
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
          <div className="text-[11px] text-[#8aa0b4]">Баффы на час:</div>
          {GUILD_BUFFS.map((b) => (
            <div key={b.id} className="rp-card flex items-center justify-between gap-2 p-3">
              <div>
                <div className="font-display text-[13px] text-white">{b.name}</div>
                <p className="text-[11px] text-[#8aa0b4]">{b.blurb}</p>
              </div>
              <button
                type="button"
                onClick={() => setMsg(activateGuildBuff(b.id).message)}
                className="es-btn es-inv-control shrink-0 px-2.5"
              >
                {b.coins}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {slice === "skills" ? (
        <div className="space-y-2">
          {GUILD_SKILLS.map((sk) => {
            const rank = guild.skillRanks[sk.id] ?? 0;
            return (
              <div key={sk.id} className="rp-card flex items-center justify-between gap-2 p-3">
                <div>
                  <div className="font-display text-[13px] text-white">
                    {sk.name}{" "}
                    <span className="font-sans text-[11px] text-[#8aa0b4]">
                      {rank}/{sk.maxRank}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8aa0b4]">{sk.blurb}</p>
                </div>
                <button
                  type="button"
                  disabled={rank >= sk.maxRank}
                  onClick={() => setMsg(rankGuildSkill(sk.id).message)}
                  className="es-btn es-btn-cyan es-inv-control shrink-0 px-2.5"
                >
                  {rank >= sk.maxRank ? "Макс" : sk.costs[rank]}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {slice === "people" ? (
        <div className="space-y-3">
          <ul className="space-y-1.5">
            {members.map((m) => (
              <li key={m.id} className="rp-inset flex items-center justify-between px-3 py-2.5 text-[13px]">
                <span className={m.isPlayer ? "text-amber" : "text-[#d7e2ec]"}>
                  {m.name}
                  {m.isPlayer ? " (вы)" : ""}
                  <span className="ml-1.5 text-[10px] text-[#6a7c8c]">{m.role ?? "member"}</span>
                </span>
                <span className="font-mono text-[#8aa0b4]">{formatNumber(m.contribution)}</span>
              </li>
            ))}
          </ul>
          {manage && guild.applications.filter((a) => a.incoming).length > 0 ? (
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-white/35">Заявки</div>
              {guild.applications
                .filter((a) => a.incoming)
                .map((a) => (
                  <div key={a.id} className="rp-inset mb-1.5 flex items-center justify-between px-3 py-2">
                    <span className="text-[13px] text-white">
                      {a.name} · {formatFullDigits(a.power)} БМ
                    </span>
                    <div className="flex gap-1">
                      <button type="button" className="es-btn es-btn-cyan es-inv-control px-2" onClick={() => setMsg(acceptApplicant(a.id).message)}>
                        Да
                      </button>
                      <button type="button" className="es-btn es-inv-control px-2" onClick={() => declineApplicant(a.id)}>
                        Нет
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : null}
          {manage ? (
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-white/35">Пригласить охотников</div>
              {invitePool.map((h) => (
                <div key={h.id} className="rp-inset mb-1.5 flex items-center justify-between px-3 py-2">
                  <span className="text-[13px] text-white">
                    {h.name} · {formatFullDigits(h.power)} БМ
                  </span>
                  <button type="button" className="es-btn es-inv-control px-2.5" onClick={() => setMsg(inviteToGuild(h).message)}>
                    Пригласить
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {msg ? <p className="text-[11px] text-white/65">{msg}</p> : null}
    </div>
  );
}
