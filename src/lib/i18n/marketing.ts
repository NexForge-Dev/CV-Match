/** Landing page and legal copy. App UI strings live in dictionaries.ts. */

/** Deployment facts that decide whether a paragraph is true: see legalFeatures() in lib/legal.ts. */
export type LegalCondition = "ai" | "noAi" | "storedFiles" | "noStoredFiles" | "turnstile" | "ocr" | "metrics";

export type LegalParagraph = string | { when: LegalCondition; text: string };

export interface LegalSection {
  title: string;
  paragraphs: LegalParagraph[];
  /** Shown instead of the paragraphs that need an operator detail not published yet. */
  pending?: string;
}

const en = {
  nav: { result: "Result", pricing: "Pricing", faq: "FAQ", how: "How it works", login: "Log in", start: "Start free" },
  hero: {
    eyebrow: "CV analysis for tech, graduates and jobs in Brazil or abroad",
    title: "Your CV, aligned with the right job.",
    subtitle:
      "Paste a job description and upload your CV. CV Match checks each requirement against the evidence in your CV, explains what is found, partial or missing, and suggests targeted improvements — without inventing experience, skills, languages or results.",
    primary: "Analyze my first CV",
    secondary: "See how it works",
    note: "First analysis free. No card required.",
  },
  demo: {
    example: "Illustrative example",
    title: "See the analysis flow",
    subtitle: "A simplified example of what you get for every job.",
    cvLabel: "Your CV",
    jobLabel: "Job description",
    resultLabel: "Requirement check",
    cvLines: ["Full Stack Developer — Acme Tech", "Built REST APIs with Node.js and PostgreSQL", "React dashboard for internal teams", "English — C1"],
    jobLines: ["3+ years with React", "Node.js and PostgreSQL", "Experience with Docker", "English C1", "Dynamic environment"],
    statuses: {
      found: "Evidence found",
      partial: "Partial evidence",
      not_found: "Not identified in CV",
      ambiguous: "Ambiguous",
    },
    rows: [
      { label: "Node.js and PostgreSQL", status: "found", note: "“Built REST APIs with Node.js and PostgreSQL”" },
      { label: "3+ years with React", status: "partial", note: "React shown, but dates don't confirm 3 years" },
      { label: "Docker", status: "not_found", note: "Not in your CV — add it only if it's true" },
      { label: "Dynamic environment", status: "ambiguous", note: "Can't be proven from a CV — not scored" },
    ],
    scoreLabel: "Compatibility index",
    scoreNote: "Tool estimate based on your CV text — not a hiring probability.",
  },
  beforeAfter: {
    title: "Improvements that keep your facts intact",
    subtitle: "Every suggestion is checked against your CV. Numbers, technologies and employers that aren't in it are rejected.",
    before: "Before",
    after: "After",
    examples: [
      {
        tag: "Clarity and job terminology",
        before: "Responsible for the development of a reactjs dashboard used by internal teams, etc.",
        after: "Developed a React dashboard used by internal teams",
      },
      {
        tag: "Skills already proven in your experience",
        before: "Skills: JavaScript, TypeScript, Git",
        after: "Skills: React, JavaScript, TypeScript, Git — React was already in your experience, just missing from the list",
      },
    ],
    confirmTag: "Confirm before adding",
    confirmText:
      "The job asks for Docker, which is not identified in your CV. If you really have this experience, describe where and how you used it. Otherwise, leave it out — we never add it for you.",
  },
  principles: [
    { title: "Evidence, not opinion", text: "Each result quotes the line of your CV that supports it." },
    { title: "Nothing is invented", text: "Suggestions that add facts not in your CV are discarded." },
    { title: "You decide", text: "Accept, edit or reject every change. Your original stays intact." },
  ],
  preview: {
    title: "A structured result, not a chat reply",
    subtitle: "This is the result screen of the product: an index with its meaning, the strengths, what is missing and the changes you can accept.",
    label: "Illustrative example",
    note: "Fictional data, shown to present the interface. It is not a real result and does not predict any selection process.",
    strengths: [
      { label: "Node.js and PostgreSQL", must: true },
      { label: "English C1", must: true },
      { label: "TypeScript", must: false },
      { label: "Git", must: false },
    ],
    gaps: [
      { label: "Experience with Docker", must: true, status: "not_found" },
      { label: "3+ years with React", must: true, status: "partial" },
    ],
    suggestion: {
      rationale: "Brings to the top of your summary terms the job asks for and that are already in your CV.",
      current: "Developer focused on web applications and APIs.",
      suggested: "Full stack developer with experience in React, Node.js and PostgreSQL, focused on web applications and APIs.",
    },
  },
  how: {
    title: "How it works",
    steps: [
      { title: "Import your CV", text: "Upload a PDF or DOCX (or paste text). Review and correct what was extracted before continuing." },
      { title: "Add the job", text: "Paste the job description. Company, location, language and link are optional. No scraping needed." },
      { title: "Compatibility analysis", text: "Each requirement is classified as found, partial, not identified or ambiguous, with the evidence quoted from your CV." },
      { title: "Targeted improvements", text: "Summary, skills, bullet rewrites, project order and items to confirm — accept, edit or reject each one." },
      { title: "Review and export", text: "Compare versions, keep your original intact and export a professional PDF or DOCX in PT, ES or EN." },
    ],
  },
  pricing: {
    title: "Simple pricing",
    subtitle: "Prices in Brazilian reais (R$), final prices. Pay per pack or subscribe — cancel anytime.",
    perMonth: "/month",
    perQuarter: "/3 months",
    oneTime: "one-time",
    analyses: (n: number) => `${n} ${n === 1 ? "analysis" : "analyses"}`,
    analysesPerMonth: (n: number) => `${n} analyses per month`,
    analysesPerQuarter: (n: number) => `${n} analyses per 3 months`,
    suggestionsLimited: (n: number) => `Up to ${n} improvement suggestions`,
    suggestionsFull: "All improvement suggestions",
    coverLetter: "Personalized cover letter",
    interview: "Interview preparation",
    export: "PDF and DOCX export",
    cta: { free: "Start free", pack: "Buy pack", subscription: "Go Pro" },
    popular: "Best value",
    disclaimer: "Prices are set by the service and may change; the price shown at checkout applies.",
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      {
        q: "What does the compatibility index mean?",
        a: "It is a 0–100 estimate calculated by the tool from your CV text. Must-have requirements weigh 3 and nice-to-have requirements weigh 1. Each requirement scores 1 if evidence is found, 0.5 if partial and 0 if not identified; ambiguous requirements are excluded. It is not a probability of being hired or invited to interview.",
      },
      {
        q: "Will CV Match invent experience to make my CV fit?",
        a: "No. Suggestions only reorganize and reword what is already in your CV. Any suggestion that introduces numbers, technologies or employers not present in your CV is discarded automatically. Requirements you don't show become “confirm before adding” items that you decide on.",
      },
      {
        q: "Does it guarantee a better ATS score or an interview?",
        a: "No. Each company uses different systems and criteria. We help you present your real experience clearly for a specific job; we don't promise ATS scores, interviews or offers.",
      },
      {
        q: "What happens to my CV and personal data?",
        a: "Original files are not stored by default — we extract the text and discard the file. You can delete documents, analyses, versions or your whole account at any time. Logs never contain CV content.",
      },
      {
        q: "Which languages are supported?",
        a: "The interface is available in Portuguese, Spanish and English, and you can generate and export your CV in any of these three languages.",
      },
      {
        q: "How do payments work?",
        a: "Payments are processed by Stripe, in reais, by card and, when offered at checkout, by Pix or boleto. Packs are one-time purchases of analysis credits. Pro is a monthly or quarterly subscription you can cancel anytime in the customer portal; it stays active until the end of the paid period. You can withdraw from any purchase within 7 days — see the terms of use.",
      },
    ],
  },
  finalCta: {
    title: "Ready to tailor your CV to the next job?",
    text: "Your first analysis is free. Review every change before it goes into your CV.",
    button: "Analyze my first CV",
  },
  footer: {
    product: "Product", legalTitle: "Legal", contact: "Contact",
    tagline: "Honest, evidence-based CV tailoring.",
    privacy: "Privacy policy",
    terms: "Terms of use",
    legal: "Legal notice",
    rights: "All rights reserved.",
  },
  legal: {
    contents: "On this page",
    updated: "Last updated",
    updatedDate: "November 4, 2026",
  },
  legalNotice: {
    title: "Legal notice",
    intro:
      "Information about the supplier of this service, as required by Brazilian Decree 7,962/2013 (e-commerce) and the Consumer Protection Code (Law 8,078/1990).",
    sections: [
      {
        title: "1. Supplier",
        pending: "Supplier identification (name, CPF or CNPJ and physical address): publication pending. Until then, use the contact below for any request.",
        paragraphs: ["Name: {operator}", "{taxLabel}: {taxId}", "Physical address: {address}", "Electronic address and customer service: {email}"],
      },
      {
        title: "2. Purpose",
        paragraphs: [
          "CV Match is an online service that compares CVs with job descriptions and suggests improvements. It is offered in Brazil, with prices in Brazilian reais (R$). Its use is governed by the terms of use and the privacy policy.",
        ],
      },
      {
        title: "3. Purchases and right of withdrawal",
        paragraphs: [
          "Before payment, the checkout shows the plan, the final price in reais, the payment methods available and, for subscriptions, the renewal period.",
          "You may withdraw from a purchase within 7 calendar days of payment (art. 49 of the Consumer Protection Code). The conditions and how to request it are described in section 5 of the terms of use. Requests: {email}.",
        ],
      },
      {
        title: "4. Intellectual property",
        paragraphs: ["The software, design and texts of CV Match belong to the supplier. Content uploaded by users remains theirs."],
      },
    ] as LegalSection[],
  },
  privacy: {
    title: "Privacy policy",
    intro:
      "This policy explains which personal data CV Match processes, why, with whom it is shared and how you can exercise your rights, under the Brazilian General Data Protection Law (LGPD, Law 13,709/2018). The service is offered in Brazil.",
    sections: [
      {
        title: "1. Controller and data protection officer",
        pending: "Controller identification (name, CPF or CNPJ and address): publication pending. Until then, requests are handled through the contact below.",
        paragraphs: [
          "Controller: {operator}",
          "{taxLabel}: {taxId}",
          "Address: {address}",
          "Contact for the data protection officer (encarregado, LGPD art. 41) and channel for data subjects and the ANPD: {email}.",
        ],
      },
      {
        title: "2. Data we process",
        paragraphs: [
          "Registration: name, e-mail address and password (processed by the authentication service), plus the record that you accepted the terms.",
          "Profile: headline, location, locations of interest, sector, language and CV template preferences, and skill bank.",
          "CV: name, type and size of the uploaded file; text extracted from the file or pasted by you; structured data (contact, experience, education, skills, projects, languages and certifications) and the versions you save.",
          "Jobs: title, company, location, link, ad text and identified requirements.",
          "Results: compatibility index, requirement classification, excerpts used as evidence, suggestions and your decisions on them, cover letters, interview preparation and the record of exports (format, template and language).",
          "Billing: plan, credits, subscription status, Stripe customer identifier and acceptance of the terms at purchase. Card, Pix or boleto details are entered on Stripe's payment page and do not pass through our servers.",
          "Usage and technical data: counts of analyses and other actions, used to apply limits. The hosting and authentication infrastructure receives connection data (such as IP address, browser, date and time) when serving each request.",
          { when: "metrics", text: "Internal product metrics: usage events (such as sign-up, login, CV import, analysis, export, choosing, changing or cancelling a plan, amount paid and account deletion), tied to a pseudonymous identifier, without your name, e-mail or any CV or job text. Pseudonymised data is still personal data." },
          { when: "turnstile", text: "Anti-abuse verification: on the login, sign-up and password recovery forms, Cloudflare Turnstile checks technical browser and connection signals to confirm that the request comes from a person." },
          "Sensitive data: we do not ask for or need data such as health, disability, religion, political opinion, union membership or racial or ethnic origin, but a CV may contain it. We recommend removing it unless it is relevant to the job. Whatever is in the submitted text is processed like the rest of the CV.",
          "Third-party data: CVs and job ads may mention other people (references, former managers, colleagues). Include third parties' contact details only if you may share them. This information is used only to provide the service to you, and the person mentioned can reach us at {email}.",
        ],
      },
      {
        title: "3. Purposes and legal bases",
        paragraphs: [
          "Providing the service you request (importing, analysing and improving your CV, generating content, exporting documents and keeping your account): performance of a contract (LGPD art. 7, V).",
          "Processing payments and keeping accounting and tax records: performance of a contract and compliance with a legal obligation (art. 7, V and II).",
          "Keeping the service secure, applying usage limits and preventing fraud and abuse: legitimate interest and performance of a contract (art. 7, IX and V).",
          { when: "metrics", text: "Understanding product use through pseudonymous metrics: legitimate interest (art. 7, IX)." },
          "Defending rights in judicial, administrative or arbitration proceedings: regular exercise of rights (art. 7, VI).",
          "Sensitive data you include in your CV: processed only to provide the service you requested, based on the regular exercise of rights in a contract (art. 11, II, d). You can remove it at any time by editing or deleting the content.",
          "Third-party data mentioned in CVs: legitimate interest (art. 7, IX), limited to the purpose above.",
          "If we ask for consent for a specific purpose, the legal basis will be consent (art. 7, I), which you may revoke at any time.",
        ],
      },
      {
        title: "4. Who we share data with",
        paragraphs: [
          "Supabase: database, authentication and storage, in São Paulo, Brazil (sa-east-1 region).",
          "Vercel: application hosting and technical access records, with the application's functions running in São Paulo, Brazil.",
          "Stripe: payment processing. It receives your e-mail address, internal account identifier, plan and record of acceptance of the terms, plus the details you enter on the payment page.",
          "E-mail provider used by the authentication service: receives your address to send sign-up confirmation and password recovery messages.",
          { when: "noAi", text: "AI providers: your CV is not currently sent to any. Analysis and suggestions are generated by a rule-based engine on the service's servers." },
          { when: "ai", text: "Anthropic (United States): AI provider. It receives the CV and job text to structure documents and write suggestions, cover letters and interview preparation." },
          { when: "turnstile", text: "Cloudflare: anti-bot verification (Turnstile) on the access forms." },
          { when: "ocr", text: "OCR service: receives scanned PDFs to recognise their text." },
          { when: "metrics", text: "Internal NexForge management panel: receives only the pseudonymous events described in section 2." },
          "Public authorities, when required by law or court order.",
          "We do not sell your data, do not use it for advertising and do not send your CV or results to employers or recruiters: you decide who receives them.",
        ],
      },
      {
        title: "5. International transfers",
        paragraphs: [
          "The database and the application's functions are in Brazil, but some providers are foreign companies, mainly from the United States, and may process data outside Brazil. These transfers take place when necessary to perform the contract with you (LGPD art. 33, IX).",
          { when: "ai", text: "CV and job text is sent to the United States whenever an AI feature runs." },
        ],
      },
      {
        title: "6. Retention and deletion",
        paragraphs: [
          { when: "noStoredFiles", text: "Original file: not stored. It is read in memory to extract the text and then discarded; the extracted text is saved in your account." },
          { when: "storedFiles", text: "Original file: kept in private storage. You can delete it in Documents, and a daily routine deletes originals older than {retentionDays} days. The extracted text stays saved in your account." },
          "Extracted text, CVs, versions, jobs, analyses and other content: kept until you delete them or delete your account. There is no automatic deletion for inactivity.",
          "Account deletion: once you confirm, we remove your account and the data linked to it from the service, cancel any active subscription and delete your customer record at Stripe. Charges already made remain recorded at Stripe as tax records.",
          "Copies may remain in infrastructure backups until the end of their retention cycle, and technical records follow each provider's cycle.",
          { when: "metrics", text: "Pseudonymous events already sent to the internal panel are not deleted with the account." },
          "Data needed to comply with a legal obligation or defend rights may be kept for the applicable period (LGPD art. 16).",
        ],
      },
      {
        title: "7. Your rights (LGPD art. 18)",
        paragraphs: [
          "You have the right to: confirmation that we process your data; access; correction of incomplete, inaccurate or outdated data; anonymisation, blocking or deletion of unnecessary or excessive data or data processed unlawfully; portability; deletion of data processed with your consent; information about the entities with which we share data; information about the possibility of not consenting and its consequences; revocation of consent; and objection to processing that does not comply with the law.",
          "In the service itself you can edit your profile and CVs; delete documents, versions, jobs and analyses; download a copy of your data as JSON on the Account page; and delete your account. For anything else, write to {email}. We will reply within the legal deadlines and may ask you to confirm you are the data subject.",
          "You may also file a petition with the National Data Protection Authority (ANPD) or with consumer protection bodies.",
        ],
      },
      {
        title: "8. Automated decisions (LGPD art. 20)",
        paragraphs: [
          "The compatibility index, requirement classification and suggestions are generated automatically. Index criteria: must-have requirements weigh 3 and nice-to-have requirements weigh 1; each requirement scores 1 if evidence is found, 0.5 if partial and 0 if not identified; ambiguous requirements are excluded.",
          "The result is an estimate based on your CV text. It is not a probability of being hired, does not guarantee any outcome in a selection process, is not sent to employers and does not decide hiring.",
          "You can correct your CV, accept, edit or reject each suggestion, and ask for information about the criteria or a review of an automated result at {email}.",
        ],
      },
      {
        title: "9. Cookies",
        paragraphs: [
          "We use only necessary cookies: the authentication service's session cookies (prefix sb-), to keep you logged in, and cvm_locale, which stores the interface language for up to 1 year. We do not use advertising cookies or third-party browser analytics.",
          { when: "turnstile", text: "Cloudflare Turnstile may use its own browser features on the access forms." },
          "The payment page belongs to Stripe, which applies its own cookie policy.",
        ],
      },
      {
        title: "10. Children and adolescents",
        paragraphs: [
          "CV Match is intended for people aged 18 or over. People under 18 should use it only with the participation of a legal guardian, and children should not use it. We do not verify age at sign-up. If you are responsible for a child or adolescent and have found an account, write to {email} to request deletion of the data.",
        ],
      },
      {
        title: "11. Security and incidents",
        paragraphs: [
          "We take technical measures to protect your data: per-user isolation with database access policies, encrypted connections, validation of uploaded files, which are only read and never executed, and application logs without CV content. No system is completely secure, so we cannot promise absolute security.",
          "If a security incident may cause relevant risk or damage to data subjects, we will notify the ANPD and the affected data subjects, as required by LGPD art. 48.",
        ],
      },
      {
        title: "12. Changes to this policy",
        paragraphs: [
          "We may update this policy to reflect changes in the service or the law. The date of the last update appears at the top of the page. Relevant changes will be announced on the site or by e-mail.",
        ],
      },
    ] as LegalSection[],
  },
  terms: {
    title: "Terms of use",
    intro: "These terms govern the use of CV Match. By creating an account or using the service you agree to them and to the privacy policy.",
    sections: [
      {
        title: "1. The service",
        paragraphs: [
          "CV Match analyses the compatibility between your CV and a job description and suggests improvements. The compatibility index is an estimate produced by the tool, not a probability of being hired.",
          { when: "noAi", text: "Analyses, suggestions, cover letters and interview preparation are currently generated by a rule-based engine, without generative AI: wording changes are limited, texts follow templates and CV content is not translated. On export, the chosen language applies to section headings." },
        ],
      },
      {
        title: "2. No guarantee of results",
        paragraphs: [
          "CV Match is a support tool. No result, index or suggestion is a guarantee of a job, interview, offer, success in a selection process or score in applicant tracking systems (ATS). Recruitment decisions belong to each employer.",
        ],
      },
      {
        title: "3. Your responsibility",
        paragraphs: [
          "You are responsible for the truthfulness of your CV and of everything you submit to employers. Automatically generated suggestions must be reviewed by you before use. Do not add skills, experience or results you do not have.",
          "To buy a paid plan you must be 18 or over or be assisted by a legal guardian.",
        ],
      },
      {
        title: "4. Plans, prices and payments",
        paragraphs: [
          "Prices are shown in Brazilian reais (R$) and are final prices. Payments are processed by Stripe, by card and, when offered at checkout, by Pix or boleto.",
          "Plans in this version of the terms: Free, at no cost, with 1 analysis and up to 5 suggestions; pack of 10 analyses, R$ 19,90 as a one-time payment; Pro monthly, R$ 29,90 per month, with 50 analyses per month; Pro quarterly, R$ 69,90 every 3 months, with 150 analyses every 3 months. Paid plans include all suggestions, cover letter and interview preparation. The amount charged is the one shown at checkout before payment.",
          "Analysis packs are one-time purchases of credits that are consumed when an analysis is run, and they do not expire. A credit is returned automatically if an analysis fails for technical reasons.",
          "Pro subscriptions renew at the end of each billing period (monthly or every 3 months) until cancelled. Analyses not used in a period do not carry over to the next. You can cancel at any time in the customer portal, available from the billing page; there are no further charges and access continues until the end of the paid period.",
          "Prices, limits and plan benefits may change; changes do not affect periods or credits already paid. A price change on an active subscription requires prior notice, and you may cancel before it takes effect.",
        ],
      },
      {
        title: "5. Right of withdrawal and refunds",
        paragraphs: [
          "You may withdraw from any purchase within 7 calendar days of payment, without giving a reason (art. 49 of the Consumer Protection Code, Law 8,078/1990, and Decree 7,962/2013).",
          "If no paid analysis (credit) from that purchase has been used, the refund is full. If some have been used, the refund is proportional to the analyses not used.",
          "For subscriptions, the same rule applies to the first charge: within 7 days of it you may withdraw and receive a full refund, or a proportional one if analyses from the subscription have already been used.",
          "To withdraw, send your request to {email}, identifying your account. The refund is made to the original payment method through Stripe, and the refunded credits are removed from your account.",
          "If the law entitles you to a larger refund, the law prevails.",
        ],
      },
      {
        title: "6. Acceptable use",
        paragraphs: [
          "Do not upload content you have no right to use, malicious files, or other people's CVs without their authorisation. Do not attempt to bypass limits, access other users' data or interfere with the service.",
        ],
      },
      {
        title: "7. Your content",
        paragraphs: [
          "You keep all rights to your content. You grant us only the permissions needed to process it to provide the service. You can delete it at any time.",
        ],
      },
      {
        title: "8. Termination and liability",
        paragraphs: [
          "You may delete your account at any time on the Account page. Deletion cancels any active subscription and erases unused credits: if you are still within the withdrawal period, request your refund before deleting the account.",
          "We may suspend accounts for serious breaches of these terms, stating the reason through the account's e-mail address. Suspension does not affect your consumer rights over amounts paid.",
          "Our liability follows Brazilian law. Nothing in these terms excludes or limits the rights guaranteed to you as a consumer by the Consumer Protection Code.",
        ],
      },
      {
        title: "9. Governing law, jurisdiction and support",
        paragraphs: [
          "These terms are governed by the laws of the Federative Republic of Brazil, including the Consumer Protection Code (Law 8,078/1990) and the Marco Civil da Internet (Law 12,965/2014).",
          "Any dispute may be brought before the courts of the consumer's domicile (CDC art. 101, I). Before that, you can contact us at {email} to try to resolve it.",
        ],
      },
    ] as LegalSection[],
  },
};

export type MarketingDict = typeof en;

const pt: MarketingDict = {
  nav: { result: "Resultado", pricing: "Preços", faq: "Dúvidas", how: "Como funciona", login: "Entrar", start: "Começar grátis" },
  hero: {
    eyebrow: "Análise de currículo para tecnologia, recém-formados e vagas no Brasil ou no exterior",
    title: "Seu currículo, alinhado à vaga certa.",
    subtitle:
      "Cole a descrição da vaga e envie seu currículo. O CV Match compara cada requisito com as evidências do seu currículo, explica o que foi encontrado, o que é parcial e o que falta, e sugere melhorias direcionadas — sem inventar experiências, competências, idiomas ou resultados.",
    primary: "Analisar meu primeiro currículo",
    secondary: "Ver como funciona",
    note: "Primeira análise grátis. Sem cartão.",
  },
  demo: {
    example: "Exemplo ilustrativo",
    title: "Veja o fluxo da análise",
    subtitle: "Um exemplo simplificado do que você recebe para cada vaga.",
    cvLabel: "Seu currículo",
    jobLabel: "Descrição da vaga",
    resultLabel: "Verificação de requisitos",
    cvLines: ["Desenvolvedora Full Stack — Acme Tech", "APIs REST com Node.js e PostgreSQL", "Dashboard em React para equipes internas", "Inglês — C1"],
    jobLines: ["3+ anos com React", "Node.js e PostgreSQL", "Experiência com Docker", "Inglês C1", "Ambiente dinâmico"],
    statuses: {
      found: "Evidência encontrada",
      partial: "Evidência parcial",
      not_found: "Não identificado no currículo",
      ambiguous: "Ambíguo",
    },
    rows: [
      { label: "Node.js e PostgreSQL", status: "found", note: "“APIs REST com Node.js e PostgreSQL”" },
      { label: "3+ anos com React", status: "partial", note: "React aparece, mas as datas não confirmam 3 anos" },
      { label: "Docker", status: "not_found", note: "Não está no currículo — inclua só se for verdade" },
      { label: "Ambiente dinâmico", status: "ambiguous", note: "Não dá para comprovar por currículo — fora da nota" },
    ],
    scoreLabel: "Índice de compatibilidade",
    scoreNote: "Estimativa da ferramenta com base no texto do currículo — não é probabilidade de contratação.",
  },
  beforeAfter: {
    title: "Melhorias que preservam seus fatos",
    subtitle: "Cada sugestão é verificada contra o seu currículo. Números, tecnologias e empresas que não estão nele são rejeitados.",
    before: "Antes",
    after: "Depois",
    examples: [
      {
        tag: "Clareza e terminologia da vaga",
        before: "Responsável pelo desenvolvimento de um dashboard em reactjs usado por equipes internas, etc.",
        after: "Desenvolvimento de um dashboard em React usado por equipes internas",
      },
      {
        tag: "Competências já comprovadas na experiência",
        before: "Competências: JavaScript, TypeScript, Git",
        after: "Competências: React, JavaScript, TypeScript, Git — React já estava na sua experiência, só faltava na lista",
      },
    ],
    confirmTag: "Confirme antes de incluir",
    confirmText:
      "A vaga pede Docker, que não foi identificado no seu currículo. Se você realmente tem essa experiência, descreva onde e como usou. Caso contrário, não inclua — nunca adicionamos isso por você.",
  },
  principles: [
    { title: "Evidência, não opinião", text: "Cada resultado cita o trecho do seu currículo que o sustenta." },
    { title: "Nada é inventado", text: "Sugestões que acrescentam fatos fora do seu currículo são descartadas." },
    { title: "Você decide", text: "Aceite, edite ou rejeite cada mudança. Seu original permanece intacto." },
  ],
  preview: {
    title: "Um resultado estruturado, não uma resposta de chat",
    subtitle: "Esta é a tela de resultado do produto: um índice com seu significado, os pontos fortes, o que falta e as mudanças que você pode aceitar.",
    label: "Exemplo ilustrativo",
    note: "Dados fictícios, usados para apresentar a interface. Não é um resultado real e não prevê nenhum processo seletivo.",
    strengths: [
      { label: "Node.js e PostgreSQL", must: true },
      { label: "Inglês C1", must: true },
      { label: "TypeScript", must: false },
      { label: "Git", must: false },
    ],
    gaps: [
      { label: "Experiência com Docker", must: true, status: "not_found" },
      { label: "3+ anos com React", must: true, status: "partial" },
    ],
    suggestion: {
      rationale: "Traz para o início do resumo termos que a vaga pede e que já estão no seu currículo.",
      current: "Desenvolvedora focada em aplicações web e APIs.",
      suggested: "Desenvolvedora full stack com experiência em React, Node.js e PostgreSQL, focada em aplicações web e APIs.",
    },
  },
  how: {
    title: "Como funciona",
    steps: [
      { title: "Importe o currículo", text: "Envie PDF ou DOCX (ou cole o texto). Revise e corrija o que foi extraído antes de seguir." },
      { title: "Informe a vaga", text: "Cole a descrição da vaga. Empresa, local, idioma e link são opcionais. Nada de scraping." },
      { title: "Análise de compatibilidade", text: "Cada requisito é classificado como encontrado, parcial, não identificado ou ambíguo, com a evidência citada do seu currículo." },
      { title: "Melhorias direcionadas", text: "Resumo, competências, reescrita de experiências, ordem dos projetos e itens a confirmar — aceite, edite ou rejeite cada um." },
      { title: "Revise e exporte", text: "Compare versões, mantenha o original intacto e exporte PDF ou DOCX profissional em PT, ES ou EN." },
    ],
  },
  pricing: {
    title: "Preços simples",
    subtitle: "Valores em reais (R$), preço final. Compre um pacote ou assine — cancele quando quiser.",
    perMonth: "/mês",
    perQuarter: "/3 meses",
    oneTime: "pagamento único",
    analyses: (n: number) => `${n} ${n === 1 ? "análise" : "análises"}`,
    analysesPerMonth: (n: number) => `${n} análises por mês`,
    analysesPerQuarter: (n: number) => `${n} análises a cada 3 meses`,
    suggestionsLimited: (n: number) => `Até ${n} sugestões de melhoria`,
    suggestionsFull: "Todas as sugestões de melhoria",
    coverLetter: "Carta de apresentação personalizada",
    interview: "Preparação para entrevista",
    export: "Exportação em PDF e DOCX",
    cta: { free: "Começar grátis", pack: "Comprar pacote", subscription: "Assinar Pro" },
    popular: "Melhor custo-benefício",
    disclaimer: "Os preços são definidos pelo serviço e podem mudar; vale o preço exibido no checkout.",
  },
  faq: {
    title: "Perguntas frequentes",
    items: [
      {
        q: "O que significa o índice de compatibilidade?",
        a: "É uma estimativa de 0 a 100 calculada pela ferramenta a partir do texto do seu currículo. Requisitos obrigatórios têm peso 3 e desejáveis, peso 1. Cada requisito vale 1 se houver evidência, 0,5 se parcial e 0 se não identificado; requisitos ambíguos ficam de fora. Não é a probabilidade de ser contratado ou chamado para entrevista.",
      },
      {
        q: "O CV Match inventa experiência para encaixar o currículo?",
        a: "Não. As sugestões apenas reorganizam e reescrevem o que já está no seu currículo. Qualquer sugestão que introduza números, tecnologias ou empresas ausentes do currículo é descartada automaticamente. Requisitos que você não comprova viram itens “confirme antes de incluir”, e a decisão é sua.",
      },
      {
        q: "Garante pontuação melhor em ATS ou entrevista?",
        a: "Não. Cada empresa usa sistemas e critérios diferentes. Ajudamos você a apresentar sua experiência real com clareza para uma vaga específica; não prometemos pontuação em ATS, entrevistas ou ofertas.",
      },
      {
        q: "O que acontece com meu currículo e meus dados?",
        a: "Por padrão, os arquivos originais não são armazenados — extraímos o texto e descartamos o arquivo. Você pode excluir documentos, análises, versões ou a conta inteira a qualquer momento. Os registros (logs) nunca contêm o conteúdo do currículo.",
      },
      {
        q: "Quais idiomas são suportados?",
        a: "A interface está em português, espanhol e inglês, e você pode gerar e exportar o currículo em qualquer um desses três idiomas.",
      },
      {
        q: "Como funcionam os pagamentos?",
        a: "Os pagamentos são processados pela Stripe, em reais, por cartão e, quando oferecidos no checkout, por Pix ou boleto. Pacotes são compras únicas de créditos de análise. O Pro é uma assinatura mensal ou trimestral que pode ser cancelada a qualquer momento no portal do cliente; ela continua ativa até o fim do período pago. Você pode desistir de qualquer compra em até 7 dias — veja os termos de uso.",
      },
    ],
  },
  finalCta: {
    title: "Pronto para adaptar seu currículo à próxima vaga?",
    text: "A primeira análise é grátis. Revise cada mudança antes que ela entre no seu currículo.",
    button: "Analisar meu primeiro currículo",
  },
  footer: {
    product: "Produto", legalTitle: "Legal", contact: "Contato",
    tagline: "Adaptação de currículo honesta e baseada em evidências.",
    privacy: "Política de privacidade",
    terms: "Termos de uso",
    legal: "Informações legais",
    rights: "Todos os direitos reservados.",
  },
  legal: {
    contents: "Nesta página",
    updated: "Última atualização",
    updatedDate: "04/11/2026",
  },
  legalNotice: {
    title: "Informações legais",
    intro:
      "Informações sobre o fornecedor deste serviço, conforme o Decreto nº 7.962/2013 (comércio eletrônico) e o Código de Defesa do Consumidor (Lei nº 8.078/1990).",
    sections: [
      {
        title: "1. Fornecedor",
        pending: "Identificação do fornecedor (nome, CPF ou CNPJ e endereço físico): publicação pendente. Até lá, use o contato abaixo para qualquer solicitação.",
        paragraphs: ["Nome: {operator}", "{taxLabel}: {taxId}", "Endereço físico: {address}", "Endereço eletrônico e atendimento: {email}"],
      },
      {
        title: "2. Finalidade",
        paragraphs: [
          "O CV Match é um serviço online que compara currículos com descrições de vagas e sugere melhorias. É oferecido no Brasil, com preços em reais (R$). O uso é regido pelos termos de uso e pela política de privacidade.",
        ],
      },
      {
        title: "3. Contratação e direito de arrependimento",
        paragraphs: [
          "Antes do pagamento, o checkout mostra o plano, o preço final em reais, as formas de pagamento disponíveis e, nas assinaturas, a periodicidade da renovação.",
          "Você pode desistir da compra em até 7 dias corridos a contar do pagamento (art. 49 do Código de Defesa do Consumidor). As condições e a forma de pedir estão na seção 5 dos termos de uso. Solicitações: {email}.",
        ],
      },
      {
        title: "4. Propriedade intelectual",
        paragraphs: ["O software, o design e os textos do CV Match pertencem ao fornecedor. O conteúdo enviado pelos usuários continua sendo deles."],
      },
    ],
  },
  privacy: {
    title: "Política de privacidade",
    intro:
      "Esta política explica quais dados pessoais o CV Match trata, para quê, com quem os compartilha e como você exerce seus direitos, nos termos da Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018). O serviço é oferecido no Brasil.",
    sections: [
      {
        title: "1. Controlador e encarregado",
        pending: "Identificação do controlador (nome, CPF ou CNPJ e endereço): publicação pendente. Até lá, o atendimento é feito pelo contato abaixo.",
        paragraphs: [
          "Controlador: {operator}",
          "{taxLabel}: {taxId}",
          "Endereço: {address}",
          "Contato do encarregado pelo tratamento de dados pessoais (art. 41 da LGPD) e canal para titulares e para a ANPD: {email}.",
        ],
      },
      {
        title: "2. Dados que tratamos",
        paragraphs: [
          "Cadastro: nome, e-mail e senha (processada pelo serviço de autenticação), além do registro de aceite dos termos.",
          "Perfil: título profissional, localização, locais de interesse, setor, preferências de idioma e de modelo de currículo e banco de competências.",
          "Currículo: nome, tipo e tamanho do arquivo enviado; texto extraído do arquivo ou colado por você; dados estruturados (contato, experiências, formação, competências, projetos, idiomas e certificações) e as versões que você salva.",
          "Vagas: título, empresa, local, link, texto do anúncio e requisitos identificados.",
          "Resultados: índice de compatibilidade, classificação dos requisitos, trechos usados como evidência, sugestões e suas decisões sobre elas, cartas de apresentação, preparação para entrevista e o registro das exportações (formato, modelo e idioma).",
          "Cobrança: plano, créditos, status da assinatura, identificador de cliente na Stripe e aceite dos termos na compra. Dados de cartão, Pix ou boleto são informados na página de pagamento da Stripe e não passam pelos nossos servidores.",
          "Uso e dados técnicos: contagem de análises e outras ações, usadas para aplicar limites. A infraestrutura de hospedagem e de autenticação recebe dados de conexão (como endereço IP, navegador, data e hora) ao atender cada acesso.",
          { when: "metrics", text: "Métricas internas do produto: eventos de uso (como cadastro, login, importação de currículo, análise, exportação, escolha, mudança ou cancelamento de plano, valor pago e exclusão de conta), ligados a um identificador pseudonimizado, sem nome, e-mail, texto de currículo ou de vaga. Dado pseudonimizado continua sendo dado pessoal." },
          { when: "turnstile", text: "Verificação contra abusos: nos formulários de login, cadastro e recuperação de senha, o Cloudflare Turnstile analisa sinais técnicos do navegador e da conexão para confirmar que a solicitação vem de uma pessoa." },
          "Dados sensíveis: não pedimos nem precisamos de dados como saúde, deficiência, religião, opinião política, filiação sindical ou origem racial ou étnica, mas um currículo pode contê-los. Recomendamos retirá-los, a menos que sejam relevantes para a vaga. O que estiver no texto enviado é tratado como o restante do currículo.",
          "Dados de terceiros: currículos e vagas podem citar outras pessoas (referências, ex-gestores, colegas). Inclua contatos de terceiros apenas se puder compartilhá-los. Essas informações são usadas somente para prestar o serviço a você, e a pessoa citada pode nos procurar pelo contato {email}.",
        ],
      },
      {
        title: "3. Finalidades e bases legais",
        paragraphs: [
          "Prestar o serviço que você pede (importar, analisar e melhorar o currículo, gerar conteúdos, exportar documentos e manter sua conta): execução de contrato (art. 7º, V, da LGPD).",
          "Processar pagamentos e manter registros contábeis e fiscais: execução de contrato e cumprimento de obrigação legal (art. 7º, V e II).",
          "Garantir a segurança, aplicar limites de uso e prevenir fraudes e abusos: legítimo interesse e execução de contrato (art. 7º, IX e V).",
          { when: "metrics", text: "Entender o uso do produto por métricas pseudonimizadas: legítimo interesse (art. 7º, IX)." },
          "Defender direitos em processos judiciais, administrativos ou arbitrais: exercício regular de direitos (art. 7º, VI).",
          "Dados sensíveis que você incluir no currículo: tratados apenas para prestar o serviço que você pediu, com base no exercício regular de direitos em contrato (art. 11, II, d). Você pode removê-los a qualquer momento editando ou excluindo o conteúdo.",
          "Dados de terceiros citados em currículos: legítimo interesse (art. 7º, IX), limitado à finalidade acima.",
          "Se pedirmos consentimento para uma finalidade específica, a base será o consentimento (art. 7º, I), que você poderá revogar a qualquer momento.",
        ],
      },
      {
        title: "4. Com quem compartilhamos",
        paragraphs: [
          "Supabase: banco de dados, autenticação e armazenamento, em São Paulo, Brasil (região sa-east-1).",
          "Vercel: hospedagem da aplicação e registros técnicos de acesso, com as funções da aplicação executadas em São Paulo, Brasil.",
          "Stripe: processamento de pagamentos. Recebe seu e-mail, identificador interno da conta, plano e registro de aceite dos termos, além dos dados que você informar na página de pagamento.",
          "Provedor de e-mail usado pelo serviço de autenticação: recebe seu endereço para enviar confirmação de cadastro e recuperação de senha.",
          { when: "noAi", text: "Provedores de IA: hoje o seu currículo não é enviado a nenhum. A análise e as sugestões são geradas por um motor de regras nos servidores do serviço." },
          { when: "ai", text: "Anthropic (Estados Unidos): provedor de IA. Recebe o texto do currículo e da vaga para estruturar documentos e redigir sugestões, cartas e preparação para entrevista." },
          { when: "turnstile", text: "Cloudflare: verificação anti-bot (Turnstile) nos formulários de acesso." },
          { when: "ocr", text: "Serviço de OCR: recebe PDFs digitalizados para reconhecer o texto." },
          { when: "metrics", text: "Painel interno de gestão NexForge: recebe apenas os eventos pseudonimizados descritos na seção 2." },
          "Autoridades públicas, quando houver obrigação legal ou ordem judicial.",
          "Não vendemos seus dados, não os usamos para publicidade e não enviamos seu currículo ou seus resultados a empregadores ou recrutadores: é você quem decide para quem enviar.",
        ],
      },
      {
        title: "5. Transferência internacional",
        paragraphs: [
          "O banco de dados e as funções da aplicação ficam no Brasil, mas alguns fornecedores são empresas estrangeiras, principalmente dos Estados Unidos, e podem tratar dados fora do Brasil. Essas transferências ocorrem quando necessárias para executar o contrato com você (art. 33, IX, da LGPD).",
          { when: "ai", text: "O texto do currículo e da vaga é enviado aos Estados Unidos sempre que um recurso de IA é executado." },
        ],
      },
      {
        title: "6. Retenção e exclusão",
        paragraphs: [
          { when: "noStoredFiles", text: "Arquivo original: não é guardado. Ele é lido em memória para extrair o texto e depois descartado; o texto extraído fica salvo na sua conta." },
          { when: "storedFiles", text: "Arquivo original: fica em armazenamento privado. Você pode excluí-lo em Documentos, e uma rotina diária apaga os originais com mais de {retentionDays} dias. O texto extraído continua salvo na sua conta." },
          "Texto extraído, currículos, versões, vagas, análises e demais conteúdos: ficam guardados até você excluí-los ou excluir a conta. Não há exclusão automática por inatividade.",
          "Exclusão da conta: ao confirmar, removemos sua conta e os dados ligados a ela do serviço, cancelamos a assinatura ativa e excluímos seu cadastro de cliente na Stripe. As cobranças já realizadas continuam registradas na Stripe, como registros fiscais.",
          "Cópias podem permanecer em backups da infraestrutura até o fim do ciclo de retenção deles, e os registros técnicos seguem o ciclo dos respectivos fornecedores.",
          { when: "metrics", text: "Eventos pseudonimizados já enviados ao painel interno não são apagados com a conta." },
          "Dados necessários para cumprir obrigação legal ou defender direitos podem ser mantidos pelo prazo aplicável (art. 16 da LGPD).",
        ],
      },
      {
        title: "7. Seus direitos (art. 18 da LGPD)",
        paragraphs: [
          "Você tem direito a: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos, inexatos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei; portabilidade; eliminação dos dados tratados com seu consentimento; informação sobre as entidades com as quais compartilhamos dados; informação sobre a possibilidade de não consentir e suas consequências; revogação do consentimento; e oposição a tratamento em desconformidade com a lei.",
          "No próprio serviço você pode editar perfil e currículos; excluir documentos, versões, vagas e análises; baixar uma cópia dos seus dados em formato JSON na página Conta; e excluir a conta. Para o restante, escreva para {email}. Responderemos nos prazos legais e poderemos pedir confirmação de que você é o titular.",
          "Você também pode peticionar à Autoridade Nacional de Proteção de Dados (ANPD) ou aos órgãos de defesa do consumidor.",
        ],
      },
      {
        title: "8. Decisões automatizadas (art. 20 da LGPD)",
        paragraphs: [
          "O índice de compatibilidade, a classificação dos requisitos e as sugestões são gerados automaticamente. Critérios do índice: requisitos obrigatórios têm peso 3 e desejáveis, peso 1; cada requisito vale 1 se houver evidência, 0,5 se parcial e 0 se não identificado; requisitos ambíguos ficam de fora.",
          "O resultado é uma estimativa feita a partir do texto do currículo. Não é a probabilidade de contratação, não garante nenhum resultado em processos seletivos, não é enviado a empregadores e não decide contratação.",
          "Você pode corrigir o currículo, aceitar, editar ou rejeitar cada sugestão, e pedir informações sobre os critérios ou a revisão de um resultado automatizado por {email}.",
        ],
      },
      {
        title: "9. Cookies",
        paragraphs: [
          "Usamos apenas cookies necessários: os de sessão do serviço de autenticação (prefixo sb-), para manter você conectado, e o cvm_locale, que guarda o idioma da interface por até 1 ano. Não usamos cookies de publicidade nem ferramentas de analytics de terceiros no navegador.",
          { when: "turnstile", text: "O Cloudflare Turnstile pode usar recursos próprios do navegador nos formulários de acesso." },
          "A página de pagamento pertence à Stripe, que aplica sua própria política de cookies.",
        ],
      },
      {
        title: "10. Crianças e adolescentes",
        paragraphs: [
          "O CV Match é destinado a maiores de 18 anos. Pessoas com menos de 18 anos só devem usá-lo com a participação do responsável legal, e crianças não devem usá-lo. Não verificamos a idade no cadastro. Se você é responsável por uma criança ou adolescente e identificou uma conta, escreva para {email} para pedirmos a exclusão dos dados.",
        ],
      },
      {
        title: "11. Segurança e incidentes",
        paragraphs: [
          "Adotamos medidas técnicas para proteger seus dados: isolamento por usuário com políticas de acesso no banco de dados, conexões criptografadas, validação dos arquivos enviados, que são apenas lidos e nunca executados, e registros da aplicação sem o conteúdo do currículo. Nenhum sistema é totalmente seguro, por isso não podemos prometer segurança absoluta.",
          "Se ocorrer um incidente de segurança que possa acarretar risco ou dano relevante aos titulares, comunicaremos a ANPD e os titulares afetados, conforme o art. 48 da LGPD.",
        ],
      },
      {
        title: "12. Alterações desta política",
        paragraphs: [
          "Podemos atualizar esta política para refletir mudanças no serviço ou na lei. A data da última atualização aparece no topo da página. Mudanças relevantes serão informadas no site ou por e-mail.",
        ],
      },
    ],
  },
  terms: {
    title: "Termos de uso",
    intro: "Estes termos regem o uso do CV Match. Ao criar uma conta ou usar o serviço, você concorda com eles e com a política de privacidade.",
    sections: [
      {
        title: "1. O serviço",
        paragraphs: [
          "O CV Match analisa a compatibilidade entre seu currículo e uma descrição de vaga e sugere melhorias. O índice de compatibilidade é uma estimativa da ferramenta, não uma probabilidade de contratação.",
          { when: "noAi", text: "Hoje as análises, sugestões, cartas e preparações para entrevista são geradas por um motor de regras, sem IA generativa: as mudanças de redação são pontuais, os textos seguem modelos e o conteúdo do currículo não é traduzido. Na exportação, o idioma escolhido se aplica aos títulos das seções." },
        ],
      },
      {
        title: "2. Sem garantias de resultado",
        paragraphs: [
          "O CV Match é uma ferramenta de apoio. Nenhum resultado, índice ou sugestão é garantia de emprego, entrevista, oferta, aprovação em processo seletivo ou pontuação em sistemas de recrutamento (ATS). As decisões de seleção pertencem a cada empregador.",
        ],
      },
      {
        title: "3. Sua responsabilidade",
        paragraphs: [
          "Você é responsável pela veracidade do seu currículo e de tudo o que enviar a empregadores. As sugestões geradas automaticamente devem ser revisadas por você antes do uso. Não inclua competências, experiências ou resultados que você não tem.",
          "Para contratar planos pagos, você precisa ter 18 anos ou mais ou estar assistido pelo responsável legal.",
        ],
      },
      {
        title: "4. Planos, preços e pagamentos",
        paragraphs: [
          "Os preços são exibidos em reais (R$) e são preços finais. Os pagamentos são processados pela Stripe, por cartão e, quando oferecidos no checkout, por Pix ou boleto.",
          "Planos nesta versão dos termos: Grátis, sem custo, com 1 análise e até 5 sugestões; Pacote 10 análises, R$ 19,90 em pagamento único; Pro mensal, R$ 29,90 por mês, com 50 análises por mês; Pro trimestral, R$ 69,90 a cada 3 meses, com 150 análises a cada 3 meses. Os planos pagos incluem todas as sugestões, carta de apresentação e preparação para entrevista. O valor cobrado é o exibido no checkout antes do pagamento.",
          "Pacotes de análises são compras únicas de créditos, consumidos quando uma análise é executada, e não têm prazo de validade. O crédito é devolvido automaticamente se uma análise falhar por motivo técnico.",
          "A assinatura Pro renova ao fim de cada período (mensal ou a cada 3 meses) até ser cancelada. As análises não usadas no período não passam para o seguinte. Você pode cancelar a qualquer momento no portal do cliente, acessível pela página de cobrança; não há novas cobranças e o acesso continua até o fim do período pago.",
          "Preços, limites e benefícios dos planos podem mudar; as mudanças não afetam períodos ou créditos já pagos. Uma alteração de preço de assinatura ativa exige aviso prévio, e você poderá cancelar antes que ela passe a valer.",
        ],
      },
      {
        title: "5. Direito de arrependimento e reembolsos",
        paragraphs: [
          "Você pode desistir de qualquer compra em até 7 dias corridos a contar do pagamento, sem precisar justificar (art. 49 do Código de Defesa do Consumidor, Lei nº 8.078/1990, e Decreto nº 7.962/2013).",
          "Se nenhuma análise paga (crédito) daquela compra tiver sido usada, o reembolso é integral. Se parte tiver sido usada, o reembolso é proporcional às análises não utilizadas.",
          "Nas assinaturas, a mesma regra vale para a primeira cobrança: em até 7 dias dela, você pode desistir e receber o reembolso integral, ou proporcional se já tiver usado análises da assinatura.",
          "Para desistir, envie o pedido para {email}, identificando sua conta. O reembolso é feito no mesmo meio de pagamento usado na compra, por meio da Stripe, e os créditos reembolsados são removidos da sua conta.",
          "Se a lei garantir a você um reembolso maior, vale o que a lei determinar.",
        ],
      },
      {
        title: "6. Uso aceitável",
        paragraphs: [
          "Não envie conteúdo que você não tem direito de usar, arquivos maliciosos ou currículos de outras pessoas sem autorização. Não tente contornar limites, acessar dados de outros usuários ou interferir no serviço.",
        ],
      },
      {
        title: "7. Seu conteúdo",
        paragraphs: [
          "Você mantém todos os direitos sobre seu conteúdo. Você nos concede apenas as permissões necessárias para processá-lo e prestar o serviço. Você pode excluí-lo a qualquer momento.",
        ],
      },
      {
        title: "8. Encerramento e responsabilidade",
        paragraphs: [
          "Você pode excluir sua conta a qualquer momento na página Conta. A exclusão cancela a assinatura ativa e apaga os créditos não usados: se ainda estiver dentro do prazo de arrependimento, peça o reembolso antes de excluir a conta.",
          "Podemos suspender contas em caso de violação grave destes termos, informando o motivo pelo e-mail da conta. A suspensão não afasta os seus direitos de consumidor sobre valores pagos.",
          "Nossa responsabilidade segue a legislação brasileira. Nada nestes termos exclui ou limita os direitos garantidos a você como consumidor pelo Código de Defesa do Consumidor.",
        ],
      },
      {
        title: "9. Lei aplicável, foro e atendimento",
        paragraphs: [
          "Estes termos são regidos pelas leis da República Federativa do Brasil, incluindo o Código de Defesa do Consumidor (Lei nº 8.078/1990) e o Marco Civil da Internet (Lei nº 12.965/2014).",
          "Eventuais litígios podem ser propostos no foro do domicílio do consumidor (art. 101, I, do CDC). Antes disso, você pode falar conosco em {email} para tentarmos resolver a questão.",
        ],
      },
    ],
  },
};

const es: MarketingDict = {
  nav: { result: "Resultado", pricing: "Precios", faq: "Preguntas", how: "Cómo funciona", login: "Iniciar sesión", start: "Empezar gratis" },
  hero: {
    eyebrow: "Análisis de currículum para tecnología, recién egresados y ofertas en Brasil o en el extranjero",
    title: "Tu currículum, alineado con la oferta adecuada.",
    subtitle:
      "Pega la descripción de la oferta y sube tu currículum. CV Match compara cada requisito con la evidencia de tu currículum, explica qué se encuentra, qué es parcial y qué falta, y sugiere mejoras específicas — sin inventar experiencia, competencias, idiomas ni resultados.",
    primary: "Analizar mi primer currículum",
    secondary: "Ver cómo funciona",
    note: "Primer análisis gratis. Sin tarjeta.",
  },
  demo: {
    example: "Ejemplo ilustrativo",
    title: "Mira el flujo del análisis",
    subtitle: "Un ejemplo simplificado de lo que obtienes para cada oferta.",
    cvLabel: "Tu currículum",
    jobLabel: "Descripción de la oferta",
    resultLabel: "Revisión de requisitos",
    cvLines: ["Desarrolladora Full Stack — Acme Tech", "APIs REST con Node.js y PostgreSQL", "Dashboard en React para equipos internos", "Inglés — C1"],
    jobLines: ["3+ años con React", "Node.js y PostgreSQL", "Experiencia con Docker", "Inglés C1", "Entorno dinámico"],
    statuses: {
      found: "Evidencia encontrada",
      partial: "Evidencia parcial",
      not_found: "No identificado en el CV",
      ambiguous: "Ambiguo",
    },
    rows: [
      { label: "Node.js y PostgreSQL", status: "found", note: "“APIs REST con Node.js y PostgreSQL”" },
      { label: "3+ años con React", status: "partial", note: "Aparece React, pero las fechas no confirman 3 años" },
      { label: "Docker", status: "not_found", note: "No está en tu CV — añádelo solo si es cierto" },
      { label: "Entorno dinámico", status: "ambiguous", note: "No se puede demostrar con un CV — no puntúa" },
    ],
    scoreLabel: "Índice de compatibilidad",
    scoreNote: "Estimación de la herramienta basada en el texto de tu CV — no es una probabilidad de contratación.",
  },
  beforeAfter: {
    title: "Mejoras que respetan tus datos",
    subtitle: "Cada sugerencia se comprueba contra tu currículum. Se rechazan números, tecnologías y empresas que no aparecen en él.",
    before: "Antes",
    after: "Después",
    examples: [
      {
        tag: "Claridad y terminología de la oferta",
        before: "Encargado del desarrollo de un dashboard en reactjs usado por equipos internos, etc.",
        after: "Desarrollo de un dashboard en React usado por equipos internos",
      },
      {
        tag: "Competencias ya demostradas en tu experiencia",
        before: "Competencias: JavaScript, TypeScript, Git",
        after: "Competencias: React, JavaScript, TypeScript, Git — React ya estaba en tu experiencia, solo faltaba en la lista",
      },
    ],
    confirmTag: "Confirma antes de añadir",
    confirmText:
      "La oferta pide Docker, que no se identifica en tu currículum. Si de verdad tienes esa experiencia, describe dónde y cómo la usaste. Si no, no la incluyas — nunca la añadimos por ti.",
  },
  principles: [
    { title: "Evidencia, no opinión", text: "Cada resultado cita la línea de tu currículum que lo respalda." },
    { title: "Nada se inventa", text: "Las sugerencias que añaden hechos ajenos a tu currículum se descartan." },
    { title: "Tú decides", text: "Acepta, edita o rechaza cada cambio. Tu original se mantiene intacto." },
  ],
  preview: {
    title: "Un resultado estructurado, no una respuesta de chat",
    subtitle: "Esta es la pantalla de resultado del producto: un índice con su significado, los puntos fuertes, lo que falta y los cambios que puedes aceptar.",
    label: "Ejemplo ilustrativo",
    note: "Datos ficticios, usados para presentar la interfaz. No es un resultado real y no predice ningún proceso de selección.",
    strengths: [
      { label: "Node.js y PostgreSQL", must: true },
      { label: "Inglés C1", must: true },
      { label: "TypeScript", must: false },
      { label: "Git", must: false },
    ],
    gaps: [
      { label: "Experiencia con Docker", must: true, status: "not_found" },
      { label: "3+ años con React", must: true, status: "partial" },
    ],
    suggestion: {
      rationale: "Lleva al inicio del resumen términos que la oferta pide y que ya están en tu currículum.",
      current: "Desarrolladora enfocada en aplicaciones web y APIs.",
      suggested: "Desarrolladora full stack con experiencia en React, Node.js y PostgreSQL, enfocada en aplicaciones web y APIs.",
    },
  },
  how: {
    title: "Cómo funciona",
    steps: [
      { title: "Importa tu currículum", text: "Sube un PDF o DOCX (o pega el texto). Revisa y corrige lo extraído antes de continuar." },
      { title: "Añade la oferta", text: "Pega la descripción de la oferta. Empresa, ubicación, idioma y enlace son opcionales. Sin scraping." },
      { title: "Análisis de compatibilidad", text: "Cada requisito se clasifica como encontrado, parcial, no identificado o ambiguo, citando la evidencia de tu currículum." },
      { title: "Mejoras específicas", text: "Resumen, competencias, reescritura de experiencias, orden de proyectos y puntos a confirmar — acepta, edita o rechaza cada uno." },
      { title: "Revisa y exporta", text: "Compara versiones, conserva el original intacto y exporta un PDF o DOCX profesional en PT, ES o EN." },
    ],
  },
  pricing: {
    title: "Precios sencillos",
    subtitle: "Precios en reales brasileños (R$), precio final. Compra un paquete o suscríbete — cancela cuando quieras.",
    perMonth: "/mes",
    perQuarter: "/3 meses",
    oneTime: "pago único",
    analyses: (n: number) => `${n} ${n === 1 ? "análisis" : "análisis"}`,
    analysesPerMonth: (n: number) => `${n} análisis al mes`,
    analysesPerQuarter: (n: number) => `${n} análisis cada 3 meses`,
    suggestionsLimited: (n: number) => `Hasta ${n} sugerencias de mejora`,
    suggestionsFull: "Todas las sugerencias de mejora",
    coverLetter: "Carta de presentación personalizada",
    interview: "Preparación de entrevista",
    export: "Exportación en PDF y DOCX",
    cta: { free: "Empezar gratis", pack: "Comprar paquete", subscription: "Hazte Pro" },
    popular: "Mejor precio",
    disclaimer: "Los precios los fija el servicio y pueden cambiar; se aplica el precio mostrado en el pago.",
  },
  faq: {
    title: "Preguntas frecuentes",
    items: [
      {
        q: "¿Qué significa el índice de compatibilidad?",
        a: "Es una estimación de 0 a 100 que calcula la herramienta a partir del texto de tu currículum. Los requisitos imprescindibles pesan 3 y los valorables, 1. Cada requisito vale 1 si hay evidencia, 0,5 si es parcial y 0 si no se identifica; los requisitos ambiguos se excluyen. No es una probabilidad de ser contratado ni de conseguir una entrevista.",
      },
      {
        q: "¿CV Match inventa experiencia para encajar el currículum?",
        a: "No. Las sugerencias solo reorganizan y reescriben lo que ya está en tu currículum. Cualquier sugerencia que introduzca números, tecnologías o empresas que no aparecen se descarta automáticamente. Los requisitos que no demuestras se convierten en puntos “confirma antes de añadir”, y tú decides.",
      },
      {
        q: "¿Garantiza mejor puntuación ATS o una entrevista?",
        a: "No. Cada empresa usa sistemas y criterios distintos. Te ayudamos a presentar tu experiencia real con claridad para una oferta concreta; no prometemos puntuaciones ATS, entrevistas ni ofertas.",
      },
      {
        q: "¿Qué pasa con mi currículum y mis datos?",
        a: "Por defecto no se guardan los archivos originales: extraemos el texto y descartamos el archivo. Puedes eliminar documentos, análisis, versiones o toda tu cuenta en cualquier momento. Los registros nunca contienen el contenido del currículum.",
      },
      {
        q: "¿Qué idiomas se admiten?",
        a: "La interfaz está en portugués, español e inglés, y puedes generar y exportar tu currículum en cualquiera de estos tres idiomas.",
      },
      {
        q: "¿Cómo funcionan los pagos?",
        a: "Los pagos los procesa Stripe, en reales, con tarjeta y, cuando se ofrecen en el checkout, con Pix o boleto. Los paquetes son compras únicas de créditos de análisis. Pro es una suscripción mensual o trimestral que puedes cancelar cuando quieras en el portal del cliente; sigue activa hasta el final del periodo pagado. Puedes desistir de cualquier compra dentro de los 7 días — consulta los términos de uso.",
      },
    ],
  },
  finalCta: {
    title: "¿Listo para adaptar tu currículum a la próxima oferta?",
    text: "El primer análisis es gratis. Revisa cada cambio antes de que entre en tu currículum.",
    button: "Analizar mi primer currículum",
  },
  footer: {
    product: "Producto", legalTitle: "Legal", contact: "Contacto",
    tagline: "Adaptación de currículum honesta y basada en evidencias.",
    privacy: "Política de privacidad",
    terms: "Términos de uso",
    legal: "Aviso legal",
    rights: "Todos los derechos reservados.",
  },
  legal: {
    contents: "En esta página",
    updated: "Última actualización",
    updatedDate: "04/11/2026",
  },
  legalNotice: {
    title: "Aviso legal",
    intro:
      "Información sobre el proveedor de este servicio, conforme al Decreto brasileño n.º 7.962/2013 (comercio electrónico) y al Código de Defensa del Consumidor (Ley n.º 8.078/1990).",
    sections: [
      {
        title: "1. Proveedor",
        pending: "Identificación del proveedor (nombre, CPF o CNPJ y dirección física): publicación pendiente. Mientras tanto, usa el contacto de abajo para cualquier solicitud.",
        paragraphs: ["Nombre: {operator}", "{taxLabel}: {taxId}", "Dirección física: {address}", "Dirección electrónica y atención: {email}"],
      },
      {
        title: "2. Objeto",
        paragraphs: [
          "CV Match es un servicio en línea que compara currículums con descripciones de ofertas y sugiere mejoras. Se ofrece en Brasil, con precios en reales (R$). Su uso se rige por los términos de uso y la política de privacidad.",
        ],
      },
      {
        title: "3. Contratación y derecho de arrepentimiento",
        paragraphs: [
          "Antes del pago, el checkout muestra el plan, el precio final en reales, los medios de pago disponibles y, en las suscripciones, la periodicidad de la renovación.",
          "Puedes desistir de una compra dentro de los 7 días corridos siguientes al pago (art. 49 del Código de Defensa del Consumidor). Las condiciones y la forma de solicitarlo están en la sección 5 de los términos de uso. Solicitudes: {email}.",
        ],
      },
      {
        title: "4. Propiedad intelectual",
        paragraphs: ["El software, el diseño y los textos de CV Match pertenecen al proveedor. El contenido que suben los usuarios sigue siendo suyo."],
      },
    ],
  },
  privacy: {
    title: "Política de privacidad",
    intro:
      "Esta política explica qué datos personales trata CV Match, para qué, con quién los comparte y cómo puedes ejercer tus derechos, conforme a la Ley General de Protección de Datos Personales de Brasil (LGPD, Ley n.º 13.709/2018). El servicio se ofrece en Brasil.",
    sections: [
      {
        title: "1. Controlador y encargado",
        pending: "Identificación del controlador (nombre, CPF o CNPJ y dirección): publicación pendiente. Mientras tanto, la atención se realiza por el contacto de abajo.",
        paragraphs: [
          "Controlador: {operator}",
          "{taxLabel}: {taxId}",
          "Dirección: {address}",
          "Contacto del encargado del tratamiento de datos personales (encarregado, art. 41 de la LGPD) y canal para titulares y para la ANPD: {email}.",
        ],
      },
      {
        title: "2. Datos que tratamos",
        paragraphs: [
          "Registro: nombre, correo electrónico y contraseña (procesada por el servicio de autenticación), además del registro de aceptación de los términos.",
          "Perfil: título profesional, ubicación, lugares de interés, sector, preferencias de idioma y de plantilla de currículum y banco de competencias.",
          "Currículum: nombre, tipo y tamaño del archivo enviado; texto extraído del archivo o pegado por ti; datos estructurados (contacto, experiencia, formación, competencias, proyectos, idiomas y certificaciones) y las versiones que guardas.",
          "Ofertas: título, empresa, ubicación, enlace, texto del anuncio y requisitos identificados.",
          "Resultados: índice de compatibilidad, clasificación de los requisitos, fragmentos usados como evidencia, sugerencias y tus decisiones sobre ellas, cartas de presentación, preparación para entrevistas y el registro de las exportaciones (formato, plantilla e idioma).",
          "Cobro: plan, créditos, estado de la suscripción, identificador de cliente en Stripe y aceptación de los términos en la compra. Los datos de tarjeta, Pix o boleto se introducen en la página de pago de Stripe y no pasan por nuestros servidores.",
          "Uso y datos técnicos: recuento de análisis y otras acciones, usado para aplicar límites. La infraestructura de alojamiento y de autenticación recibe datos de conexión (como dirección IP, navegador, fecha y hora) al atender cada acceso.",
          { when: "metrics", text: "Métricas internas del producto: eventos de uso (como registro, inicio de sesión, importación de currículum, análisis, exportación, elección, cambio o cancelación de plan, importe pagado y eliminación de cuenta), vinculados a un identificador seudonimizado, sin tu nombre, correo ni texto del currículum o de la oferta. Un dato seudonimizado sigue siendo dato personal." },
          { when: "turnstile", text: "Verificación contra abusos: en los formularios de inicio de sesión, registro y recuperación de contraseña, Cloudflare Turnstile analiza señales técnicas del navegador y de la conexión para confirmar que la solicitud viene de una persona." },
          "Datos sensibles: no pedimos ni necesitamos datos como salud, discapacidad, religión, opinión política, afiliación sindical u origen racial o étnico, pero un currículum puede contenerlos. Recomendamos quitarlos, salvo que sean relevantes para la oferta. Lo que esté en el texto enviado se trata como el resto del currículum.",
          "Datos de terceros: los currículums y las ofertas pueden mencionar a otras personas (referencias, antiguos responsables, colegas). Incluye datos de contacto de terceros solo si puedes compartirlos. Esa información se usa únicamente para prestarte el servicio, y la persona mencionada puede escribirnos a {email}.",
        ],
      },
      {
        title: "3. Finalidades y bases legales",
        paragraphs: [
          "Prestar el servicio que solicitas (importar, analizar y mejorar tu currículum, generar contenidos, exportar documentos y mantener tu cuenta): ejecución de contrato (art. 7, V, de la LGPD).",
          "Procesar pagos y mantener registros contables y fiscales: ejecución de contrato y cumplimiento de obligación legal (art. 7, V y II).",
          "Garantizar la seguridad, aplicar límites de uso y prevenir fraudes y abusos: interés legítimo y ejecución de contrato (art. 7, IX y V).",
          { when: "metrics", text: "Entender el uso del producto mediante métricas seudonimizadas: interés legítimo (art. 7, IX)." },
          "Defender derechos en procesos judiciales, administrativos o arbitrales: ejercicio regular de derechos (art. 7, VI).",
          "Datos sensibles que incluyas en tu currículum: tratados solo para prestar el servicio que pediste, con base en el ejercicio regular de derechos en contrato (art. 11, II, d). Puedes quitarlos en cualquier momento editando o eliminando el contenido.",
          "Datos de terceros mencionados en currículums: interés legítimo (art. 7, IX), limitado a la finalidad anterior.",
          "Si pedimos tu consentimiento para una finalidad específica, la base legal será el consentimiento (art. 7, I), que podrás revocar en cualquier momento.",
        ],
      },
      {
        title: "4. Con quién compartimos datos",
        paragraphs: [
          "Supabase: base de datos, autenticación y almacenamiento, en São Paulo, Brasil (región sa-east-1).",
          "Vercel: alojamiento de la aplicación y registros técnicos de acceso, con las funciones de la aplicación ejecutadas en São Paulo, Brasil.",
          "Stripe: procesamiento de pagos. Recibe tu correo, identificador interno de la cuenta, plan y registro de aceptación de los términos, además de los datos que introduzcas en la página de pago.",
          "Proveedor de correo usado por el servicio de autenticación: recibe tu dirección para enviar la confirmación de registro y la recuperación de contraseña.",
          { when: "noAi", text: "Proveedores de IA: actualmente tu currículum no se envía a ninguno. El análisis y las sugerencias los genera un motor de reglas en los servidores del servicio." },
          { when: "ai", text: "Anthropic (Estados Unidos): proveedor de IA. Recibe el texto del currículum y de la oferta para estructurar documentos y redactar sugerencias, cartas y preparación para entrevistas." },
          { when: "turnstile", text: "Cloudflare: verificación antibots (Turnstile) en los formularios de acceso." },
          { when: "ocr", text: "Servicio de OCR: recibe PDF escaneados para reconocer el texto." },
          { when: "metrics", text: "Panel interno de gestión NexForge: recibe solo los eventos seudonimizados descritos en la sección 2." },
          "Autoridades públicas, cuando exista obligación legal u orden judicial.",
          "No vendemos tus datos, no los usamos para publicidad y no enviamos tu currículum ni tus resultados a empleadores o reclutadores: tú decides a quién enviarlos.",
        ],
      },
      {
        title: "5. Transferencia internacional",
        paragraphs: [
          "La base de datos y las funciones de la aplicación están en Brasil, pero algunos proveedores son empresas extranjeras, principalmente de Estados Unidos, y pueden tratar datos fuera de Brasil. Estas transferencias ocurren cuando son necesarias para ejecutar el contrato contigo (art. 33, IX, de la LGPD).",
          { when: "ai", text: "El texto del currículum y de la oferta se envía a Estados Unidos siempre que se ejecuta una función de IA." },
        ],
      },
      {
        title: "6. Conservación y eliminación",
        paragraphs: [
          { when: "noStoredFiles", text: "Archivo original: no se guarda. Se lee en memoria para extraer el texto y después se descarta; el texto extraído queda guardado en tu cuenta." },
          { when: "storedFiles", text: "Archivo original: se conserva en almacenamiento privado. Puedes eliminarlo en Documentos, y una rutina diaria borra los originales con más de {retentionDays} días. El texto extraído sigue guardado en tu cuenta." },
          "Texto extraído, currículums, versiones, ofertas, análisis y demás contenidos: se conservan hasta que los elimines o elimines la cuenta. No hay eliminación automática por inactividad.",
          "Eliminación de la cuenta: al confirmarla, retiramos del servicio tu cuenta y los datos vinculados a ella, cancelamos la suscripción activa y eliminamos tu registro de cliente en Stripe. Los cobros ya realizados siguen registrados en Stripe como registros fiscales.",
          "Pueden quedar copias en respaldos de la infraestructura hasta el fin de su ciclo de conservación, y los registros técnicos siguen el ciclo de cada proveedor.",
          { when: "metrics", text: "Los eventos seudonimizados ya enviados al panel interno no se eliminan con la cuenta." },
          "Los datos necesarios para cumplir una obligación legal o defender derechos pueden conservarse durante el plazo aplicable (art. 16 de la LGPD).",
        ],
      },
      {
        title: "7. Tus derechos (art. 18 de la LGPD)",
        paragraphs: [
          "Tienes derecho a: confirmación de la existencia de tratamiento; acceso a los datos; corrección de datos incompletos, inexactos o desactualizados; anonimización, bloqueo o eliminación de datos innecesarios, excesivos o tratados en disconformidad con la ley; portabilidad; eliminación de los datos tratados con tu consentimiento; información sobre las entidades con las que compartimos datos; información sobre la posibilidad de no consentir y sus consecuencias; revocación del consentimiento; y oposición al tratamiento en disconformidad con la ley.",
          "En el propio servicio puedes editar tu perfil y currículums; eliminar documentos, versiones, ofertas y análisis; descargar una copia de tus datos en formato JSON en la página Cuenta; y eliminar la cuenta. Para lo demás, escribe a {email}. Responderemos dentro de los plazos legales y podremos pedirte que confirmes que eres el titular.",
          "También puedes presentar una petición ante la Autoridad Nacional de Protección de Datos (ANPD) o ante los organismos de defensa del consumidor.",
        ],
      },
      {
        title: "8. Decisiones automatizadas (art. 20 de la LGPD)",
        paragraphs: [
          "El índice de compatibilidad, la clasificación de los requisitos y las sugerencias se generan automáticamente. Criterios del índice: los requisitos obligatorios pesan 3 y los deseables, 1; cada requisito vale 1 si hay evidencia, 0,5 si es parcial y 0 si no se identifica; los requisitos ambiguos quedan fuera.",
          "El resultado es una estimación hecha a partir del texto del currículum. No es la probabilidad de ser contratado, no garantiza ningún resultado en procesos de selección, no se envía a empleadores y no decide ninguna contratación.",
          "Puedes corregir tu currículum, aceptar, editar o rechazar cada sugerencia, y pedir información sobre los criterios o la revisión de un resultado automatizado en {email}.",
        ],
      },
      {
        title: "9. Cookies",
        paragraphs: [
          "Usamos solo cookies necesarias: las de sesión del servicio de autenticación (prefijo sb-), para mantener tu sesión, y cvm_locale, que guarda el idioma de la interfaz durante un máximo de 1 año. No usamos cookies publicitarias ni herramientas de analítica de terceros en el navegador.",
          { when: "turnstile", text: "Cloudflare Turnstile puede usar recursos propios del navegador en los formularios de acceso." },
          "La página de pago pertenece a Stripe, que aplica su propia política de cookies.",
        ],
      },
      {
        title: "10. Niños y adolescentes",
        paragraphs: [
          "CV Match está destinado a mayores de 18 años. Las personas menores de 18 años solo deben usarlo con la participación de su representante legal, y los niños no deben usarlo. No verificamos la edad en el registro. Si eres responsable de un niño o adolescente y has identificado una cuenta, escribe a {email} para pedir la eliminación de los datos.",
        ],
      },
      {
        title: "11. Seguridad e incidentes",
        paragraphs: [
          "Adoptamos medidas técnicas para proteger tus datos: aislamiento por usuario con políticas de acceso en la base de datos, conexiones cifradas, validación de los archivos enviados, que solo se leen y nunca se ejecutan, y registros de la aplicación sin el contenido del currículum. Ningún sistema es totalmente seguro, por lo que no podemos prometer seguridad absoluta.",
          "Si ocurre un incidente de seguridad que pueda acarrear riesgo o daño relevante a los titulares, lo comunicaremos a la ANPD y a los titulares afectados, conforme al art. 48 de la LGPD.",
        ],
      },
      {
        title: "12. Cambios en esta política",
        paragraphs: [
          "Podemos actualizar esta política para reflejar cambios en el servicio o en la ley. La fecha de la última actualización aparece al inicio de la página. Los cambios relevantes se informarán en el sitio o por correo electrónico.",
        ],
      },
    ],
  },
  terms: {
    title: "Términos de uso",
    intro: "Estos términos regulan el uso de CV Match. Al crear una cuenta o usar el servicio, los aceptas junto con la política de privacidad.",
    sections: [
      {
        title: "1. El servicio",
        paragraphs: [
          "CV Match analiza la compatibilidad entre tu currículum y una descripción de oferta y sugiere mejoras. El índice de compatibilidad es una estimación de la herramienta, no una probabilidad de contratación.",
          { when: "noAi", text: "Actualmente los análisis, sugerencias, cartas y preparaciones para entrevistas los genera un motor de reglas, sin IA generativa: los cambios de redacción son puntuales, los textos siguen plantillas y el contenido del currículum no se traduce. Al exportar, el idioma elegido se aplica a los títulos de las secciones." },
        ],
      },
      {
        title: "2. Sin garantía de resultados",
        paragraphs: [
          "CV Match es una herramienta de apoyo. Ningún resultado, índice o sugerencia es garantía de empleo, entrevista, oferta, éxito en un proceso de selección o puntuación en sistemas de reclutamiento (ATS). Las decisiones de selección corresponden a cada empleador.",
        ],
      },
      {
        title: "3. Tu responsabilidad",
        paragraphs: [
          "Eres responsable de la veracidad de tu currículum y de todo lo que envíes a empleadores. Las sugerencias generadas automáticamente deben ser revisadas por ti antes de usarlas. No incluyas competencias, experiencia o resultados que no tengas.",
          "Para contratar planes de pago debes tener 18 años o más o estar asistido por tu representante legal.",
        ],
      },
      {
        title: "4. Planes, precios y pagos",
        paragraphs: [
          "Los precios se muestran en reales (R$) y son precios finales. Los pagos los procesa Stripe, con tarjeta y, cuando se ofrecen en el checkout, con Pix o boleto.",
          "Planes en esta versión de los términos: Gratis, sin coste, con 1 análisis y hasta 5 sugerencias; Paquete de 10 análisis, R$ 19,90 en pago único; Pro mensual, R$ 29,90 al mes, con 50 análisis al mes; Pro trimestral, R$ 69,90 cada 3 meses, con 150 análisis cada 3 meses. Los planes de pago incluyen todas las sugerencias, carta de presentación y preparación para entrevistas. El importe cobrado es el que se muestra en el checkout antes del pago.",
          "Los paquetes de análisis son compras únicas de créditos que se consumen al ejecutar un análisis y no caducan. El crédito se devuelve automáticamente si un análisis falla por motivos técnicos.",
          "La suscripción Pro se renueva al final de cada periodo (mensual o cada 3 meses) hasta que se cancele. Los análisis no usados en un periodo no pasan al siguiente. Puedes cancelar en cualquier momento en el portal del cliente, accesible desde la página de cobro; no hay nuevos cobros y el acceso continúa hasta el final del periodo pagado.",
          "Los precios, límites y beneficios de los planes pueden cambiar; los cambios no afectan a periodos o créditos ya pagados. Un cambio de precio en una suscripción activa exige aviso previo, y podrás cancelar antes de que entre en vigor.",
        ],
      },
      {
        title: "5. Derecho de arrepentimiento y reembolsos",
        paragraphs: [
          "Puedes desistir de cualquier compra dentro de los 7 días corridos siguientes al pago, sin necesidad de justificarlo (art. 49 del Código de Defensa del Consumidor, Ley n.º 8.078/1990, y Decreto n.º 7.962/2013).",
          "Si no se ha usado ningún análisis pagado (crédito) de esa compra, el reembolso es total. Si se ha usado una parte, el reembolso es proporcional a los análisis no utilizados.",
          "En las suscripciones, la misma regla se aplica al primer cobro: dentro de los 7 días siguientes puedes desistir y recibir el reembolso total, o proporcional si ya usaste análisis de la suscripción.",
          "Para desistir, envía tu solicitud a {email}, identificando tu cuenta. El reembolso se hace al mismo medio de pago usado en la compra, a través de Stripe, y los créditos reembolsados se retiran de tu cuenta.",
          "Si la ley te garantiza un reembolso mayor, prevalece la ley.",
        ],
      },
      {
        title: "6. Uso aceptable",
        paragraphs: [
          "No subas contenido que no tengas derecho a usar, archivos maliciosos ni currículums de otras personas sin su autorización. No intentes eludir límites, acceder a datos de otros usuarios ni interferir con el servicio.",
        ],
      },
      {
        title: "7. Tu contenido",
        paragraphs: [
          "Conservas todos los derechos sobre tu contenido. Solo nos concedes los permisos necesarios para tratarlo y prestar el servicio. Puedes eliminarlo en cualquier momento.",
        ],
      },
      {
        title: "8. Baja y responsabilidad",
        paragraphs: [
          "Puedes eliminar tu cuenta en cualquier momento en la página Cuenta. La eliminación cancela la suscripción activa y borra los créditos no usados: si aún estás dentro del plazo de arrepentimiento, pide el reembolso antes de eliminar la cuenta.",
          "Podemos suspender cuentas por incumplimiento grave de estos términos, indicando el motivo por el correo de la cuenta. La suspensión no afecta a tus derechos de consumidor sobre los importes pagados.",
          "Nuestra responsabilidad se rige por la legislación brasileña. Nada de estos términos excluye ni limita los derechos que el Código de Defensa del Consumidor te garantiza como consumidor.",
        ],
      },
      {
        title: "9. Ley aplicable, jurisdicción y atención",
        paragraphs: [
          "Estos términos se rigen por las leyes de la República Federativa de Brasil, incluidos el Código de Defensa del Consumidor (Ley n.º 8.078/1990) y el Marco Civil de Internet (Ley n.º 12.965/2014).",
          "Cualquier controversia puede presentarse ante los tribunales del domicilio del consumidor (art. 101, I, del CDC). Antes, puedes escribirnos a {email} para intentar resolverla.",
        ],
      },
    ],
  },
};

export const marketing: Record<"en" | "pt" | "es", MarketingDict> = { en, pt, es };
