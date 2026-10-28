import { z } from "zod";
import type { CvData, CvLanguage } from "@/lib/cv/schema";
import type { MatchResult } from "./match";
import type { Requirement } from "./requirements";

export const interviewItemSchema = z.object({
  requirement: z.string().max(200),
  question: z.string().max(500),
  evidence: z.array(z.string().max(400)).max(3),
  tip: z.string().max(800),
});
export type InterviewItem = z.infer<typeof interviewItemSchema>;

export interface ExtrasInput {
  cv: CvData;
  requirements: Requirement[];
  results: MatchResult[];
  language: CvLanguage;
  job: { title: string; company: string };
}

const L = {
  en: {
    greeting: (company: string) => (company ? `Dear ${company} hiring team,` : "Dear hiring team,"),
    intro: (title: string, company: string) => `I am writing to apply for the ${title || "advertised"} position${company ? ` at ${company}` : ""}.`,
    current: (role: string, company: string) => `In my role as ${role}${company ? ` at ${company}` : ""}, my work has included:`,
    skills: (s: string) => `My CV shows hands-on experience with ${s}, which this position asks for.`,
    langs: (s: string) => `I work in ${s}.`,
    closing: "I would welcome the opportunity to discuss how my experience fits your team. Thank you for your time and consideration.",
    regards: "Kind regards,",
    qFound: (r: string) => `Tell me about a concrete situation where you used ${r}. What was your role and what was the outcome?`,
    tFound: "Use the STAR structure (situation, task, action, result) and stick to the facts in your CV. Only mention results you can back up.",
    qPartial: (r: string) => `How does your experience relate to ${r}?`,
    tPartial: "Be honest about what you have done and explain how your related experience transfers. Avoid overstating.",
    qMissing: (r: string) => `This role requires ${r}. How would you get up to speed?`,
    tMissing: "Your CV does not show this. If you have real experience not in the CV, mention it with specifics; otherwise explain your learning plan honestly.",
    qMotivation: (c: string) => `Why do you want to work at ${c || "this company"}, and why this role?`,
    tMotivation: "Connect the job description to what you have actually done and what you want to learn next.",
  },
  pt: {
    greeting: (company: string) => (company ? `Prezada equipe de recrutamento da ${company},` : "Prezada equipe de recrutamento,"),
    intro: (title: string, company: string) => `Escrevo para me candidatar à vaga de ${title || "anunciada"}${company ? ` na ${company}` : ""}.`,
    current: (role: string, company: string) => `Na função de ${role}${company ? ` na ${company}` : ""}, meu trabalho incluiu:`,
    skills: (s: string) => `Meu currículo mostra experiência prática com ${s}, pontos pedidos pela vaga.`,
    langs: (s: string) => `Idiomas: ${s}.`,
    closing: "Terei prazer em conversar sobre como minha experiência pode contribuir com a equipe. Obrigado pela atenção.",
    regards: "Atenciosamente,",
    qFound: (r: string) => `Conte uma situação concreta em que você usou ${r}. Qual foi o seu papel e o resultado?`,
    tFound: "Use a estrutura STAR (situação, tarefa, ação, resultado) e mantenha-se nos fatos do seu currículo. Cite apenas resultados que você consegue comprovar.",
    qPartial: (r: string) => `Como sua experiência se relaciona com ${r}?`,
    tPartial: "Seja honesto sobre o que já fez e explique como a experiência relacionada se aplica. Evite exagerar.",
    qMissing: (r: string) => `A vaga exige ${r}. Como você se prepararia?`,
    tMissing: "Seu currículo não mostra isso. Se você tem experiência real que não está no currículo, cite-a com detalhes; caso contrário, explique seu plano de aprendizado com honestidade.",
    qMotivation: (c: string) => `Por que você quer trabalhar na ${c || "empresa"} e nesta vaga?`,
    tMotivation: "Relacione a descrição da vaga com o que você realmente fez e com o que quer aprender.",
  },
  es: {
    greeting: (company: string) => (company ? `Estimado equipo de selección de ${company}:` : "Estimado equipo de selección:"),
    intro: (title: string, company: string) => `Me dirijo a ustedes para presentar mi candidatura al puesto de ${title || "la oferta publicada"}${company ? ` en ${company}` : ""}.`,
    current: (role: string, company: string) => `En mi puesto de ${role}${company ? ` en ${company}` : ""}, mi trabajo ha incluido:`,
    skills: (s: string) => `Mi currículum muestra experiencia práctica con ${s}, que es lo que pide el puesto.`,
    langs: (s: string) => `Idiomas: ${s}.`,
    closing: "Me encantaría conversar sobre cómo mi experiencia puede encajar en su equipo. Gracias por su tiempo y consideración.",
    regards: "Un saludo cordial,",
    qFound: (r: string) => `Cuéntame una situación concreta en la que usaste ${r}. ¿Cuál fue tu papel y el resultado?`,
    tFound: "Usa la estructura STAR (situación, tarea, acción, resultado) y cíñete a los datos de tu currículum. Menciona solo resultados que puedas demostrar.",
    qPartial: (r: string) => `¿Cómo se relaciona tu experiencia con ${r}?`,
    tPartial: "Sé honesto sobre lo que has hecho y explica cómo se transfiere tu experiencia relacionada. Evita exagerar.",
    qMissing: (r: string) => `El puesto requiere ${r}. ¿Cómo te pondrías al día?`,
    tMissing: "Tu currículum no lo muestra. Si tienes experiencia real que no aparece, menciónala con detalles; si no, explica tu plan de aprendizaje con honestidad.",
    qMotivation: (c: string) => `¿Por qué quieres trabajar en ${c || "la empresa"} y en este puesto?`,
    tMotivation: "Conecta la descripción del puesto con lo que realmente has hecho y lo que quieres aprender.",
  },
} satisfies Record<CvLanguage, unknown>;

export function heuristicCoverLetter(input: ExtrasInput): string {
  const { cv, requirements, results, language, job } = input;
  const t = L[language];
  const byId = new Map(results.map((r) => [r.requirementId, r]));
  const found = requirements.filter((r) => r.category === "skill" && byId.get(r.id)?.status === "found").map((r) => r.label);
  const latest = cv.experiences[0];
  const paragraphs: string[] = [t.greeting(job.company), t.intro(job.title, job.company)];
  if (latest?.title) {
    const bullets = latest.bullets.slice(0, 3).map((b) => `- ${b.replace(/\.$/, "")}`);
    paragraphs.push([t.current(latest.title, latest.company), ...bullets].join("\n"));
  }
  if (found.length) paragraphs.push(t.skills(found.slice(0, 6).join(", ")));
  if (cv.languages.length) paragraphs.push(t.langs(cv.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(", ")));
  paragraphs.push(t.closing);
  paragraphs.push(`${t.regards}\n${cv.contact.fullName}`.trim());
  return paragraphs.join("\n\n");
}

export function heuristicInterviewPrep(input: ExtrasInput): InterviewItem[] {
  const { requirements, results, language, job } = input;
  const t = L[language];
  const byId = new Map(results.map((r) => [r.requirementId, r]));
  const items: InterviewItem[] = [{ requirement: job.title || "—", question: t.qMotivation(job.company), evidence: [], tip: t.tMotivation }];
  const relevant = requirements.filter((r) => r.category !== "other").slice(0, 10);
  for (const req of relevant) {
    const res = byId.get(req.id);
    if (!res || res.status === "ambiguous") continue;
    const evidence = res.evidence.map((e) => e.quote).slice(0, 2);
    if (res.status === "found") items.push({ requirement: req.label, question: t.qFound(req.label), evidence, tip: t.tFound });
    else if (res.status === "partial") items.push({ requirement: req.label, question: t.qPartial(req.label), evidence, tip: t.tPartial });
    else items.push({ requirement: req.label, question: t.qMissing(req.label), evidence: [], tip: t.tMissing });
  }
  return items.slice(0, 12);
}
