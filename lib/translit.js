// English (Latin) typing -> loose Gujarati regex, so "nimabai" finds "નીમાબાઈ".
// Matching is deliberately forgiving: short/long vowels, ત/ટ, ન/ણ, સ/શ/ષ etc.
// are interchangeable, and a trailing/inherent "a" is optional.

const CONS = {
  kh: "ખ", gh: "ઘ", chh: "છ", ch: "ચ", jh: "ઝ", th: "ટઠતથ", dh: "ડઢદધ",
  ph: "ફ", bh: "ભ", sh: "શષસ", gn: "જ્ઞ", ksh: "ક્ષ", shr: "શ્ર",
  k: "ક", g: "ગ", c: "કચસ", j: "જઝ", t: "ટતઠથ", d: "ડદઢધ", n: "નણ",
  p: "પ", f: "ફ", b: "બ", m: "મ", y: "ય", r: "રૃ", l: "લળ", v: "વ", w: "વ",
  s: "સશષ", h: "હ", z: "ઝજ", x: "ક્ષ", q: "ક",
};
// [after a consonant (matra), standalone/after a vowel (independent)]
const VOW = {
  aa: ["ા", "આ"], ee: ["ીે", "ઈએ"], ii: ["ી", "ઈ"], oo: ["ૂુ", "ઊઉ"],
  uu: ["ૂ", "ઊ"], ai: ["ૈેાિી", "ઐએ"], au: ["ૌોા", "ઔઓ"],
  a: ["ા", "અઆ"], i: ["િી", "ઇઈ"], u: ["ુૂ", "ઉઊ"], e: ["ેૈ", "એઐ"], o: ["ોૌ", "ઓઔ"],
};
const CONS_KEYS = Object.keys(CONS).sort((a, b) => b.length - a.length);
const VOW_KEYS = Object.keys(VOW).sort((a, b) => b.length - a.length);
const MARK = "[ંઁ઼્]?"; // anusvara / chandrabindu / virama, optional between sounds

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function cls(chars) {
  const parts = [...chars];
  // multi-char entries (conjuncts) become alternations, single chars a class
  if (parts.length === 1) return parts[0];
  return `[${parts.join("")}]`;
}

function wordToPattern(word) {
  const w = word.toLowerCase();
  let out = "";
  let prevConsonant = false;
  for (let i = 0; i < w.length; ) {
    const rest = w.slice(i);
    const ck = CONS_KEYS.find((k) => rest.startsWith(k));
    const vk = VOW_KEYS.find((k) => rest.startsWith(k));
    // 'y'/'w' never vowels here; consonants win when both could match
    if (ck && !(vk && VOW_KEYS.includes(vk) && !ck)) {
      const val = CONS[ck];
      // conjunct strings like ક્ષ are literal; otherwise a char class
      out += (/્/.test(val) ? `(?:${val}|${cls([...val.replace(/્/g, "")].join(""))})` : cls(val)) + MARK;
      i += ck.length;
      prevConsonant = true;
    } else if (vk) {
      const [matra, indep] = VOW[vk];
      if (prevConsonant) {
        // after a consonant: matra, or nothing (inherent "a") for a-like sounds
        const inherent = vk === "a" || vk === "aa";
        out += `[${matra}]${inherent ? "?" : ""}`;
      } else {
        out += `[${indep}]`;
      }
      out += MARK;
      i += vk.length;
      prevConsonant = false;
    } else {
      out += escape(rest[0]);
      i += 1;
      prevConsonant = false;
    }
  }
  return out;
}


// Returns a RegExp source for the Latin->Gujarati reading of `q`,
// or null when q has no Latin letters to transliterate.
export function gujaratiPattern(q) {
  if (!/[a-z]/i.test(q)) return null;
  const words = q.trim().split(/\s+/).filter(Boolean);
  return words
    .map((w) => (/[઀-૿]/.test(w) ? escape(w) : wordToPattern(w)))
    .join("\\s+");
}

// Select/dropdown filter: plain substring OR English-typed Gujarati match.
export function matchesText(input, label) {
  const q = String(input || "").trim();
  if (!q) return true;
  const text = String(label || "");
  if (text.toLowerCase().includes(q.toLowerCase())) return true;
  try {
    const src = gujaratiPattern(q);
    return !!src && new RegExp(src).test(text);
  } catch {
    return false;
  }
}
