import { useState } from "react";
import { toast } from "sonner";
import type { DocumentPhoto } from "@/lib/domain/types";
import { uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MAX = 4;
const MAX_EDGE = 1280;
const QUALITY = 0.72;

async function compress(file: File): Promise<DocumentPhoto> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  return {
    id: uid("ph"),
    name: file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "фото",
    mime: "image/jpeg",
    dataUrl,
    at: new Date().toISOString(),
  };
}

export function PhotoField({
  value,
  onChange,
  label = "Фотоотчёт",
}: {
  value: DocumentPhoto[];
  onChange: (next: DocumentPhoto[]) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted">{label}</div>
      <p className="mb-2 text-xs text-muted">До {MAX} снимков. Сжимаются на устройстве, в документ уходит JPEG.</p>
      <div className="flex flex-wrap gap-2">
        {value.map((p) => (
          <div key={p.id} className="relative size-20 overflow-hidden rounded-lg border border-border bg-elevated">
            <img src={p.dataUrl} alt={p.name} className="size-full object-cover" />
            <button
              type="button"
              className="absolute top-1 right-1 rounded-md bg-bg/90 px-1.5 text-xs"
              onClick={() => onChange(value.filter((x) => x.id !== p.id))}
            >
              ×
            </button>
          </div>
        ))}
        {value.length < MAX ? (
          <label className="flex size-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
            {busy ? "…" : "+ фото"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                void compress(file)
                  .then((photo) => onChange([...value, photo]))
                  .catch(() => toast.error("Не удалось прочитать снимок"))
                  .finally(() => setBusy(false));
              }}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}

export function PhotoThumbs({ photos }: { photos?: DocumentPhoto[] }) {
  if (!photos?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {photos.map((p) => (
        <a key={p.id} href={p.dataUrl} target="_blank" rel="noreferrer" className="block size-12 overflow-hidden rounded-md border border-border">
          <img src={p.dataUrl} alt={p.name} className="size-full object-cover" />
        </a>
      ))}
    </div>
  );
}
