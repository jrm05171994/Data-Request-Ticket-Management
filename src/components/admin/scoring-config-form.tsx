"use client";

import { useState, useTransition } from "react";
import { updateScoringConfig } from "@/app/actions/scoring";

export type ScoringConfigDefaults = {
  weight_stakeholder: number;
  weight_deadline_bonus: number;
  weight_requester_priority: number;
  weight_request_type: number;
  deadline_tier_7d: number;
  deadline_tier_14d: number;
  deadline_tier_30d: number;
  deadline_tier_30d_plus: number;
};

export function ScoringConfigForm({ defaults }: { defaults: ScoringConfigDefaults }) {
  const [values, setValues] = useState<ScoringConfigDefaults>(defaults);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function bind(key: keyof ScoringConfigDefaults) {
    return {
      name: key,
      value: String(values[key] ?? ""),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        const n = next === "" ? 0 : Number(next);
        setValues((v) => ({ ...v, [key]: Number.isFinite(n) ? n : v[key] }));
      },
    };
  }

  const maxScore =
    values.weight_stakeholder +
    values.deadline_tier_7d +
    values.weight_requester_priority +
    values.weight_request_type;

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateScoringConfig(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedAt(new Date());
    });
  }

  return (
    <form action={onSubmit} className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Component weights
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Each component contributes up to its weight in points. Default sums to 100.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Stakeholder (external = full points, internal = 0)"
            htmlFor="weight_stakeholder"
          >
            <NumberInput id="weight_stakeholder" {...bind("weight_stakeholder")} />
          </Field>
          <Field
            label="Deadline bonus (max — applies on top of stakeholder, external + deadline only)"
            htmlFor="weight_deadline_bonus"
          >
            <NumberInput id="weight_deadline_bonus" {...bind("weight_deadline_bonus")} />
          </Field>
          <Field
            label="Requester priority (scales by 1–5 selection)"
            htmlFor="weight_requester_priority"
          >
            <NumberInput
              id="weight_requester_priority"
              {...bind("weight_requester_priority")}
            />
          </Field>
          <Field
            label="Request type (scales by selected type)"
            htmlFor="weight_request_type"
          >
            <NumberInput id="weight_request_type" {...bind("weight_request_type")} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Deadline tiers
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Bonus points based on days until the external stakeholder&apos;s deadline.
          More urgency = more points.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="≤ 7 days" htmlFor="deadline_tier_7d">
            <NumberInput id="deadline_tier_7d" {...bind("deadline_tier_7d")} />
          </Field>
          <Field label="8–14 days" htmlFor="deadline_tier_14d">
            <NumberInput id="deadline_tier_14d" {...bind("deadline_tier_14d")} />
          </Field>
          <Field label="15–30 days" htmlFor="deadline_tier_30d">
            <NumberInput id="deadline_tier_30d" {...bind("deadline_tier_30d")} />
          </Field>
          <Field label="> 30 days" htmlFor="deadline_tier_30d_plus">
            <NumberInput id="deadline_tier_30d_plus" {...bind("deadline_tier_30d_plus")} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-700">
            Max possible score with these settings
          </span>
          <span className="text-2xl font-semibold tabular-nums text-slate-900">
            {maxScore.toFixed(0)}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          = stakeholder + deadline 7d tier + requester priority + request type.
          {maxScore !== 100 ? (
            <span className="ml-1 text-amber-700">
              ({maxScore > 100 ? "exceeds" : "below"} the default of 100.)
            </span>
          ) : null}
        </p>
      </section>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      {savedAt && !error ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Saved at {savedAt.toLocaleTimeString()}. Every open ticket has been
          rescored and re-ranked.
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Saving triggers a rescore + re-rank across every open ticket automatically.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function NumberInput({
  id,
  name,
  value,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      id={id}
      name={name}
      type="number"
      min={0}
      step="0.01"
      value={value}
      onChange={onChange}
      required
      className="form-input"
    />
  );
}
