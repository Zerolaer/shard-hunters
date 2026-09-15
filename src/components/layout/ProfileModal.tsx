"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  AVATARS,
  HUNTER_NAME_MAX,
  resolveAvatarId,
  validateHunterName,
  type AvatarId,
} from "@/lib/game/avatars";
import { useGameStore } from "@/store/useGameStore";
import { AvatarFace } from "./AvatarFace";

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const storedName = useGameStore((s) => s.character.name);
  const storedAvatar = useGameStore((s) => s.character.avatarId);
  const updateProfile = useGameStore((s) => s.updateProfile);
  const [name, setName] = useState(storedName);
  const [avatarId, setAvatarId] = useState<AvatarId>(resolveAvatarId(storedAvatar));
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setName(storedName);
    setAvatarId(resolveAvatarId(storedAvatar));
    setError("");
  }, [open, storedAvatar, storedName]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  function save() {
    const result = updateProfile(name, avatarId);
    if (!result.ok) {
      setError(result.message ?? "Не удалось сохранить");
      return;
    }
    onClose();
  }

  const draft = validateHunterName(name);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Закрыть профиль"
        className="es-modal-scrim absolute inset-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="es-modal relative z-10 w-full max-w-md p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <AvatarFace id={avatarId} size="lg" />
          <div className="min-w-0 flex-1">
            <p id={titleId} className="font-display text-xl font-semibold tracking-tight text-white">
              Профиль охотника
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">Ник и портрет — только здесь</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="es-btn h-9 w-9 shrink-0 p-0"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="es-label mb-2">Портрет</p>
        <div className="mb-5 grid grid-cols-4 gap-2">
          {AVATARS.map((avatar) => {
            const selected = avatar.id === avatarId;
            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => setAvatarId(avatar.id)}
                title={avatar.label}
                aria-pressed={selected}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border bg-zinc-900 px-2 py-2.5",
                  "shadow-[0_8px_16px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]",
                  selected
                    ? "border-amber-400/55 shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_8px_16px_rgba(0,0,0,0.28)]"
                    : "border-white/10 hover:border-violet-300/35",
                )}
              >
                <AvatarFace id={avatar.id} size="sm" className="!shadow-none" />
                <span className="text-[10px] leading-none text-[#a8a29e]">{avatar.label}</span>
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="es-label">Имя охотника</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            maxLength={HUNTER_NAME_MAX}
            autoComplete="nickname"
            autoFocus
            className="es-input mt-1.5 w-full px-3.5 py-3 font-display"
          />
        </label>
        {error ? <p className="mt-2 text-sm text-white/80">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="es-btn px-4 py-2.5">
            Отмена
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!draft.ok}
            className="es-btn es-btn-amber px-4 py-2.5"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
