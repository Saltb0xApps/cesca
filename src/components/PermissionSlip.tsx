import { useState } from "react";
import { motion } from "framer-motion";
import { PLATFORMS, type Platform } from "../types";

interface PermissionSlipProps {
  onSubmit: (data: { platform: Platform; reason: string; minutes: number }) => void;
}

const PRESETS = [5, 10, 15, 30, 60];

export function PermissionSlip({ onSubmit }: PermissionSlipProps) {
  const [platform, setPlatform] = useState<Platform>("Instagram");
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState(10);

  const canSubmit = reason.trim().length >= 3 && minutes > 0;

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({ platform, reason: reason.trim(), minutes });
      }}
      className="h-full w-full ruled margin-line px-16 pt-10 pb-8 flex flex-col"
    >
      <div className="text-ink/70 uppercase tracking-[0.25em] text-[10px] font-serif">
        Form Nº 04 — Please Complete in Full
      </div>
      <div className="mt-2 font-serif italic text-2xl text-ink leading-tight">
        Request for Permission to Scroll
      </div>

      <div className="mt-6 space-y-5">
        <Field label="I wish to use">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className="ink text-xl bg-transparent border-0 outline-none border-b border-dashed border-ink/40 pb-[2px] pr-6 focus:border-ink"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Because">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="to reply to a friend, to look up a recipe..."
            className="ink text-xl bg-transparent border-0 outline-none w-full leading-[34px]
                       placeholder:text-ink/30"
          />
        </Field>

        <Field label="For">
          <div className="flex items-baseline gap-3 flex-wrap">
            <input
              type="number"
              min={1}
              max={240}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, Math.min(240, Number(e.target.value) || 0)))}
              className="ink text-2xl bg-transparent border-0 outline-none w-16 border-b border-dashed border-ink/40 pb-[2px] focus:border-ink text-center"
            />
            <span className="ink text-xl">minutes</span>
            <div className="flex gap-1.5 ml-auto">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  className={`px-2.5 py-0.5 rounded-full border text-xs font-serif transition
                    ${
                      minutes === m
                        ? "bg-ink text-paper border-ink"
                        : "border-ink/30 text-ink/70 hover:border-ink/60"
                    }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </Field>
      </div>

      <div className="mt-auto pt-4">
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            <div className="text-ink/50 text-[10px] uppercase tracking-[0.25em] font-serif">
              Signature
            </div>
            <div className="h-9 border-b border-ink/50 flex items-end">
              <span className="ink text-2xl leading-none pb-1">— me</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`relative rounded-full px-5 py-2 text-sm font-serif tracking-wider uppercase
              border-2 transition
              ${
                canSubmit
                  ? "bg-ink text-paper border-ink hover:-translate-y-[1px]"
                  : "border-ink/20 text-ink/30 cursor-not-allowed"
              }`}
          >
            Grant Permission
          </button>
        </div>
      </div>
    </motion.form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-ink/60 text-[10px] uppercase tracking-[0.25em] font-serif mb-1">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
