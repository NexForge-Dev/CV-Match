/** Landing page and legal copy. App UI strings live in dictionaries.ts. */

export interface LegalSection {
  title: string;
  paragraphs: string[];
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
  },
  legalNotice: {
    title: "Legal notice",
    intro:
      "Information about the supplier of this service, as required by Brazilian Decree 7,962/2013 (e-commerce) and the Consumer Protection Code (Law 8,078/1990).",
    sections: [
      {
        title: "1. Supplier",
        paragraphs: ["Name: {operator}", "CPF: {taxId}", "Physical address: {address}", "Electronic address and customer service: {email}"],
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
          "Before payment, the checkout shows the plan, what it includes, the final price in reais, the payment methods available and, for subscriptions, the renewal period.",
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
      "This policy explains how CV Match processes personal data when you use the service, in accordance with the Brazilian General Data Protection Law (LGPD, Law 13,709/2018). CVs contain personal data, so we collect as little as possible and keep it only as long as needed.",
    sections: [
      {
        title: "1. Controller and contact",
        paragraphs: [
          "The controller of your personal data is {operator} (CPF {taxId}), {address}. For any privacy request or question, contact {email}.",
          "As a small-scale processing agent (Resolution CD/ANPD No. 2/2022), the controller is not required to appoint a data protection officer (encarregado). The communication channel for data subjects and for the ANPD is {email}.",
        ],
      },
      {
        title: "2. Data we process",
        paragraphs: [
          "Account data: email address and authentication data.",
          "Profile data you enter: name, headline, location, preferences and skill bank.",
          "CV content: text extracted from the documents you upload or paste, the structured CV you review, and the versions you save.",
          "Job descriptions you paste, analyses, suggestions, cover letters and interview preparation generated for you.",
          "Billing data: plan, credits and subscription status. Card and other payment details are handled by Stripe and never reach our servers.",
          "Anti-abuse verification: on protected forms, Cloudflare Turnstile checks technical browser and connection signals to confirm that the request comes from a person.",
          "Technical usage records (e.g. number of analyses, AI tokens consumed) that never include CV content. Aggregated product metrics (which features are used, sign-up and plan events) are recorded under a pseudonymous identifier, without your name, e-mail or any content.",
          "We do not need sensitive personal data (such as health, religion, political opinion or ethnic origin). We recommend not including it in your CV unless it is relevant to the job.",
        ],
      },
      {
        title: "3. Purposes and legal bases (LGPD art. 7)",
        paragraphs: [
          "To provide the service you request: extracting, analysing and improving your CV and exporting documents — performance of a contract (art. 7, V).",
          "To process payments and prevent fraud and abuse, including anti-bot verification — performance of a contract and legitimate interest (art. 7, V and IX).",
          "To comply with legal and regulatory obligations, such as accounting and tax records of payments — compliance with a legal obligation (art. 7, II).",
          "Where we ask for your consent for a specific purpose, the legal basis is consent (art. 7, I), which you may revoke at any time.",
        ],
      },
      {
        title: "4. Data minimisation and retention",
        paragraphs: [
          "Original uploaded files are not stored by default: the text is extracted in memory and the file is discarded. If file storage is enabled, originals are kept in private storage and deleted automatically after a limited period or when you request it.",
          "Extracted text, CVs, versions, jobs and analyses are kept until you delete them or delete your account.",
          "Deletion removes your data from the live service immediately. Copies may remain in encrypted infrastructure backups until those backups expire, at most {backupDays} days after deletion; they are not used to restore your data.",
          "Payment records may be retained for the period required by law (LGPD art. 16, I).",
        ],
      },
      {
        title: "5. Processors and international transfers",
        paragraphs: [
          "Supabase (database, authentication and file storage), hosted in São Paulo, Brazil (sa-east-1 region).",
          "Vercel (application hosting and technical request logs), with the application's functions running in São Paulo, Brazil.",
          "Anthropic (AI processing of CV and job text to structure documents and write suggestions), in the United States — only when AI features are run. Anthropic does not use this data to train its models.",
          "Stripe (payment processing), Cloudflare Turnstile (anti-bot verification) and our transactional e-mail (SMTP) provider (account and service e-mails).",
          "These providers act as processors (operadores) on our instructions, under contracts that include data protection obligations.",
          "Some of these providers process data outside Brazil, mainly in the United States (in particular Anthropic, and Stripe, Cloudflare, Vercel and the e-mail provider for part of their processing). These international transfers follow art. 33 of the LGPD and rely on the standard contractual clauses approved by the ANPD (Resolution CD/ANPD No. 19/2024) and on the safeguards offered by each provider.",
          "We do not sell your personal data and do not use it for advertising.",
        ],
      },
      {
        title: "6. Your rights (LGPD art. 18)",
        paragraphs: [
          "You have the right to: confirmation that we process your data; access; correction of incomplete, inaccurate or outdated data; anonymisation, blocking or deletion of unnecessary or excessive data or data processed unlawfully; portability; deletion of data processed with your consent; information about the entities with which we share data; information about the possibility of not consenting and its consequences; revocation of consent; and objection to processing that does not comply with the law.",
          "Most of these can be exercised directly in the app: edit your profile and CVs, delete documents and analyses, and delete your account. For anything else, write to {email}.",
          "You may also file a petition with the National Data Protection Authority (ANPD) or with consumer protection bodies.",
        ],
      },
      {
        title: "7. Security",
        paragraphs: [
          "Data is isolated per user with database access policies, transmitted over encrypted connections, and uploaded files are validated and never executed. Application logs do not contain CV content.",
          "If a security incident may cause relevant risk or damage to data subjects, we will notify the ANPD and the affected data subjects, as required by LGPD art. 48.",
        ],
      },
      {
        title: "8. Cookies",
        paragraphs: ["We use only cookies necessary for authentication and to remember your interface language."],
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
        ],
      },
      {
        title: "2. No guarantees",
        paragraphs: [
          "We do not guarantee interviews, job offers, hiring decisions or scores in applicant tracking systems (ATS). Recruitment decisions belong to each employer.",
        ],
      },
      {
        title: "3. Your responsibility",
        paragraphs: [
          "You are responsible for the truthfulness of your CV and of everything you submit to employers. Suggestions — including AI-generated ones — must be reviewed by you before use. Do not add skills, experience or results you do not have.",
        ],
      },
      {
        title: "4. Plans, prices and payments",
        paragraphs: [
          "Prices are shown in Brazilian reais (R$) and are final prices. Payments are processed by Stripe, by card and, when offered at checkout, by Pix or boleto.",
          "Analysis packs are one-time purchases of credits that are consumed when an analysis is run. A credit is returned automatically if an analysis fails for technical reasons.",
          "Pro subscriptions renew at the end of each billing period (monthly or every 3 months) until cancelled. You can cancel at any time in the customer portal, available from the billing page; there are no further charges and access continues until the end of the paid period.",
          "Prices, limits and plan benefits may change; changes do not affect periods or credits already paid.",
        ],
      },
      {
        title: "5. Right of withdrawal and refunds",
        paragraphs: [
          "You may withdraw from any purchase within 7 calendar days of payment, without giving a reason (art. 49 of the Consumer Protection Code, Law 8,078/1990, and Decree 7,962/2013).",
          "If no paid analysis (credit) from that purchase has been used, the refund is full. If some have been used, the refund is proportional to the analyses not used.",
          "For subscriptions, the same rule applies to the first charge: within 7 days of it you may withdraw and receive a full refund, or a proportional one if analyses from the subscription have already been used.",
          "To withdraw, send your request to {email}, identifying your account. The refund is made to the original payment method through Stripe, and the refunded credits are removed from your account.",
        ],
      },
      {
        title: "6. Acceptable use",
        paragraphs: [
          "Do not upload content you have no right to use, malicious files, or other people's CVs without their consent. Do not attempt to bypass limits, access other users' data or interfere with the service.",
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
          "You may delete your account at any time. We may suspend accounts that breach these terms.",
          "Our liability follows Brazilian law. Nothing in these terms excludes or limits the rights guaranteed to you as a consumer by the Consumer Protection Code.",
        ],
      },
      {
        title: "9. Governing law and jurisdiction",
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
  },
  legalNotice: {
    title: "Informações legais",
    intro:
      "Informações sobre o fornecedor deste serviço, conforme o Decreto nº 7.962/2013 (comércio eletrônico) e o Código de Defesa do Consumidor (Lei nº 8.078/1990).",
    sections: [
      {
        title: "1. Fornecedor",
        paragraphs: ["Nome: {operator}", "CPF: {taxId}", "Endereço físico: {address}", "Endereço eletrônico e atendimento: {email}"],
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
          "Antes do pagamento, o checkout mostra o plano, o que ele inclui, o preço final em reais, as formas de pagamento disponíveis e, nas assinaturas, a periodicidade da renovação.",
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
      "Esta política explica como o CV Match trata dados pessoais quando você usa o serviço, de acordo com a Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018). Currículos contêm dados pessoais, por isso coletamos o mínimo possível e guardamos apenas pelo tempo necessário.",
    sections: [
      {
        title: "1. Controlador e contato",
        paragraphs: [
          "O controlador dos seus dados pessoais é {operator} (CPF {taxId}), {address}. Para qualquer solicitação ou dúvida sobre privacidade, escreva para {email}.",
          "Como agente de tratamento de pequeno porte (Resolução CD/ANPD nº 2/2022), o controlador não é obrigado a indicar um encarregado. O canal de comunicação com os titulares e com a ANPD é {email}.",
        ],
      },
      {
        title: "2. Dados tratados",
        paragraphs: [
          "Dados de cadastro: e-mail e dados de autenticação.",
          "Dados de perfil que você informa: nome, título profissional, localização, preferências e banco de competências.",
          "Conteúdo do currículo: texto extraído dos documentos que você envia ou cola, o currículo estruturado que você revisa e as versões que salva.",
          "Descrições de vagas que você cola, análises, sugestões, cartas de apresentação e preparação para entrevistas geradas para você.",
          "Dados de cobrança: plano, créditos e status da assinatura. Os dados do cartão e de outros meios de pagamento são tratados pela Stripe e nunca chegam aos nossos servidores.",
          "Verificação contra abusos: nos formulários protegidos, o Cloudflare Turnstile analisa sinais técnicos do navegador e da conexão para confirmar que a solicitação vem de uma pessoa.",
          "Registros técnicos de uso (por exemplo, número de análises e tokens de IA consumidos), que nunca incluem o conteúdo do currículo. Métricas agregadas do produto (quais recursos são usados, eventos de cadastro e de plano) são registradas com um identificador pseudonimizado, sem seu nome, e-mail ou qualquer conteúdo.",
          "Não precisamos de dados pessoais sensíveis (como saúde, religião, opinião política ou origem racial ou étnica). Recomendamos não incluí-los no currículo, a menos que sejam relevantes para a vaga.",
        ],
      },
      {
        title: "3. Finalidades e bases legais (art. 7º da LGPD)",
        paragraphs: [
          "Prestar o serviço que você solicita: extrair, analisar e melhorar seu currículo e exportar documentos — execução de contrato (art. 7º, V).",
          "Processar pagamentos e prevenir fraudes e abusos, inclusive a verificação anti-bot — execução de contrato e legítimo interesse (art. 7º, V e IX).",
          "Cumprir obrigações legais e regulatórias, como registros contábeis e fiscais dos pagamentos — cumprimento de obrigação legal (art. 7º, II).",
          "Quando pedirmos seu consentimento para uma finalidade específica, a base legal é o consentimento (art. 7º, I), que você pode revogar a qualquer momento.",
        ],
      },
      {
        title: "4. Minimização e retenção",
        paragraphs: [
          "Por padrão, os arquivos originais não são armazenados: o texto é extraído em memória e o arquivo é descartado. Se o armazenamento estiver ativado, os originais ficam em armazenamento privado e são excluídos automaticamente após um período limitado ou quando você pedir.",
          "Texto extraído, currículos, versões, vagas e análises ficam guardados até você excluí-los ou excluir a conta.",
          "A exclusão remove seus dados do serviço imediatamente. Cópias podem permanecer em backups criptografados da infraestrutura até expirarem, no máximo {backupDays} dias após a exclusão; elas não são usadas para restaurar seus dados.",
          "Registros de pagamento podem ser mantidos pelo prazo exigido por lei (art. 16, I, da LGPD).",
        ],
      },
      {
        title: "5. Operadores e transferência internacional",
        paragraphs: [
          "Supabase (banco de dados, autenticação e armazenamento de arquivos), hospedado em São Paulo, Brasil (região sa-east-1).",
          "Vercel (hospedagem da aplicação e logs técnicos de requisições), com as funções da aplicação executadas em São Paulo, Brasil.",
          "Anthropic (processamento por IA do texto do currículo e da vaga para estruturar documentos e redigir sugestões), nos Estados Unidos — somente quando os recursos de IA são usados. A Anthropic não usa esses dados para treinar seus modelos.",
          "Stripe (processamento de pagamentos), Cloudflare Turnstile (verificação anti-bot) e nosso provedor de e-mail transacional (SMTP), para e-mails da conta e do serviço.",
          "Esses fornecedores atuam como operadores, seguindo nossas instruções, com contratos que incluem obrigações de proteção de dados.",
          "Alguns desses fornecedores tratam dados fora do Brasil, principalmente nos Estados Unidos (em especial a Anthropic e, em parte do tratamento, Stripe, Cloudflare, Vercel e o provedor de e-mail). Essas transferências internacionais seguem o art. 33 da LGPD e se baseiam nas cláusulas-padrão contratuais aprovadas pela ANPD (Resolução CD/ANPD nº 19/2024) e nas garantias oferecidas por cada fornecedor.",
          "Não vendemos seus dados pessoais e não os usamos para publicidade.",
        ],
      },
      {
        title: "6. Seus direitos (art. 18 da LGPD)",
        paragraphs: [
          "Você tem direito a: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos, inexatos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei; portabilidade; eliminação dos dados tratados com seu consentimento; informação sobre as entidades com as quais compartilhamos dados; informação sobre a possibilidade de não consentir e suas consequências; revogação do consentimento; e oposição a tratamento realizado em desconformidade com a lei.",
          "A maioria desses direitos pode ser exercida no próprio app: edite seu perfil e currículos, exclua documentos e análises e exclua sua conta. Para o resto, escreva para {email}.",
          "Você também pode peticionar à Autoridade Nacional de Proteção de Dados (ANPD) ou aos órgãos de defesa do consumidor.",
        ],
      },
      {
        title: "7. Segurança",
        paragraphs: [
          "Os dados são isolados por usuário com políticas de acesso no banco de dados, trafegam por conexões criptografadas, e os arquivos enviados são validados e nunca executados. Os logs da aplicação não contêm conteúdo de currículos.",
          "Se ocorrer um incidente de segurança que possa acarretar risco ou dano relevante aos titulares, comunicaremos a ANPD e os titulares afetados, conforme o art. 48 da LGPD.",
        ],
      },
      {
        title: "8. Cookies",
        paragraphs: ["Usamos apenas cookies necessários para autenticação e para lembrar o idioma da interface."],
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
        ],
      },
      {
        title: "2. Sem garantias",
        paragraphs: [
          "Não garantimos entrevistas, ofertas de emprego, decisões de contratação ou pontuação em sistemas de recrutamento (ATS). As decisões de seleção pertencem a cada empregador.",
        ],
      },
      {
        title: "3. Sua responsabilidade",
        paragraphs: [
          "Você é responsável pela veracidade do seu currículo e de tudo o que enviar a empregadores. As sugestões — inclusive as geradas por IA — devem ser revisadas por você antes do uso. Não inclua competências, experiências ou resultados que você não tem.",
        ],
      },
      {
        title: "4. Planos, preços e pagamentos",
        paragraphs: [
          "Os preços são exibidos em reais (R$) e são preços finais. Os pagamentos são processados pela Stripe, por cartão e, quando oferecidos no checkout, por Pix ou boleto.",
          "Pacotes de análises são compras únicas de créditos, consumidos quando uma análise é executada. O crédito é devolvido automaticamente se uma análise falhar por motivo técnico.",
          "A assinatura Pro renova ao fim de cada período (mensal ou a cada 3 meses) até ser cancelada. Você pode cancelar a qualquer momento no portal do cliente, acessível pela página de cobrança; não há novas cobranças e o acesso continua até o fim do período pago.",
          "Preços, limites e benefícios dos planos podem mudar; as mudanças não afetam períodos ou créditos já pagos.",
        ],
      },
      {
        title: "5. Direito de arrependimento e reembolsos",
        paragraphs: [
          "Você pode desistir de qualquer compra em até 7 dias corridos a contar do pagamento, sem precisar justificar (art. 49 do Código de Defesa do Consumidor, Lei nº 8.078/1990, e Decreto nº 7.962/2013).",
          "Se nenhuma análise paga (crédito) daquela compra tiver sido usada, o reembolso é integral. Se parte tiver sido usada, o reembolso é proporcional às análises não utilizadas.",
          "Nas assinaturas, a mesma regra vale para a primeira cobrança: em até 7 dias dela, você pode desistir e receber o reembolso integral, ou proporcional se já tiver usado análises da assinatura.",
          "Para desistir, envie o pedido para {email}, identificando sua conta. O reembolso é feito no mesmo meio de pagamento usado na compra, por meio da Stripe, e os créditos reembolsados são removidos da sua conta.",
        ],
      },
      {
        title: "6. Uso aceitável",
        paragraphs: [
          "Não envie conteúdo que você não tem direito de usar, arquivos maliciosos ou currículos de outras pessoas sem consentimento. Não tente contornar limites, acessar dados de outros usuários ou interferir no serviço.",
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
          "Você pode excluir sua conta a qualquer momento. Podemos suspender contas que violem estes termos.",
          "Nossa responsabilidade segue a legislação brasileira. Nada nestes termos exclui ou limita os direitos garantidos a você como consumidor pelo Código de Defesa do Consumidor.",
        ],
      },
      {
        title: "9. Lei aplicável e foro",
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
  },
  legalNotice: {
    title: "Aviso legal",
    intro:
      "Información sobre el proveedor de este servicio, conforme al Decreto brasileño n.º 7.962/2013 (comercio electrónico) y al Código de Defensa del Consumidor de Brasil (Ley n.º 8.078/1990).",
    sections: [
      {
        title: "1. Proveedor",
        paragraphs: ["Nombre: {operator}", "CPF: {taxId}", "Dirección física: {address}", "Dirección electrónica y atención al cliente: {email}"],
      },
      {
        title: "2. Objeto",
        paragraphs: [
          "CV Match es un servicio en línea que compara currículums con descripciones de ofertas y sugiere mejoras. Se ofrece en Brasil, con precios en reales brasileños (R$). Su uso se rige por los términos de uso y la política de privacidad.",
        ],
      },
      {
        title: "3. Contratación y derecho de arrepentimiento",
        paragraphs: [
          "Antes del pago, el checkout muestra el plan, lo que incluye, el precio final en reales, los medios de pago disponibles y, en las suscripciones, la periodicidad de renovación.",
          "Puedes desistir de una compra dentro de los 7 días corridos siguientes al pago (art. 49 del Código de Defensa del Consumidor). Las condiciones y la forma de solicitarlo se describen en la sección 5 de los términos de uso. Solicitudes: {email}.",
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
      "Esta política explica cómo CV Match trata los datos personales cuando usas el servicio, de acuerdo con la Ley General de Protección de Datos Personales de Brasil (LGPD, Ley n.º 13.709/2018). Los currículums contienen datos personales, así que recopilamos lo mínimo y lo conservamos solo el tiempo necesario.",
    sections: [
      {
        title: "1. Controlador y contacto",
        paragraphs: [
          "El controlador de tus datos personales es {operator} (CPF {taxId}), {address}. Para cualquier solicitud o duda sobre privacidad, escribe a {email}.",
          "Como agente de tratamiento de pequeño porte (Resolución CD/ANPD n.º 2/2022), el controlador no está obligado a designar un encargado de protección de datos. El canal de comunicación con los titulares y con la ANPD es {email}.",
        ],
      },
      {
        title: "2. Datos que tratamos",
        paragraphs: [
          "Datos de cuenta: correo electrónico y datos de autenticación.",
          "Datos de perfil que ingresas: nombre, título profesional, ubicación, preferencias y banco de competencias.",
          "Contenido del currículum: texto extraído de los documentos que subes o pegas, el currículum estructurado que revisas y las versiones que guardas.",
          "Descripciones de ofertas que pegas, análisis, sugerencias, cartas de presentación y preparación de entrevistas generadas para ti.",
          "Datos de facturación: plan, créditos y estado de la suscripción. Los datos de la tarjeta y de otros medios de pago los gestiona Stripe y nunca llegan a nuestros servidores.",
          "Verificación contra abusos: en los formularios protegidos, Cloudflare Turnstile analiza señales técnicas del navegador y de la conexión para confirmar que la solicitud proviene de una persona.",
          "Registros técnicos de uso (p. ej. número de análisis y tokens de IA consumidos), que nunca incluyen el contenido del currículum. Las métricas agregadas del producto (qué funciones se usan, eventos de registro y de plan) se registran con un identificador seudonimizado, sin tu nombre, e-mail ni ningún contenido.",
          "No necesitamos datos personales sensibles (como salud, religión, opinión política u origen racial o étnico). Te recomendamos no incluirlos en tu currículum, salvo que sean relevantes para la oferta.",
        ],
      },
      {
        title: "3. Finalidades y bases legales (art. 7 de la LGPD)",
        paragraphs: [
          "Prestar el servicio que solicitas: extraer, analizar y mejorar tu currículum y exportar documentos — ejecución de un contrato (art. 7, V).",
          "Procesar pagos y prevenir fraudes y abusos, incluida la verificación anti-bots — ejecución de un contrato e interés legítimo (art. 7, V y IX).",
          "Cumplir obligaciones legales y regulatorias, como los registros contables y fiscales de los pagos — cumplimiento de una obligación legal (art. 7, II).",
          "Cuando te pidamos el consentimiento para una finalidad específica, la base legal es el consentimiento (art. 7, I), que puedes revocar en cualquier momento.",
        ],
      },
      {
        title: "4. Minimización y conservación",
        paragraphs: [
          "Por defecto no se guardan los archivos originales: el texto se extrae en memoria y el archivo se descarta. Si el almacenamiento está activado, los originales se guardan en almacenamiento privado y se eliminan automáticamente tras un periodo limitado o cuando lo pidas.",
          "El texto extraído, los currículums, versiones, ofertas y análisis se conservan hasta que los elimines o elimines tu cuenta.",
          "La eliminación borra tus datos del servicio de inmediato. Pueden quedar copias en respaldos cifrados de la infraestructura hasta que caduquen, como máximo {backupDays} días después de la eliminación; no se usan para restaurar tus datos.",
          "Los registros de pago pueden conservarse durante el plazo que exija la ley (art. 16, I, de la LGPD).",
        ],
      },
      {
        title: "5. Operadores y transferencias internacionales",
        paragraphs: [
          "Supabase (base de datos, autenticación y almacenamiento de archivos), alojado en São Paulo, Brasil (región sa-east-1).",
          "Vercel (alojamiento de la aplicación y registros técnicos de solicitudes), con las funciones de la aplicación ejecutadas en São Paulo, Brasil.",
          "Anthropic (procesamiento con IA del texto del currículum y de la oferta para estructurar documentos y redactar sugerencias), en Estados Unidos — solo cuando se usan las funciones de IA. Anthropic no usa estos datos para entrenar sus modelos.",
          "Stripe (procesamiento de pagos), Cloudflare Turnstile (verificación anti-bots) y nuestro proveedor de correo transaccional (SMTP), para los correos de la cuenta y del servicio.",
          "Estos proveedores actúan como operadores, siguiendo nuestras instrucciones, mediante contratos que incluyen obligaciones de protección de datos.",
          "Algunos de estos proveedores tratan datos fuera de Brasil, principalmente en Estados Unidos (en especial Anthropic y, en parte del tratamiento, Stripe, Cloudflare, Vercel y el proveedor de correo). Estas transferencias internacionales siguen el art. 33 de la LGPD y se basan en las cláusulas contractuales estándar aprobadas por la ANPD (Resolución CD/ANPD n.º 19/2024) y en las garantías que ofrece cada proveedor.",
          "No vendemos tus datos personales ni los usamos para publicidad.",
        ],
      },
      {
        title: "6. Tus derechos (art. 18 de la LGPD)",
        paragraphs: [
          "Tienes derecho a: confirmación de la existencia del tratamiento; acceso a los datos; corrección de datos incompletos, inexactos o desactualizados; anonimización, bloqueo o eliminación de datos innecesarios, excesivos o tratados en disconformidad con la ley; portabilidad; eliminación de los datos tratados con tu consentimiento; información sobre las entidades con las que compartimos datos; información sobre la posibilidad de no consentir y sus consecuencias; revocación del consentimiento; y oposición al tratamiento realizado en disconformidad con la ley.",
          "La mayoría se puede ejercer en la propia aplicación: edita tu perfil y currículums, elimina documentos y análisis y elimina tu cuenta. Para lo demás, escribe a {email}.",
          "También puedes presentar una petición ante la Autoridad Nacional de Protección de Datos de Brasil (ANPD) o ante los organismos de defensa del consumidor.",
        ],
      },
      {
        title: "7. Seguridad",
        paragraphs: [
          "Los datos se aíslan por usuario con políticas de acceso en la base de datos, se transmiten por conexiones cifradas y los archivos subidos se validan y nunca se ejecutan. Los registros de la aplicación no contienen el contenido de los currículums.",
          "Si ocurre un incidente de seguridad que pueda causar un riesgo o daño relevante a los titulares, lo comunicaremos a la ANPD y a los titulares afectados, conforme al art. 48 de la LGPD.",
        ],
      },
      {
        title: "8. Cookies",
        paragraphs: ["Solo usamos cookies necesarias para la autenticación y para recordar el idioma de la interfaz."],
      },
    ],
  },
  terms: {
    title: "Términos de uso",
    intro: "Estos términos rigen el uso de CV Match. Al crear una cuenta o usar el servicio, los aceptas junto con la política de privacidad.",
    sections: [
      {
        title: "1. El servicio",
        paragraphs: [
          "CV Match analiza la compatibilidad entre tu currículum y una descripción de oferta y sugiere mejoras. El índice de compatibilidad es una estimación de la herramienta, no una probabilidad de contratación.",
        ],
      },
      {
        title: "2. Sin garantías",
        paragraphs: [
          "No garantizamos entrevistas, ofertas de empleo, decisiones de contratación ni puntuaciones en sistemas de seguimiento de candidatos (ATS). Las decisiones de selección corresponden a cada empleador.",
        ],
      },
      {
        title: "3. Tu responsabilidad",
        paragraphs: [
          "Eres responsable de la veracidad de tu currículum y de todo lo que envíes a empleadores. Las sugerencias — incluidas las generadas por IA — deben ser revisadas por ti antes de usarlas. No agregues competencias, experiencia ni resultados que no tengas.",
        ],
      },
      {
        title: "4. Planes, precios y pagos",
        paragraphs: [
          "Los precios se muestran en reales brasileños (R$) y son precios finales. Los pagos los procesa Stripe, con tarjeta y, cuando se ofrecen en el checkout, con Pix o boleto.",
          "Los paquetes de análisis son compras únicas de créditos que se consumen al ejecutar un análisis. El crédito se devuelve automáticamente si un análisis falla por motivos técnicos.",
          "La suscripción Pro se renueva al final de cada periodo (mensual o cada 3 meses) hasta que la canceles. Puedes cancelarla en cualquier momento en el portal del cliente, accesible desde la página de facturación; no se realizan nuevos cobros y el acceso continúa hasta el final del periodo pagado.",
          "Los precios, límites y beneficios de los planes pueden cambiar; los cambios no afectan a periodos o créditos ya pagados.",
        ],
      },
      {
        title: "5. Derecho de arrepentimiento y reembolsos",
        paragraphs: [
          "Puedes desistir de cualquier compra dentro de los 7 días corridos siguientes al pago, sin necesidad de justificarlo (art. 49 del Código de Defensa del Consumidor, Ley n.º 8.078/1990, y Decreto n.º 7.962/2013).",
          "Si no se ha usado ningún análisis pagado (crédito) de esa compra, el reembolso es total. Si se ha usado una parte, el reembolso es proporcional a los análisis no utilizados.",
          "En las suscripciones, la misma regla se aplica al primer cobro: dentro de los 7 días siguientes puedes desistir y recibir el reembolso total, o proporcional si ya usaste análisis de la suscripción.",
          "Para desistir, envía tu solicitud a {email}, identificando tu cuenta. El reembolso se hace al mismo medio de pago usado en la compra, a través de Stripe, y los créditos reembolsados se retiran de tu cuenta.",
        ],
      },
      {
        title: "6. Uso aceptable",
        paragraphs: [
          "No subas contenido que no tengas derecho a usar, archivos maliciosos ni currículums de otras personas sin su consentimiento. No intentes eludir límites, acceder a datos de otros usuarios ni interferir con el servicio.",
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
          "Puedes eliminar tu cuenta en cualquier momento. Podemos suspender cuentas que incumplan estos términos.",
          "Nuestra responsabilidad se rige por la legislación brasileña. Nada de estos términos excluye ni limita los derechos que el Código de Defensa del Consumidor te garantiza como consumidor.",
        ],
      },
      {
        title: "9. Ley aplicable y jurisdicción",
        paragraphs: [
          "Estos términos se rigen por las leyes de la República Federativa de Brasil, incluidos el Código de Defensa del Consumidor (Ley n.º 8.078/1990) y el Marco Civil de Internet (Ley n.º 12.965/2014).",
          "Cualquier controversia puede presentarse ante los tribunales del domicilio del consumidor (art. 101, I, del CDC). Antes, puedes escribirnos a {email} para intentar resolverla.",
        ],
      },
    ],
  },
};

export const marketing: Record<"en" | "pt" | "es", MarketingDict> = { en, pt, es };

export const LEGAL_LAST_UPDATED = "2026-11-02";
