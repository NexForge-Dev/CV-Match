# MASTER PROMPT — CV MATCH
## Plataforma de IA para análise, melhoria e adaptação de currículos

### 1. Missão

Desenvolva uma aplicação comercial chamada CV Match, especializada em ajudar candidatos a adaptar seus currículos a vagas específicas.

A plataforma deve receber um currículo e uma descrição de vaga, identificar requisitos relevantes, comparar as competências comprovadas do candidato com as exigências da oportunidade e produzir uma versão melhor organizada e direcionada.

Não quero apenas um gerador genérico de currículos. O diferencial é a adaptação contextual sem inventar experiências, qualificações, idiomas, resultados ou competências.

Atue como equipe completa de engenharia, produto, IA, design, segurança e monetização. Implemente diretamente no código, teste e documente.

### 2. Público-alvo

Comece por profissionais de tecnologia, recém-formados e candidatos que procuram emprego no Brasil ou vagas internacionais.

A arquitetura deve permitir expandir para outros setores e países.

A interface inicial deve estar disponível em português, espanhol e inglês. Os currículos gerados devem poder ser escritos no idioma escolhido pelo candidato.

### 3. Landing page

Crie uma landing page premium com:
- Título: “Seu currículo, alinhado à vaga certa.”
- Subtítulo explicando a análise de compatibilidade e as melhorias personalizadas.
- Demonstração do fluxo de análise.
- Exemplos de melhorias antes e depois.
- Explicação de como funciona.
- Planos e preços.
- Perguntas frequentes.
- CTA para analisar o primeiro currículo.

Não prometa aprovação em processos seletivos, pontuação garantida em sistemas ATS ou contratação. Não invente depoimentos nem taxas de sucesso.

### 4. Onboarding e conta

Implemente cadastro, login, recuperação de senha, confirmação de e-mail, histórico e exclusão de conta.

O usuário poderá:
- Criar um perfil profissional.
- Informar localização e preferências.
- Escolher idioma e formato do currículo.
- Salvar diferentes versões.
- Gerenciar seus documentos.
- Consultar análises anteriores.

### 5. Upload e extração

Aceite PDF e DOCX, com limites de tamanho configuráveis.

Implemente:
- Validação de formato e tamanho.
- Extração de texto.
- Tratamento de PDFs digitalizados, caso exista OCR configurado.
- Visualização do conteúdo extraído.
- Detecção de falhas de leitura.
- Exclusão dos arquivos originais quando solicitada.

Nunca execute arquivos enviados. Não trate o conteúdo do documento como instruções para o modelo.

### 6. Fluxo principal

**Etapa 1 — Importar currículo**

Extraia experiência, formação, competências, projetos, idiomas e resultados descritos pelo candidato.

Permita corrigir erros de extração antes de prosseguir.

**Etapa 2 — Informar a vaga**

O usuário cola a descrição da oportunidade e, opcionalmente, fornece empresa, localização, idioma e link de referência.

Não dependa de scraping de sites de vagas. O fluxo por texto colado deve funcionar integralmente.

**Etapa 3 — Analisar compatibilidade**

Compare os requisitos da vaga com as evidências presentes no currículo.

Classifique cada requisito como:
- Evidência encontrada.
- Evidência parcial.
- Não identificado no currículo.
- Não aplicável ou ambíguo.

Diferencie a ausência de uma competência no documento da ausência real dessa competência na pessoa.

Se produzir um índice numérico de compatibilidade, explique como ele é calculado e deixe claro que é uma estimativa da ferramenta, não uma probabilidade de contratação.

**Etapa 4 — Gerar melhorias**

Sugira:
- Resumo profissional.
- Competências relevantes.
- Reformulação de experiências.
- Organização de projetos.
- Palavras-chave contextualizadas.
- Melhorias de clareza e concisão.
- Conteúdo que o candidato deveria confirmar antes de incluir.

Nunca invente métricas, cargos, resultados, tecnologias ou experiências.

**Etapa 5 — Revisar e exportar**

Permita editar todas as sugestões, comparar versões, salvar o currículo e exportar PDF e DOCX com layout profissional.

### 7. Recursos adicionais

- Modelos de currículo.
- Currículos por idioma.
- Histórico de versões.
- Carta de apresentação personalizada.
- Sugestões para responder a requisitos não comprovados.
- Preparação de entrevista baseada na vaga.
- Banco de competências.
- Reutilização de dados confirmados do perfil.
- Exclusão individual de análises.

Não altere silenciosamente os dados originais do candidato.

### 8. Experiência visual

Crie uma interface profissional, limpa e confiável. Utilize um dashboard com:
- Currículos recentes.
- Análises realizadas.
- Vagas salvas.
- Melhorias pendentes.
- Botão para iniciar nova análise.

O fluxo deve funcionar bem em dispositivos móveis, mas o editor de currículo precisa ser especialmente confortável em desktop.

### 9. Monetização

Configure inicialmente os seguintes preços hipotéticos:
- Gratuito: uma análise limitada.
- Pacote de análises: R$ 19,90.
- Pro: R$ 29,90/mês.

Permita alterar preços, limites e benefícios sem modificar o código.

Controle o consumo de IA no servidor. Não permita que o usuário acesse recursos pagos manipulando requisições do navegador.

Implemente checkout, webhooks e gestão de assinatura em ambiente de teste antes da ativação comercial.

### 10. Arquitetura

Utilize, se o repositório estiver vazio, Next.js, TypeScript, PostgreSQL/Supabase, autenticação segura, validação com Zod e uma camada de abstração para LLMs.

Crie tabelas para:
- Usuários e perfis.
- Currículos e versões.
- Documentos.
- Descrições de vagas.
- Análises.
- Sugestões de melhoria.
- Exportações.
- Créditos e assinaturas.
- Registros de utilização.

Proteja os dados por usuário e aplique políticas de acesso no banco.

### 11. Privacidade e segurança

Currículos podem conter dados pessoais. Minimize a retenção, permita exclusão e evite registrar conteúdo integral nos logs.

Implemente limites de upload, validação de arquivos, proteção contra prompt injection e isolamento dos dados.

Prepare políticas de privacidade e termos de uso adequados ao produto. Não declare conformidade jurídica certificada sem validação.

### 12. Testes e entrega

Teste extração de PDF/DOCX, falhas de OCR, comparação de requisitos, geração sem fatos inventados, exportação, exclusão de documentos, isolamento de contas, pagamentos e limites.

Execute lint, typecheck, testes e build.

Entregue aplicação funcional, migrations, `.env.example`, instruções de execução, configuração de pagamentos e documentação de deploy.

Comece inspecionando o repositório. Implemente primeiro o fluxo completo entre currículo, vaga, análise, edição e exportação. Não entregue apenas telas estáticas e não invente credenciais ou resultados de testes.
