"use client";

import { useState, useTransition } from "react";
import {
  PRIORITY_OPTIONS,
  REQUEST_TYPE_OPTIONS,
  VIEW_TYPE_OPTIONS,
} from "@/lib/constants";
import type {
  RequestType,
  ViewType,
} from "@/lib/supabase/types";

export type RequestFormDefaults = {
  request_name: string;
  description: string;
  stakeholders_internal: string;  // comma-joined
  stakeholders_external: string;  // comma-joined
  has_hard_deadline: boolean;
  deadline_date: string | null;   // YYYY-MM-DD
  request_type: RequestType | "";
  view_type: ViewType;
  requester_priority: number;
  additional_info: string;
};

export type RequestFormResult =
  | { ok: true; ticketId?: string }
  | { ok: false; error: string };

const EMPTY_DEFAULTS: RequestFormDefaults = {
  request_name: "",
  description: "",
  stakeholders_internal: "",
  stakeholders_external: "",
  has_hard_deadline: false,
  deadline_date: null,
  request_type: "",
  view_type: "aggregated",
  requester_priority: 3,
  additional_info: "",
};

export function RequestForm({
  defaults = EMPTY_DEFAULTS,
  action,
  submitLabel = "Submit request",
  pendingLabel = "Submitting…",
  cancelHref,
}: {
  defaults?: RequestFormDefaults;
  action: (formData: FormData) => Promise<RequestFormResult>;
  submitLabel?: string;
  pendingLabel?: string;
  cancelHref?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [externalStakeholders, setExternalStakeholders] = useState(
    defaults.stakeholders_external,
  );
  const [hasHardDeadline, setHasHardDeadline] = useState<"yes" | "no">(
    defaults.has_hard_deadline ? "yes" : "no",
  );
  const [error, setError] = useState<string | null>(null);

  const isExternal = externalStakeholders.trim().length > 0;

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error);
      }
      // On success, the action redirects.
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <Field label="Request Name" htmlFor="request_name" required>
        <input
          id="request_name"
          name="request_name"
          type="text"
          required
          maxLength={200}
          defaultValue={defaults.request_name}
          className="form-input"
        />
      </Field>

      <Field label="Description of Request" htmlFor="description" required>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          defaultValue={defaults.description}
          className="form-input"
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Internal Stakeholders"
          htmlFor="stakeholders_internal"
          helper="Koda team members. Comma-separated."
        >
          <input
            id="stakeholders_internal"
            name="stakeholders_internal"
            type="text"
            placeholder="e.g. J.R., Ryan"
            defaultValue={defaults.stakeholders_internal}
            className="form-input"
          />
        </Field>

        <Field
          label="External Stakeholders"
          htmlFor="stakeholders_external"
          helper="Clients or outside parties. Comma-separated."
        >
          <input
            id="stakeholders_external"
            name="stakeholders_external"
            type="text"
            placeholder="e.g. Houston Methodist"
            value={externalStakeholders}
            onChange={(e) => setExternalStakeholders(e.target.value)}
            className="form-input"
          />
        </Field>
      </div>

      {isExternal ? (
        <div className="rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100">
          <p className="text-sm font-medium text-blue-900">
            External stakeholder detected
          </p>
          <p className="mt-1 text-xs text-blue-800">
            External requests are scored higher. If there&apos;s a hard deadline,
            it boosts priority further.
          </p>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-slate-800">
              Is there a hard deadline?
            </legend>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="has_hard_deadline"
                  value="no"
                  checked={hasHardDeadline === "no"}
                  onChange={() => setHasHardDeadline("no")}
                />
                No
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="has_hard_deadline"
                  value="yes"
                  checked={hasHardDeadline === "yes"}
                  onChange={() => setHasHardDeadline("yes")}
                />
                Yes
              </label>
            </div>
          </fieldset>

          {hasHardDeadline === "yes" ? (
            <Field label="Deadline date" htmlFor="deadline_date" className="mt-4">
              <input
                id="deadline_date"
                name="deadline_date"
                type="date"
                required
                defaultValue={defaults.deadline_date ?? undefined}
                className="form-input"
              />
            </Field>
          ) : null}
        </div>
      ) : (
        <input type="hidden" name="has_hard_deadline" value="no" />
      )}

      <Field label="Request Type" htmlFor="request_type" required>
        <select
          id="request_type"
          name="request_type"
          required
          defaultValue={defaults.request_type}
          className="form-input"
        >
          <option value="" disabled>
            Choose one…
          </option>
          {REQUEST_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">
          View Type{" "}
          <span className="font-normal text-slate-500">
            — informational data permissions flag
          </span>
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {VIEW_TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer flex-col rounded-lg border border-slate-200 p-3 text-sm has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50"
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="view_type"
                  value={opt.value}
                  required
                  defaultChecked={defaults.view_type === opt.value}
                />
                <span className="font-medium text-slate-900">{opt.label}</span>
              </span>
              <span className="mt-1 ml-6 text-xs text-slate-500">{opt.helper}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Requester Priority"
        htmlFor="requester_priority"
        helper="How important is this to you? (1 = low, 5 = high)"
        required
      >
        <select
          id="requester_priority"
          name="requester_priority"
          required
          defaultValue={String(defaults.requester_priority)}
          className="form-input"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Additional Information"
        htmlFor="additional_info"
        helper="Anything else the data team should know."
      >
        <textarea
          id="additional_info"
          name="additional_info"
          rows={3}
          defaultValue={defaults.additional_info}
          className="form-input"
        />
      </Field>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {cancelHref ? (
          <a
            href={cancelHref}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Cancel
          </a>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  helper,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  helper?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {helper ? <p className="mt-0.5 text-xs text-slate-500">{helper}</p> : null}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
