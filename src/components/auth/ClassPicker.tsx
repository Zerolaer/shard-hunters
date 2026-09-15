"use client";

import { CLASS_LIST } from "@/lib/game/classes";
import type { HunterClass } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";

export function ClassPicker() {
  const chooseClass = useGameStore((s) => s.chooseClass);
  const name = useGameStore((s) => s.character.name);
  const level = useGameStore((s) => s.character.level);

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto overflow-x-visible bg-app px-6 py-10">
      <div className="w-full max-w-3xl">
        <p className="font-display text-4xl font-semibold tracking-tight text-white">Выберите класс</p>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-[var(--muted)]">
          {name}, ур. {level}. Броня подходит всем. Оружие и вторичка — только своему классу.
          {level > 1 ? " Прогресс сохранится." : ""}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {CLASS_LIST.map((cls) => (
            <button
              key={cls.id}
              type="button"
              onClick={() => chooseClass(cls.id as HunterClass)}
              className="es-frame p-6 text-left transition hover:border-white/25"
            >
              <div className="font-display text-2xl font-semibold tracking-tight text-white">{cls.name}</div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{cls.blurb}</p>
              <p className="mt-4 text-xs text-[var(--muted)]">
                Оружие: {cls.weaponLabel}
                <br />
                Вторичка: {cls.offhandLabel}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
