"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadMatchScreenshot } from "@/lib/api";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";

export function CameraFab({
  clubId,
  onUploaded,
}: {
  clubId: string;
  onUploaded: () => void;
}) {
  const { locale } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      await uploadMatchScreenshot(clubId, file, {});
      onUploaded();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0])}
      />
      <button
        type="button"
        className="pc-fab"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title={t(locale, "matches.upload_screenshot")}
      >
        {busy ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
      </button>
    </>
  );
}
