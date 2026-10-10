import { highlightRegex, splitByMatch } from "@/lib/translit";

// Renders `text` with every occurrence of the search term `q` marked.
// `lead` is for single-line (truncated) text: when the first match sits
// deeper than `lead` characters, the text is cut to start just before it so
// the match is not hidden behind the ellipsis.
export default function Highlight({ text, q, lead = 0 }) {
  let s = String(text ?? "");
  if (lead > 0 && s.length > lead) {
    const rx = highlightRegex(q);
    const at = rx ? s.search(rx) : -1;
    if (at > lead) s = `…${s.slice(at - lead)}`;
  }
  return splitByMatch(s, q).map((p, i) =>
    p.hit ? (
      <mark
        key={i}
        className="rounded-sm bg-yellow-200 px-0.5 font-semibold text-slate-900"
      >
        {p.text}
      </mark>
    ) : (
      p.text
    )
  );
}
