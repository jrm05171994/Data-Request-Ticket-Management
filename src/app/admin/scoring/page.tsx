import { redirect } from "next/navigation";

// Users + Scoring merged into the unified Admin page (/admin/settings).
// This redirect keeps any old bookmarks working.
export default function LegacyScoringPage() {
  redirect("/admin/settings#scoring");
}
