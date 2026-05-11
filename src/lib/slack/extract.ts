// Helpers for pulling values out of a Slack view_submission payload.
//
// The shape we read is `payload.view.state.values[block_id][action_id]`.
// Different element types stash their value under different keys, so we
// have one helper per element type.

type StateValues = Record<string, Record<string, ViewElementState>>;
type ViewElementState = {
  type: string;
  value?: string | null;
  selected_option?: { value?: string | null } | null;
  selected_date?: string | null;
};

export function getStateValues(view: unknown): StateValues {
  if (
    typeof view !== "object" ||
    view === null ||
    !("state" in view) ||
    typeof (view as { state: unknown }).state !== "object"
  ) {
    return {};
  }
  const state = (view as { state: { values: unknown } }).state;
  if (
    typeof state !== "object" ||
    state === null ||
    typeof state.values !== "object" ||
    state.values === null
  ) {
    return {};
  }
  return state.values as StateValues;
}

export function getText(values: StateValues, blockId: string): string {
  const v = values[blockId]?.value?.value;
  return typeof v === "string" ? v.trim() : "";
}

export function getSelect(values: StateValues, blockId: string): string | null {
  const v = values[blockId]?.value?.selected_option?.value;
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function getRadio(values: StateValues, blockId: string): string | null {
  return getSelect(values, blockId);
}

export function getDate(values: StateValues, blockId: string): string | null {
  const v = values[blockId]?.value?.selected_date;
  return typeof v === "string" && v.length > 0 ? v : null;
}
