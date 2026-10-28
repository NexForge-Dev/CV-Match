/** Lowercase, strip accents and collapse whitespace. Keeps symbols used by tech names (+ # .). */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[“”"'`´]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(
  (
    // en
    "a an and or the of to in on for with at by from as is are be been was were this that these those it its our your you we they " +
    "will can must should may might have has had do does using use used experience experienced years year plus strong good knowledge " +
    "ability work working team skills skill etc including such like other within across into about over least preferred required " +
    // pt
    "o os as um uma uns umas e ou de do da dos das em no na nos nas para por com sem ao aos que se seu sua seus suas ser sera " +
    "experiencia anos ano conhecimento conhecimentos boa bom forte fortes habilidade habilidades trabalho equipe desejavel " +
    "obrigatorio requisitos requisito diferencial diferenciais vaga atuar atuacao como mais muito " +
    // es
    "el la los las un una unos unas y o de del al en para por con sin que se su sus ser es son experiencia anos ano conocimiento " +
    "conocimientos buen buena fuerte habilidad habilidades trabajo equipo deseable imprescindible requisitos requisito valorable " +
    "puesto como mas muy"
  ).split(/\s+/),
);

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9+#.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-term match that also works for terms containing symbols such as "c++" or ".net". */
export function containsTerm(haystackNormalized: string, termNormalized: string): boolean {
  if (!termNormalized) return false;
  const re = new RegExp(`(^|[^a-z0-9+#.])${escapeRegExp(termNormalized)}(?=$|[^a-z0-9+#])`);
  return re.test(haystackNormalized);
}

export function splitSentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[.;!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇÑ])/)
    .map((s) => s.replace(/^[\s•\-*·▪●◦–—>]+/, "").trim())
    .filter((s) => s.length > 2);
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
