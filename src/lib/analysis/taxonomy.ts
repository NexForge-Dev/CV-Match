import { escapeRegExp, normalize } from "./text";

/**
 * Skill taxonomy used by the deterministic matcher and the fact guard.
 * `related` lists skills that count as *partial* evidence (e.g. Vue for React).
 * Extend this list to support new sectors — no other code changes are needed.
 */
export interface SkillEntry {
  id: string;
  label: string;
  aliases: string[];
  category: "language" | "frontend" | "backend" | "data" | "cloud" | "devops" | "mobile" | "testing" | "practice" | "design" | "spoken" | "soft" | "security";
  related?: string[];
}

export const SKILLS: SkillEntry[] = [
  // Programming languages
  { id: "javascript", label: "JavaScript", aliases: ["javascript", "js", "ecmascript", "es6"], category: "language", related: ["typescript"] },
  { id: "typescript", label: "TypeScript", aliases: ["typescript", "ts"], category: "language", related: ["javascript"] },
  { id: "python", label: "Python", aliases: ["python", "python3"], category: "language" },
  { id: "java", label: "Java", aliases: ["java"], category: "language", related: ["kotlin"] },
  { id: "kotlin", label: "Kotlin", aliases: ["kotlin"], category: "language", related: ["java"] },
  { id: "csharp", label: "C#", aliases: ["c#", "csharp"], category: "language", related: ["dotnet"] },
  { id: "cpp", label: "C++", aliases: ["c++", "cpp"], category: "language" },
  { id: "go", label: "Go", aliases: ["golang", "go lang"], category: "language" },
  { id: "rust", label: "Rust", aliases: ["rust"], category: "language" },
  { id: "php", label: "PHP", aliases: ["php"], category: "language", related: ["laravel"] },
  { id: "ruby", label: "Ruby", aliases: ["ruby"], category: "language", related: ["rails"] },
  { id: "swift", label: "Swift", aliases: ["swift"], category: "language" },
  { id: "scala", label: "Scala", aliases: ["scala"], category: "language" },
  { id: "r", label: "R", aliases: ["r language", "rstudio"], category: "language" },
  { id: "sql", label: "SQL", aliases: ["sql"], category: "data", related: ["postgresql", "mysql", "sqlserver", "oracle"] },
  { id: "bash", label: "Bash", aliases: ["bash", "shell scripting", "shell"], category: "devops" },
  // Frontend
  { id: "react", label: "React", aliases: ["react", "react.js", "reactjs"], category: "frontend", related: ["nextjs", "vue", "angular", "react-native"] },
  { id: "nextjs", label: "Next.js", aliases: ["next.js", "nextjs"], category: "frontend", related: ["react"] },
  { id: "vue", label: "Vue.js", aliases: ["vue", "vue.js", "vuejs", "nuxt"], category: "frontend", related: ["react", "angular"] },
  { id: "angular", label: "Angular", aliases: ["angular", "angularjs"], category: "frontend", related: ["react", "vue"] },
  { id: "svelte", label: "Svelte", aliases: ["svelte", "sveltekit"], category: "frontend", related: ["react", "vue"] },
  { id: "html", label: "HTML", aliases: ["html", "html5"], category: "frontend" },
  { id: "css", label: "CSS", aliases: ["css", "css3", "sass", "scss", "less"], category: "frontend", related: ["tailwind"] },
  { id: "tailwind", label: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"], category: "frontend", related: ["css"] },
  { id: "redux", label: "Redux", aliases: ["redux", "redux toolkit"], category: "frontend", related: ["react"] },
  // Backend
  { id: "nodejs", label: "Node.js", aliases: ["node", "node.js", "nodejs"], category: "backend", related: ["javascript", "typescript"] },
  { id: "express", label: "Express", aliases: ["express.js", "expressjs"], category: "backend", related: ["nodejs", "nestjs"] },
  { id: "nestjs", label: "NestJS", aliases: ["nestjs", "nest.js"], category: "backend", related: ["nodejs", "express"] },
  { id: "django", label: "Django", aliases: ["django"], category: "backend", related: ["python", "flask", "fastapi"] },
  { id: "flask", label: "Flask", aliases: ["flask"], category: "backend", related: ["python", "django", "fastapi"] },
  { id: "fastapi", label: "FastAPI", aliases: ["fastapi"], category: "backend", related: ["python", "django", "flask"] },
  { id: "spring", label: "Spring", aliases: ["spring boot", "springboot", "spring framework"], category: "backend", related: ["java"] },
  { id: "dotnet", label: ".NET", aliases: [".net", "dotnet", "asp.net", ".net core"], category: "backend", related: ["csharp"] },
  { id: "laravel", label: "Laravel", aliases: ["laravel"], category: "backend", related: ["php"] },
  { id: "rails", label: "Ruby on Rails", aliases: ["rails", "ruby on rails"], category: "backend", related: ["ruby"] },
  { id: "rest", label: "REST APIs", aliases: ["restful", "rest api", "rest apis", "api rest", "apis rest", "apis restful"], category: "backend", related: ["graphql"] },
  { id: "graphql", label: "GraphQL", aliases: ["graphql"], category: "backend", related: ["rest"] },
  { id: "microservices", label: "Microservices", aliases: ["microservices", "microservicos", "microservicios", "micro-services"], category: "backend" },
  // Data
  { id: "postgresql", label: "PostgreSQL", aliases: ["postgresql", "postgres", "psql"], category: "data", related: ["sql", "mysql"] },
  { id: "mysql", label: "MySQL", aliases: ["mysql", "mariadb"], category: "data", related: ["sql", "postgresql"] },
  { id: "sqlserver", label: "SQL Server", aliases: ["sql server", "mssql"], category: "data", related: ["sql"] },
  { id: "oracle", label: "Oracle Database", aliases: ["oracle", "pl/sql", "plsql"], category: "data", related: ["sql"] },
  { id: "mongodb", label: "MongoDB", aliases: ["mongodb", "mongo"], category: "data", related: ["nosql"] },
  { id: "nosql", label: "NoSQL", aliases: ["nosql"], category: "data", related: ["mongodb", "redis", "dynamodb"] },
  { id: "redis", label: "Redis", aliases: ["redis"], category: "data" },
  { id: "dynamodb", label: "DynamoDB", aliases: ["dynamodb"], category: "data", related: ["nosql"] },
  { id: "elasticsearch", label: "Elasticsearch", aliases: ["elasticsearch", "elastic search", "opensearch"], category: "data" },
  { id: "kafka", label: "Kafka", aliases: ["kafka", "apache kafka"], category: "data", related: ["rabbitmq"] },
  { id: "rabbitmq", label: "RabbitMQ", aliases: ["rabbitmq"], category: "data", related: ["kafka"] },
  { id: "spark", label: "Apache Spark", aliases: ["spark", "pyspark", "apache spark"], category: "data" },
  { id: "pandas", label: "pandas", aliases: ["pandas", "numpy"], category: "data", related: ["python"] },
  { id: "ml", label: "Machine Learning", aliases: ["machine learning", "aprendizado de maquina", "aprendizaje automatico", "ml"], category: "data", related: ["deep-learning"] },
  { id: "deep-learning", label: "Deep Learning", aliases: ["deep learning", "pytorch", "tensorflow", "keras"], category: "data", related: ["ml"] },
  { id: "powerbi", label: "Power BI", aliases: ["power bi", "powerbi"], category: "data", related: ["tableau"] },
  { id: "tableau", label: "Tableau", aliases: ["tableau"], category: "data", related: ["powerbi"] },
  { id: "excel", label: "Excel", aliases: ["excel", "microsoft excel"], category: "data" },
  { id: "etl", label: "ETL", aliases: ["etl", "elt", "data pipelines", "pipelines de dados"], category: "data", related: ["airflow"] },
  { id: "airflow", label: "Airflow", aliases: ["airflow", "apache airflow"], category: "data", related: ["etl"] },
  // Cloud & DevOps
  { id: "aws", label: "AWS", aliases: ["aws", "amazon web services", "ec2", "s3", "lambda"], category: "cloud", related: ["gcp", "azure"] },
  { id: "gcp", label: "Google Cloud", aliases: ["gcp", "google cloud", "google cloud platform", "bigquery"], category: "cloud", related: ["aws", "azure"] },
  { id: "azure", label: "Azure", aliases: ["azure", "microsoft azure"], category: "cloud", related: ["aws", "gcp"] },
  { id: "docker", label: "Docker", aliases: ["docker", "containers", "contenedores", "containers docker"], category: "devops", related: ["kubernetes"] },
  { id: "kubernetes", label: "Kubernetes", aliases: ["kubernetes", "k8s", "helm"], category: "devops", related: ["docker"] },
  { id: "terraform", label: "Terraform", aliases: ["terraform", "infrastructure as code", "iac"], category: "devops" },
  { id: "cicd", label: "CI/CD", aliases: ["ci/cd", "ci cd", "continuous integration", "integracao continua", "integracion continua", "github actions", "gitlab ci", "jenkins"], category: "devops" },
  { id: "git", label: "Git", aliases: ["git", "github", "gitlab", "bitbucket"], category: "devops" },
  { id: "linux", label: "Linux", aliases: ["linux", "unix", "ubuntu"], category: "devops" },
  { id: "observability", label: "Observability", aliases: ["observability", "monitoring", "prometheus", "grafana", "datadog", "new relic"], category: "devops" },
  // Mobile
  { id: "react-native", label: "React Native", aliases: ["react native"], category: "mobile", related: ["react", "flutter"] },
  { id: "flutter", label: "Flutter", aliases: ["flutter", "dart"], category: "mobile", related: ["react-native"] },
  { id: "android", label: "Android", aliases: ["android"], category: "mobile", related: ["kotlin"] },
  { id: "ios", label: "iOS", aliases: ["ios"], category: "mobile", related: ["swift"] },
  // Testing & practices
  { id: "testing", label: "Automated testing", aliases: ["unit testing", "unit tests", "testes unitarios", "pruebas unitarias", "jest", "vitest", "pytest", "junit", "tdd", "automated tests", "testes automatizados", "pruebas automatizadas"], category: "testing", related: ["e2e"] },
  { id: "e2e", label: "End-to-end testing", aliases: ["e2e", "end-to-end", "cypress", "playwright", "selenium"], category: "testing", related: ["testing"] },
  { id: "agile", label: "Agile / Scrum", aliases: ["agile", "scrum", "agil", "metodologias ageis", "metodologias agiles"], category: "practice" },
  { id: "security", label: "Application security", aliases: ["owasp", "application security", "appsec", "seguranca da informacao", "ciberseguridad", "cybersecurity"], category: "security" },
  { id: "oauth", label: "OAuth / authentication", aliases: ["oauth", "oauth2", "openid connect", "jwt", "sso"], category: "security" },
  { id: "system-design", label: "System design", aliases: ["system design", "software architecture", "arquitetura de software", "arquitectura de software"], category: "practice", related: ["microservices"] },
  // Design
  { id: "figma", label: "Figma", aliases: ["figma"], category: "design" },
  { id: "ux", label: "UX / UI", aliases: ["ux", "ui/ux", "ux/ui", "user experience", "usability"], category: "design", related: ["figma"] },
  // Spoken languages
  { id: "english", label: "English", aliases: ["english", "ingles", "inglés"], category: "spoken" },
  { id: "spanish", label: "Spanish", aliases: ["spanish", "espanhol", "espanol", "castellano"], category: "spoken" },
  { id: "portuguese", label: "Portuguese", aliases: ["portuguese", "portugues"], category: "spoken" },
  { id: "french", label: "French", aliases: ["french", "frances", "francês"], category: "spoken" },
  { id: "german", label: "German", aliases: ["german", "alemao", "aleman"], category: "spoken" },
  { id: "catalan", label: "Catalan", aliases: ["catalan", "catala", "catalao"], category: "spoken" },
  // Soft skills (often ambiguous to prove from a CV)
  { id: "communication", label: "Communication", aliases: ["communication", "comunicacao", "comunicacion"], category: "soft" },
  { id: "leadership", label: "Leadership", aliases: ["leadership", "lideranca", "liderazgo", "team lead", "tech lead"], category: "soft" },
  { id: "problem-solving", label: "Problem solving", aliases: ["problem solving", "resolucao de problemas", "resolucion de problemas"], category: "soft" },
  { id: "mentoring", label: "Mentoring", aliases: ["mentoring", "mentoria", "mentorship"], category: "soft", related: ["leadership"] },
];

const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

export function getSkill(id: string): SkillEntry | undefined {
  return BY_ID.get(id);
}

/** Normalized aliases of a skill (label included). */
export function skillTerms(skill: SkillEntry): string[] {
  return Array.from(new Set([skill.label, ...skill.aliases].map(normalize)));
}

/** Aliases too ambiguous to match on their own in free text. */
const AMBIGUOUS = new Set(["go", "r"]);

function matchableTerms(skill: SkillEntry): string[] {
  return skillTerms(skill).filter((t) => t.length >= 2 && !AMBIGUOUS.has(t));
}

type Span = { start: number; end: number; skillId: string };

function spansFor(hay: string, skill: SkillEntry): Span[] {
  const spans: Span[] = [];
  for (const term of matchableTerms(skill)) {
    const re = new RegExp(`(^|[^a-z0-9+#.])(${escapeRegExp(term)})(?=$|[^a-z0-9+#])`, "g");
    for (const m of hay.matchAll(re)) {
      const start = m.index! + m[1].length;
      spans.push({ start, end: start + term.length, skillId: skill.id });
    }
  }
  return spans;
}

/**
 * Finds taxonomy skills mentioned in a text. A mention nested inside a longer
 * mention of another skill does not count ("Tailwind CSS" is not "CSS",
 * "React Native" is not "React").
 */
export function findSkills(text: string): SkillEntry[] {
  const hay = normalize(text).replace(/\bhttps?:\/\/\S+/g, " ");
  const all = SKILLS.flatMap((skill) => spansFor(hay, skill));
  const nested = (sp: Span) =>
    all.some((o) => o.skillId !== sp.skillId && o.start <= sp.start && o.end >= sp.end && o.end - o.start > sp.end - sp.start);
  const ids = new Set(all.filter((sp) => !nested(sp)).map((sp) => sp.skillId));
  return SKILLS.filter((s) => ids.has(s.id));
}

/** True when the text mentions the given skill by any of its aliases. */
export function mentionsSkill(text: string, skill: SkillEntry): boolean {
  return findSkills(text).some((s) => s.id === skill.id);
}

/** All normalized terms of every taxonomy skill — used by the fact guard to detect new technologies. */
export function allSkillTerms(): { term: string; skillId: string }[] {
  return SKILLS.flatMap((s) => matchableTerms(s).map((term) => ({ term, skillId: s.id })));
}
