/** Landing page and legal copy. App UI strings live in dictionaries.ts. */

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

const en = {
  nav: { pricing: "Pricing", faq: "FAQ", how: "How it works", login: "Log in", start: "Start free" },
  hero: {
    eyebrow: "CV analysis for tech, graduates and jobs in Spain or abroad",
    title: "Your CV, aligned with the right job.",
    subtitle:
      "Paste a job description and upload your CV. CV Match checks each requirement against the evidence in your CV, explains what is found, partial or missing, and suggests targeted improvements — without inventing experience, skills, languages or results.",
    primary: "Analyze my first CV",
    secondary: "See how it works",
    note: "First analysis free. No card required.",
  },
  demo: {
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
    subtitle: "Prices in euros. Pay per pack or subscribe — cancel anytime.",
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
        a: "Payments are processed by Stripe. Packs are one-time purchases of analysis credits. Pro is a monthly or quarterly subscription you can cancel anytime; it stays active until the end of the paid period.",
      },
    ],
  },
  finalCta: {
    title: "Ready to tailor your CV to the next job?",
    text: "Your first analysis is free. Review every change before it goes into your CV.",
    button: "Analyze my first CV",
  },
  footer: {
    tagline: "Honest, evidence-based CV tailoring.",
    privacy: "Privacy policy",
    terms: "Terms of use",
    legal: "Legal notice",
    rights: "All rights reserved.",
  },
  legal: {
    updated: "Last updated",
  },
  legalNotice: {
    title: "Legal notice",
    intro: "Information about the provider of this service, in accordance with Spanish Law 34/2002 on information society services (LSSI-CE).",
    sections: [
      {
        title: "1. Service provider",
        paragraphs: ["Name: {operator}", "Tax ID (NIF): {taxId}", "Address: {address}", "Contact email: {email}"],
      },
      {
        title: "2. Purpose",
        paragraphs: ["CV Match is an online service that compares CVs with job descriptions and suggests improvements. Its use is governed by the terms of use and the privacy policy."],
      },
      {
        title: "3. Intellectual property",
        paragraphs: ["The software, design and texts of CV Match belong to the provider. Content uploaded by users remains theirs."],
      },
    ] as LegalSection[],
  },
  privacy: {
    title: "Privacy policy",
    intro:
      "This policy explains how CV Match processes personal data when you use the service. CVs contain personal data, so we collect as little as possible and keep it only as long as needed.",
    sections: [
      {
        title: "1. Controller and contact",
        paragraphs: [
          "The controller of your personal data is {operator} (tax ID {taxId}), {address}. For any privacy request, contact {email}.",
        ],
      },
      {
        title: "2. Data we process",
        paragraphs: [
          "Account data: email address and authentication data.",
          "Profile data you enter: name, headline, location, preferences and skill bank.",
          "CV content: text extracted from the documents you upload or paste, the structured CV you review, and the versions you save.",
          "Job descriptions you paste, analyses, suggestions, cover letters and interview preparation generated for you.",
          "Billing data: plan, credits and subscription status. Card details are handled by Stripe and never reach our servers.",
          "Technical usage records (e.g. number of analyses, AI tokens consumed) that never include CV content.",
        ],
      },
      {
        title: "3. Purposes and legal bases",
        paragraphs: [
          "To provide the service you request (performance of a contract): extracting, analysing and improving your CV and exporting documents.",
          "To process payments and prevent abuse (contract and legitimate interest).",
          "To comply with legal obligations, such as accounting and tax rules for payments.",
        ],
      },
      {
        title: "4. Data minimisation and retention",
        paragraphs: [
          "Original uploaded files are not stored by default: the text is extracted in memory and the file is discarded. If file storage is enabled, originals are kept in private storage and deleted automatically after a limited period or when you request it.",
          "Extracted text, CVs, versions, jobs and analyses are kept until you delete them or delete your account.",
          "Deletion removes your data from the live service immediately. Copies may remain in encrypted infrastructure backups until those backups expire, at most {backupDays} days after deletion; they are not used to restore your data.",
          "Payment records may be retained for the period required by law.",
        ],
      },
      {
        title: "5. Processors and transfers",
        paragraphs: [
          "Vercel (application hosting and technical request logs), Supabase (database, authentication and file storage), Stripe (payments) and Anthropic (AI processing of CV and job text to structure documents and write suggestions; Anthropic does not use this data to train its models). These providers act on our instructions under data processing agreements.",
          "Some of these providers are based in the United States. Transfers rely on the EU-US Data Privacy Framework where the provider is certified and, in all cases, on the Standard Contractual Clauses approved by the European Commission.",
          "We do not sell your personal data and do not use it for advertising.",
        ],
      },
      {
        title: "6. Your rights",
        paragraphs: [
          "You can access, rectify, export (portability), restrict or erase your data, and object to processing. Most of these can be done directly in the app: edit your profile and CVs, delete documents and analyses, and delete your account. For anything else, contact us.",
          "You may also lodge a complaint with your data protection authority (in Spain, the Agencia Española de Protección de Datos).",
        ],
      },
      {
        title: "7. Security",
        paragraphs: [
          "Data is isolated per user with database access policies, transmitted over encrypted connections, and uploaded files are validated and never executed. Application logs do not contain CV content.",
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
    intro: "By creating an account or using CV Match you agree to these terms.",
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
        title: "4. Plans, payments and refunds",
        paragraphs: [
          "Payments are processed by Stripe. Analysis packs are one-time purchases of credits that are consumed when an analysis is run. A credit is returned automatically if an analysis fails for technical reasons.",
          "Pro subscriptions renew at the end of each billing period (monthly or every 3 months) until cancelled. You can cancel at any time from the billing page; access continues until the end of the paid period. Statutory consumer rights, including any applicable withdrawal rights, are not affected.",
          "Right of withdrawal: packs and subscriptions give access to digital content and services that start as soon as payment is made. Before paying, you expressly request that access start immediately and acknowledge that, once it has started, you lose your 14-day right of withdrawal (art. 16(m) of Directive 2011/83/EU; art. 103(m) of the Spanish consumer law, TRLGDCU). A purchase cannot be made without this consent, which is recorded with the payment and restated on the Stripe payment page.",
          "Prices, limits and plan benefits may change; changes do not affect periods or credits already paid.",
        ],
      },
      {
        title: "5. Acceptable use",
        paragraphs: [
          "Do not upload content you have no right to use, malicious files, or other people's CVs without their consent. Do not attempt to bypass limits, access other users' data or interfere with the service.",
        ],
      },
      {
        title: "6. Your content",
        paragraphs: [
          "You keep all rights to your content. You grant us only the permissions needed to process it to provide the service. You can delete it at any time.",
        ],
      },
      {
        title: "7. Termination and liability",
        paragraphs: [
          "You may delete your account at any time. We may suspend accounts that breach these terms. To the extent permitted by law, the service is provided “as is” and our liability is limited to the amount you paid in the last 12 months.",
        ],
      },
    ] as LegalSection[],
  },
};

export type MarketingDict = typeof en;

const pt: MarketingDict = {
  nav: { pricing: "Preços", faq: "Dúvidas", how: "Como funciona", login: "Entrar", start: "Começar grátis" },
  hero: {
    eyebrow: "Análise de currículo para tecnologia, recém-formados e vagas na Espanha ou no exterior",
    title: "Seu currículo, alinhado à vaga certa.",
    subtitle:
      "Cole a descrição da vaga e envie seu currículo. O CV Match compara cada requisito com as evidências do seu currículo, explica o que foi encontrado, o que é parcial e o que falta, e sugere melhorias direcionadas — sem inventar experiências, competências, idiomas ou resultados.",
    primary: "Analisar meu primeiro currículo",
    secondary: "Ver como funciona",
    note: "Primeira análise grátis. Sem cartão.",
  },
  demo: {
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
    subtitle: "Valores em euros. Compre um pacote ou assine — cancele quando quiser.",
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
        a: "Os pagamentos são processados pela Stripe. Pacotes são compras únicas de créditos de análise. O Pro é uma assinatura mensal ou trimestral que pode ser cancelada a qualquer momento; ela continua ativa até o fim do período pago.",
      },
    ],
  },
  finalCta: {
    title: "Pronto para adaptar seu currículo à próxima vaga?",
    text: "A primeira análise é grátis. Revise cada mudança antes que ela entre no seu currículo.",
    button: "Analisar meu primeiro currículo",
  },
  footer: {
    tagline: "Adaptação de currículo honesta e baseada em evidências.",
    privacy: "Política de privacidade",
    terms: "Termos de uso",
    legal: "Aviso legal",
    rights: "Todos os direitos reservados.",
  },
  legal: {
    updated: "Última atualização",
  },
  legalNotice: {
    title: "Aviso legal",
    intro: "Informações sobre o prestador deste serviço, conforme a Lei espanhola 34/2002 de serviços da sociedade da informação (LSSI-CE).",
    sections: [
      {
        title: "1. Prestador do serviço",
        paragraphs: ["Nome: {operator}", "NIF: {taxId}", "Endereço: {address}", "Email de contato: {email}"],
      },
      {
        title: "2. Finalidade",
        paragraphs: ["O CV Match é um serviço online que compara currículos com descrições de vagas e sugere melhorias. O uso é regido pelos termos de uso e pela política de privacidade."],
      },
      {
        title: "3. Propriedade intelectual",
        paragraphs: ["O software, o design e os textos do CV Match pertencem ao prestador. O conteúdo enviado pelos usuários continua sendo deles."],
      },
    ] as LegalSection[],
  },
  privacy: {
    title: "Política de privacidade",
    intro:
      "Esta política explica como o CV Match trata dados pessoais quando você usa o serviço. Currículos contêm dados pessoais, por isso coletamos o mínimo possível e guardamos apenas pelo tempo necessário.",
    sections: [
      {
        title: "1. Responsável e contato",
        paragraphs: ["O responsável pelo tratamento dos seus dados é {operator} (NIF {taxId}), {address}. Para qualquer solicitação de privacidade, escreva para {email}."],
      },
      {
        title: "2. Dados tratados",
        paragraphs: [
          "Dados de conta: e-mail e dados de autenticação.",
          "Dados de perfil que você informa: nome, título, localização, preferências e banco de competências.",
          "Conteúdo do currículo: texto extraído dos documentos que você envia ou cola, o currículo estruturado que você revisa e as versões que salva.",
          "Descrições de vagas que você cola, análises, sugestões, cartas de apresentação e preparação para entrevistas geradas para você.",
          "Dados de cobrança: plano, créditos e status da assinatura. Os dados do cartão são tratados pela Stripe e nunca chegam aos nossos servidores.",
          "Registros técnicos de uso (por exemplo, número de análises e tokens de IA consumidos), que nunca incluem o conteúdo do currículo.",
        ],
      },
      {
        title: "3. Finalidades e bases legais",
        paragraphs: [
          "Prestar o serviço que você solicita (execução de contrato): extrair, analisar e melhorar seu currículo e exportar documentos.",
          "Processar pagamentos e prevenir abusos (contrato e interesse legítimo).",
          "Cumprir obrigações legais, como regras contábeis e fiscais de pagamentos.",
        ],
      },
      {
        title: "4. Minimização e retenção",
        paragraphs: [
          "Por padrão, os arquivos originais não são armazenados: o texto é extraído em memória e o arquivo é descartado. Se o armazenamento estiver ativado, os originais ficam em armazenamento privado e são excluídos automaticamente após um período limitado ou quando você pedir.",
          "Texto extraído, currículos, versões, vagas e análises ficam guardados até você excluí-los ou excluir a conta.",
          "A exclusão remove seus dados do serviço imediatamente. Cópias podem permanecer em backups criptografados da infraestrutura até expirarem, no máximo {backupDays} dias após a exclusão; elas não são usadas para restaurar seus dados.",
          "Registros de pagamento podem ser mantidos pelo prazo exigido por lei.",
        ],
      },
      {
        title: "5. Operadores e transferências",
        paragraphs: [
          "Vercel (hospedagem da aplicação e logs técnicos de requisições), Supabase (banco de dados, autenticação e armazenamento de arquivos), Stripe (pagamentos) e Anthropic (processamento por IA do texto do currículo e da vaga para estruturar documentos e redigir sugestões; a Anthropic não usa esses dados para treinar seus modelos). Esses fornecedores atuam sob nossas instruções, com acordos de tratamento de dados.",
          "Alguns desses fornecedores estão nos Estados Unidos. As transferências se baseiam no EU-US Data Privacy Framework quando o fornecedor é certificado e, em todos os casos, nas Cláusulas Contratuais Padrão aprovadas pela Comissão Europeia.",
          "Não vendemos seus dados pessoais e não os usamos para publicidade.",
        ],
      },
      {
        title: "6. Seus direitos",
        paragraphs: [
          "Você pode acessar, corrigir, exportar (portabilidade), limitar ou apagar seus dados e se opor ao tratamento. A maioria disso pode ser feita no próprio app: edite perfil e currículos, exclua documentos e análises e exclua sua conta. Para o resto, fale conosco.",
          "Você também pode apresentar reclamação à autoridade de proteção de dados (na Espanha, a Agencia Española de Protección de Datos; no Brasil, a ANPD).",
        ],
      },
      {
        title: "7. Segurança",
        paragraphs: [
          "Os dados são isolados por usuário com políticas de acesso no banco de dados, trafegam por conexões criptografadas, e os arquivos enviados são validados e nunca executados. Os logs da aplicação não contêm conteúdo de currículos.",
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
    intro: "Ao criar uma conta ou usar o CV Match, você concorda com estes termos.",
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
        title: "4. Planos, pagamentos e reembolsos",
        paragraphs: [
          "Os pagamentos são processados pela Stripe. Pacotes de análises são compras únicas de créditos, consumidos quando uma análise é executada. O crédito é devolvido automaticamente se uma análise falhar por motivo técnico.",
          "A assinatura Pro renova ao fim de cada período (mensal ou a cada 3 meses) até ser cancelada. Você pode cancelar a qualquer momento na página de cobrança; o acesso continua até o fim do período pago. Direitos legais do consumidor, incluindo eventual direito de arrependimento, não são afetados.",
          "Direito de arrependimento (desistência): pacotes e assinaturas dão acesso a conteúdo e serviços digitais que começam assim que o pagamento é feito. Antes de pagar, você solicita expressamente o início imediato do acesso e reconhece que, uma vez iniciado, perde o direito de arrependimento de 14 dias (art. 16.º, alínea m), da Diretiva 2011/83/UE; art. 103.m da lei espanhola de defesa do consumidor, TRLGDCU). Não é possível comprar sem esse consentimento, que fica registrado com o pagamento e é repetido na página de pagamento da Stripe.",
          "Preços, limites e benefícios dos planos podem mudar; as mudanças não afetam períodos ou créditos já pagos.",
        ],
      },
      {
        title: "5. Uso aceitável",
        paragraphs: [
          "Não envie conteúdo que você não tem direito de usar, arquivos maliciosos ou currículos de outras pessoas sem consentimento. Não tente contornar limites, acessar dados de outros usuários ou interferir no serviço.",
        ],
      },
      {
        title: "6. Seu conteúdo",
        paragraphs: [
          "Você mantém todos os direitos sobre seu conteúdo. Você nos concede apenas as permissões necessárias para processá-lo e prestar o serviço. Você pode excluí-lo a qualquer momento.",
        ],
      },
      {
        title: "7. Encerramento e responsabilidade",
        paragraphs: [
          "Você pode excluir sua conta a qualquer momento. Podemos suspender contas que violem estes termos. Na medida permitida por lei, o serviço é fornecido “no estado em que se encontra” e nossa responsabilidade se limita ao valor pago por você nos últimos 12 meses.",
        ],
      },
    ],
  },
};

const es: MarketingDict = {
  nav: { pricing: "Precios", faq: "Preguntas", how: "Cómo funciona", login: "Iniciar sesión", start: "Empezar gratis" },
  hero: {
    eyebrow: "Análisis de currículum para tecnología, recién titulados y ofertas en España o en el extranjero",
    title: "Tu currículum, alineado con la oferta adecuada.",
    subtitle:
      "Pega la descripción de la oferta y sube tu currículum. CV Match compara cada requisito con la evidencia de tu currículum, explica qué se encuentra, qué es parcial y qué falta, y sugiere mejoras específicas — sin inventar experiencia, competencias, idiomas ni resultados.",
    primary: "Analizar mi primer currículum",
    secondary: "Ver cómo funciona",
    note: "Primer análisis gratis. Sin tarjeta.",
  },
  demo: {
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
    subtitle: "Precios en euros. Compra un paquete o suscríbete — cancela cuando quieras.",
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
        a: "Los pagos los procesa Stripe. Los paquetes son compras únicas de créditos de análisis. Pro es una suscripción mensual o trimestral que puedes cancelar cuando quieras; sigue activa hasta el final del periodo pagado.",
      },
    ],
  },
  finalCta: {
    title: "¿Listo para adaptar tu currículum a la próxima oferta?",
    text: "El primer análisis es gratis. Revisa cada cambio antes de que entre en tu currículum.",
    button: "Analizar mi primer currículum",
  },
  footer: {
    tagline: "Adaptación de currículum honesta y basada en evidencias.",
    privacy: "Política de privacidad",
    terms: "Términos de uso",
    legal: "Aviso legal",
    rights: "Todos los derechos reservados.",
  },
  legal: {
    updated: "Última actualización",
  },
  legalNotice: {
    title: "Aviso legal",
    intro: "Información sobre el titular de este servicio, conforme a la Ley 34/2002 de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE).",
    sections: [
      {
        title: "1. Titular del servicio",
        paragraphs: ["Titular: {operator}", "NIF: {taxId}", "Domicilio: {address}", "Correo electrónico de contacto: {email}"],
      },
      {
        title: "2. Objeto",
        paragraphs: ["CV Match es un servicio en línea que compara currículums con descripciones de ofertas y sugiere mejoras. Su uso se rige por los términos de uso y la política de privacidad."],
      },
      {
        title: "3. Propiedad intelectual",
        paragraphs: ["El software, el diseño y los textos de CV Match pertenecen al titular. El contenido que suben los usuarios sigue siendo suyo."],
      },
    ] as LegalSection[],
  },
  privacy: {
    title: "Política de privacidad",
    intro:
      "Esta política explica cómo CV Match trata los datos personales cuando usas el servicio. Los currículums contienen datos personales, así que recogemos lo mínimo y lo conservamos solo el tiempo necesario.",
    sections: [
      {
        title: "1. Responsable y contacto",
        paragraphs: ["El responsable del tratamiento de tus datos es {operator} (NIF {taxId}), {address}. Para cualquier solicitud de privacidad, escribe a {email}."],
      },
      {
        title: "2. Datos que tratamos",
        paragraphs: [
          "Datos de cuenta: correo electrónico y datos de autenticación.",
          "Datos de perfil que introduces: nombre, titular, ubicación, preferencias y banco de competencias.",
          "Contenido del currículum: texto extraído de los documentos que subes o pegas, el currículum estructurado que revisas y las versiones que guardas.",
          "Descripciones de ofertas que pegas, análisis, sugerencias, cartas de presentación y preparación de entrevistas generadas para ti.",
          "Datos de facturación: plan, créditos y estado de la suscripción. Los datos de la tarjeta los gestiona Stripe y nunca llegan a nuestros servidores.",
          "Registros técnicos de uso (p. ej. número de análisis y tokens de IA consumidos), que nunca incluyen el contenido del currículum.",
        ],
      },
      {
        title: "3. Finalidades y bases jurídicas",
        paragraphs: [
          "Prestar el servicio que solicitas (ejecución de un contrato): extraer, analizar y mejorar tu currículum y exportar documentos.",
          "Procesar pagos y prevenir abusos (contrato e interés legítimo).",
          "Cumplir obligaciones legales, como las normas contables y fiscales de los pagos.",
        ],
      },
      {
        title: "4. Minimización y conservación",
        paragraphs: [
          "Por defecto no se guardan los archivos originales: el texto se extrae en memoria y el archivo se descarta. Si el almacenamiento está activado, los originales se guardan en almacenamiento privado y se eliminan automáticamente tras un periodo limitado o cuando lo pidas.",
          "El texto extraído, los currículums, versiones, ofertas y análisis se conservan hasta que los elimines o elimines tu cuenta.",
          "La eliminación borra tus datos del servicio de inmediato. Pueden quedar copias en copias de seguridad cifradas de la infraestructura hasta que caduquen, como máximo {backupDays} días después de la eliminación; no se usan para restaurar tus datos.",
          "Los registros de pago pueden conservarse durante el plazo que exija la ley.",
        ],
      },
      {
        title: "5. Encargados y transferencias",
        paragraphs: [
          "Vercel (alojamiento de la aplicación y registros técnicos de peticiones), Supabase (base de datos, autenticación y almacenamiento de archivos), Stripe (pagos) y Anthropic (procesamiento con IA del texto del currículum y de la oferta para estructurar documentos y redactar sugerencias; Anthropic no usa estos datos para entrenar sus modelos). Estos proveedores actúan siguiendo nuestras instrucciones mediante contratos de encargo del tratamiento.",
          "Algunos de estos proveedores están en Estados Unidos. Las transferencias se basan en el Marco de Privacidad de Datos UE-EE. UU. cuando el proveedor está certificado y, en todo caso, en las Cláusulas Contractuales Tipo aprobadas por la Comisión Europea.",
          "No vendemos tus datos personales ni los usamos para publicidad.",
        ],
      },
      {
        title: "6. Tus derechos",
        paragraphs: [
          "Puedes acceder, rectificar, exportar (portabilidad), limitar o suprimir tus datos y oponerte al tratamiento. La mayoría se puede hacer en la propia aplicación: edita tu perfil y currículums, elimina documentos y análisis y elimina tu cuenta. Para lo demás, contáctanos.",
          "También puedes presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) u otra autoridad competente.",
        ],
      },
      {
        title: "7. Seguridad",
        paragraphs: [
          "Los datos se aíslan por usuario con políticas de acceso en la base de datos, se transmiten por conexiones cifradas y los archivos subidos se validan y nunca se ejecutan. Los registros de la aplicación no contienen el contenido de los currículums.",
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
    intro: "Al crear una cuenta o usar CV Match aceptas estos términos.",
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
          "Eres responsable de la veracidad de tu currículum y de todo lo que envíes a empleadores. Las sugerencias — incluidas las generadas por IA — deben ser revisadas por ti antes de usarlas. No añadas competencias, experiencia ni resultados que no tengas.",
        ],
      },
      {
        title: "4. Planes, pagos y reembolsos",
        paragraphs: [
          "Los pagos los procesa Stripe. Los paquetes de análisis son compras únicas de créditos que se consumen al ejecutar un análisis. El crédito se devuelve automáticamente si un análisis falla por motivos técnicos.",
          "La suscripción Pro se renueva al final de cada periodo (mensual o cada 3 meses) hasta que la canceles. Puedes cancelarla en cualquier momento desde la página de facturación; el acceso continúa hasta el final del periodo pagado. Esto no afecta a tus derechos legales como consumidor, incluido el derecho de desistimiento cuando proceda.",
          "Derecho de desistimiento: los paquetes y las suscripciones dan acceso a contenidos y servicios digitales que comienzan en cuanto se realiza el pago. Antes de pagar, solicitas expresamente que el acceso comience de inmediato y aceptas que, una vez iniciado, pierdes tu derecho de desistimiento de 14 días (art. 103.m del Real Decreto Legislativo 1/2007, TRLGDCU; art. 16.m de la Directiva 2011/83/UE). No es posible comprar sin este consentimiento, que queda registrado con el pago y se recuerda en la página de pago de Stripe.",
          "Los precios, límites y beneficios de los planes pueden cambiar; los cambios no afectan a periodos o créditos ya pagados.",
        ],
      },
      {
        title: "5. Uso aceptable",
        paragraphs: [
          "No subas contenido que no tengas derecho a usar, archivos maliciosos ni currículums de otras personas sin su consentimiento. No intentes eludir límites, acceder a datos de otros usuarios ni interferir con el servicio.",
        ],
      },
      {
        title: "6. Tu contenido",
        paragraphs: [
          "Conservas todos los derechos sobre tu contenido. Solo nos concedes los permisos necesarios para tratarlo y prestar el servicio. Puedes eliminarlo en cualquier momento.",
        ],
      },
      {
        title: "7. Baja y responsabilidad",
        paragraphs: [
          "Puedes eliminar tu cuenta en cualquier momento. Podemos suspender cuentas que incumplan estos términos. En la medida permitida por la ley, el servicio se presta “tal cual” y nuestra responsabilidad se limita al importe que hayas pagado en los últimos 12 meses.",
        ],
      },
    ],
  },
};

export const marketing: Record<"en" | "pt" | "es", MarketingDict> = { en, pt, es };

export const LEGAL_LAST_UPDATED = "2026-11-02";
