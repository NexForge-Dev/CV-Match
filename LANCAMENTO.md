# Checklist de lançamento — CV Match

Guia curto para colocar o CV Match no ar e começar a vender. Detalhes técnicos: `docs/DEPLOYMENT.md` e `docs/PAYMENTS.md`.

## 1. Contas e chaves a criar

| Serviço | O que criar | Variável(eis) | Obrigatório? |
|---|---|---|---|
| Supabase | Projeto novo (região UE: Frankfurt/Paris), plano Pro recomendado (backups) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API) | Sim |
| Stripe | Conta verificada; primeiro modo **teste**, depois **live** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Sim (para cobrar) |
| SMTP (Resend, Postmark, SendGrid, SES…) | Remetente com domínio verificado (SPF/DKIM) | Configurado **no painel do Supabase** (Authentication → Emails → SMTP), não no `.env` | Sim (confirmação de e-mail e recuperação de senha) |
| Anthropic | Chave de API + limite mensal de gasto no Console | `ANTHROPIC_API_KEY` | Não (sem ela o motor de regras gratuito funciona) |
| Vercel | Projeto importado do GitHub + domínio próprio | `NEXT_PUBLIC_APP_URL=https://SEU_DOMINIO` | Sim |
| Cloudflare Turnstile | Widget (modo *Managed*) com o domínio de produção; gera **site key** (pública) e **secret key** | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (Vercel) + secret key **no painel do Supabase** (Authentication → Attack protection) | Recomendado (cada conta nova ganha 1 análise grátis). Ordem obrigatória: ver §2 |
| — | Segredo aleatório (`openssl rand -hex 32`) | `CRON_SECRET` | Sim |
| — | Dados do responsável legal | `LEGAL_OPERATOR_NAME`, `LEGAL_OPERATOR_TAX_ID` (NIF/CNPJ), `LEGAL_OPERATOR_ADDRESS`, `LEGAL_CONTACT_EMAIL`, `LEGAL_BACKUP_RETENTION_DAYS` | Sim (aparecem em `/legal` e `/privacy`) |

Todas as variáveis estão comentadas em `.env.example`. Onde colar: **Vercel → Settings → Environment Variables**
(Production = chaves live, Preview = chaves de teste). Nunca coloque chaves no repositório.

## 2. Banco de dados (Supabase Cloud)

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push          # aplica supabase/migrations/* (tabelas, RLS, funções, planos, bucket privado)
```

No painel do Supabase:
- Authentication → URL Configuration: Site URL `https://SEU_DOMINIO`; Redirect URL `https://SEU_DOMINIO/auth/callback`.
- Authentication → Providers → Email: **Confirm email** ligado; senha mínima 8.
- Authentication → Emails → SMTP: configure o remetente próprio (o padrão do Supabase tem limite baixo de envios).
- Authentication → Attack protection → CAPTCHA (Turnstile) — **só depois** que o deploy com o captcha estiver no ar:
  1. Crie o widget no Cloudflare Turnstile e coloque a site key em `NEXT_PUBLIC_TURNSTILE_SITE_KEY` na Vercel.
  2. Faça um novo deploy (variáveis `NEXT_PUBLIC_*` só entram no build) e confira que login, cadastro e
     "esqueci a senha" mostram o widget.
  3. Só então ative o CAPTCHA no Supabase com a **secret key** do Turnstile.
  Se ativar no Supabase antes do passo 2, **todo login/cadastro falha** ("captcha protection: request disallowed").
  Para desligar: primeiro desative no Supabase, depois remova a variável.
- Database → Advisors: depois do `db push`, os avisos de performance/segurança de RLS e `search_path`
  devem sumir (migration `20261102000006_advisors.sql`).
- (Opcional) traduza os templates de e-mail (Authentication → Emails → Templates) para PT/ES.

## 3. Stripe

1. Em modo teste: coloque `STRIPE_SECRET_KEY=sk_test_...` e rode `ENV_FILE=.env.production.local npm run stripe:sync`
   (cria produtos/preços a partir da tabela `plans`).
2. Developers → Webhooks → endpoint `https://SEU_DOMINIO/api/stripe/webhook` com os eventos listados em
   `docs/PAYMENTS.md`; copie o segredo para `STRIPE_WEBHOOK_SECRET`.
3. Settings → Billing → Customer portal: ative cancelamento de assinatura.
4. Faça uma compra de teste (cartão `4242 4242 4242 4242`). Depois troque para chaves **live**, crie o webhook live
   e rode `stripe:sync` de novo (IDs de preço são diferentes em live).
5. IVA: se tiver registro fiscal, ative Stripe Tax e defina `STRIPE_AUTOMATIC_TAX=true`.

## 4. Deploy

1. Vercel → importar o repositório (preset Next.js) → colar as variáveis → Deploy.
2. Adicionar o domínio e conferir que `NEXT_PUBLIC_APP_URL` é o domínio final (variáveis `NEXT_PUBLIC_*`
   exigem novo deploy quando mudam).
3. O cron diário `/api/cron/cleanup` já está em `vercel.json` (a Vercel envia o `CRON_SECRET` sozinha).
4. As funções rodam em `dub1` (Dublin, `regions` em `vercel.json`), perto do Supabase `eu-west-1`. Se o projeto
   Supabase estiver em outra região, ajuste `regions`.
5. A Content-Security-Policy (`next.config.ts`) é gerada no build a partir de `NEXT_PUBLIC_SUPABASE_URL`: se trocar
   o projeto Supabase, faça um novo deploy.

## 5. Verificação automática

```bash
vercel env pull .env.production.local
ENV_FILE=.env.production.local npm run verify:keys   # precisa terminar sem "blocking issue"
```

## 6. Smoke test manual após o deploy (10 min)

- [ ] `https://SEU_DOMINIO/api/health` → `{"ok":true,"database":true,"config":true}` (`config:false` = variável de servidor inválida/vazia)
- [ ] Landing, `/privacy`, `/terms`, `/legal` abrem e mostram seus dados legais (sem "—").
- [ ] Criar conta com e-mail real → e-mail de confirmação chega → login funciona.
- [ ] "Esqueci a senha" → e-mail chega → nova senha funciona.
- [ ] Enviar um CV PDF e um DOCX → revisar → colar uma vaga → análise grátis.
- [ ] Aceitar sugestões → nova versão → exportar PDF e DOCX.
- [ ] Em `/billing`, os botões de compra só funcionam com a caixa de **consentimento (direito de desistência)**
      marcada; na página da Stripe aparece o aviso junto ao botão de pagar.
- [ ] Comprar o pacote (teste) → créditos aparecem → carta de apresentação e preparação para entrevista.
- [ ] Stripe → Payments → a sessão de checkout tem `withdrawal_waiver=accepted` nos metadados.
- [ ] Assinar Pro (teste) → abrir portal → cancelar.
- [ ] Excluir uma análise, um documento e a conta.
- [ ] Logs da Vercel: só ids e códigos, nunca texto de CV.

## 7. Decisões que só você pode tomar

- Direito de desistência (Diretiva 2011/83/UE art. 16.m; TRLGDCU art. 103.m): antes do checkout o comprador marca
  uma caixa pedindo acesso imediato e reconhecendo a perda dos 14 dias. O consentimento fica nos metadados da
  sessão Stripe (`withdrawal_waiver`, `withdrawal_waiver_at`, `withdrawal_waiver_version`) e nos Termos (seção 4).
  Peça ao advogado para validar o texto (`billing.withdrawalConsent` em `src/lib/i18n/dictionaries.ts`); se mudar,
  atualize `WITHDRAWAL_WAIVER_VERSION` em `src/lib/billing/consent.ts`.
- Revisão jurídica de `/privacy`, `/terms` e `/legal` (textos em `src/lib/i18n/marketing.ts`). Hoje estão escritos
  para RGPD/Espanha (AEPD, LSSI-CE). Se for vender para o Brasil, peça ao advogado para incluir LGPD/ANPD.
- Nomes dos planos são exibidos como estão na tabela `plans` (ex.: "Analysis pack", "Pro (3 months)") em todos
  os idiomas — renomeie no painel do Supabase se quiser outro texto.
- Preços e limites: edite a tabela `plans` e rode `npm run stripe:sync`.
