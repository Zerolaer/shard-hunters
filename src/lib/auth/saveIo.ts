import {
  isUsableSave,
  PROFILE_PERSIST_NAME,
  readActiveSaveRaw,
  writeActiveSaveRaw,
} from "./accounts";

export function exportSaveFilename(hunterName: string) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const safe = hunterName.replace(/[^\p{L}\p{N}-]+/gu, "_").slice(0, 24) || "hunter";
  return `shard-hunters-${safe}-${stamp}.json`;
}

export function downloadActiveSave(hunterName: string) {
  const raw = readActiveSaveRaw(PROFILE_PERSIST_NAME);
  if (!raw || !isUsableSave(raw)) {
    throw new Error("Нет сохранённых данных для экспорта");
  }
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportSaveFilename(hunterName);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseImportedSave(text: string) {
  const parsed = JSON.parse(text) as {
    state?: { character?: { level?: number } };
    character?: { level?: number };
    version?: number;
  };
  if (parsed.state?.character) {
    if (!isUsableSave(text)) throw new Error("Файл сохранения повреждён");
    return text;
  }
  if (parsed.character && typeof parsed.character.level === "number") {
    const wrapped = JSON.stringify({ state: parsed, version: 2 });
    if (!isUsableSave(wrapped)) throw new Error("Файл сохранения повреждён");
    return wrapped;
  }
  throw new Error("Это не сохранение Shard Hunters");
}

export function importActiveSave(text: string) {
  const raw = parseImportedSave(text);
  writeActiveSaveRaw(PROFILE_PERSIST_NAME, raw);
}
