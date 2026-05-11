// Block Kit modal payload for the /submit-request slash command.
// One block per form field. block_id matches the corresponding ticket field.

import {
  PRIORITY_OPTIONS,
  REQUEST_TYPE_OPTIONS,
  VIEW_TYPE_OPTIONS,
} from "@/lib/constants";

export const SUBMIT_REQUEST_CALLBACK_ID = "submit_request";

export function buildSubmitRequestView() {
  return {
    type: "modal" as const,
    callback_id: SUBMIT_REQUEST_CALLBACK_ID,
    title: { type: "plain_text" as const, text: "New Data Request" },
    submit: { type: "plain_text" as const, text: "Submit" },
    close: { type: "plain_text" as const, text: "Cancel" },
    blocks: [
      {
        type: "input",
        block_id: "request_name",
        label: { type: "plain_text", text: "Request Name" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          placeholder: { type: "plain_text", text: "Short summary" },
          max_length: 200,
        },
      },
      {
        type: "input",
        block_id: "description",
        label: { type: "plain_text", text: "Description" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "What do you need, and what decision will it inform?",
          },
        },
      },
      {
        type: "input",
        block_id: "stakeholders_internal",
        optional: true,
        label: { type: "plain_text", text: "Internal Stakeholders" },
        hint: { type: "plain_text", text: "Comma-separated Koda team members." },
        element: {
          type: "plain_text_input",
          action_id: "value",
          placeholder: { type: "plain_text", text: "e.g. J.R., Ryan" },
        },
      },
      {
        type: "input",
        block_id: "stakeholders_external",
        optional: true,
        label: { type: "plain_text", text: "External Stakeholders" },
        hint: {
          type: "plain_text",
          text: "Comma-separated. Adding any name marks the request as external (higher priority).",
        },
        element: {
          type: "plain_text_input",
          action_id: "value",
          placeholder: { type: "plain_text", text: "e.g. Houston Methodist" },
        },
      },
      {
        type: "input",
        block_id: "has_hard_deadline",
        optional: true,
        label: { type: "plain_text", text: "Is there a hard deadline?" },
        hint: {
          type: "plain_text",
          text: "Only applied if you added an external stakeholder above.",
        },
        element: {
          type: "radio_buttons",
          action_id: "value",
          initial_option: {
            text: { type: "plain_text", text: "No" },
            value: "no",
          },
          options: [
            { text: { type: "plain_text", text: "No" }, value: "no" },
            { text: { type: "plain_text", text: "Yes" }, value: "yes" },
          ],
        },
      },
      {
        type: "input",
        block_id: "deadline_date",
        optional: true,
        label: { type: "plain_text", text: "Deadline date" },
        hint: {
          type: "plain_text",
          text: "Only used when the deadline question above is Yes.",
        },
        element: {
          type: "datepicker",
          action_id: "value",
        },
      },
      {
        type: "input",
        block_id: "request_type",
        label: { type: "plain_text", text: "Request Type" },
        element: {
          type: "static_select",
          action_id: "value",
          placeholder: { type: "plain_text", text: "Choose one…" },
          options: REQUEST_TYPE_OPTIONS.map((opt) => ({
            text: { type: "plain_text", text: opt.label },
            value: opt.value,
          })),
        },
      },
      {
        type: "input",
        block_id: "view_type",
        label: { type: "plain_text", text: "View Type" },
        hint: {
          type: "plain_text",
          text: "Aggregated = no PHI. Patient Level = row-per-patient (PHI).",
        },
        element: {
          type: "radio_buttons",
          action_id: "value",
          initial_option: {
            text: { type: "plain_text", text: VIEW_TYPE_OPTIONS[0].label },
            value: VIEW_TYPE_OPTIONS[0].value,
          },
          options: VIEW_TYPE_OPTIONS.map((opt) => ({
            text: { type: "plain_text", text: opt.label },
            value: opt.value,
          })),
        },
      },
      {
        type: "input",
        block_id: "requester_priority",
        label: { type: "plain_text", text: "Priority" },
        element: {
          type: "static_select",
          action_id: "value",
          initial_option: {
            text: { type: "plain_text", text: PRIORITY_OPTIONS[2].label },
            value: String(PRIORITY_OPTIONS[2].value),
          },
          options: PRIORITY_OPTIONS.map((opt) => ({
            text: { type: "plain_text", text: opt.label },
            value: String(opt.value),
          })),
        },
      },
      {
        type: "input",
        block_id: "additional_info",
        optional: true,
        label: { type: "plain_text", text: "Additional Information" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          multiline: true,
        },
      },
    ],
  };
}
