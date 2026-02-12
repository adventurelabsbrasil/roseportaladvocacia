# Token da Meta que não expira (System User)

O token de **usuário** que você gera no Meta for Developers ou no Graph API Explorer **expira** (geralmente em poucas horas ou dias). Para automação (sync diário, histórico, cron), use um **token de System User** do **Meta Business Manager**, que pode ser **sem data de expiração**.

## Resumo

| Tipo de token | Expira? | Uso |
|---------------|--------|-----|
| Token de usuário (Graph API Explorer / login) | Sim (horas/dias) | Testes rápidos |
| **System User** (Business Manager) | **Não** (ou 60 dias, se quiser) | **Automação em produção** |

## Pré-requisitos

- **Meta Business Manager** (Gerenciador de Negócios) — a conta de anúncios precisa estar vinculada a um negócio.
- **App** no [Meta for Developers](https://developers.facebook.com/) com **Marketing API** (acesso padrão ou superior).
- O **app** deve estar **vinculado ao mesmo Business Manager** (em Configurações do negócio → Contas de anúncios / Apps).

## Passo a passo: token que não expira

### 1. Criar um System User (se ainda não tiver)

1. Acesse [business.facebook.com](https://business.facebook.com) e abra **Configurações do negócio** (ícone de engrenagem).
2. No menu lateral: **Usuários** → **Usuários do sistema**.
3. Clique em **Adicionar**.
4. Nome: por exemplo `Sync Rose Portal`; função: **Administrador** (ou a mínima que permita anúncios).
5. Crie e **não** marque “Requer autenticação em duas etapas”.

### 2. Atribuir ativos ao System User

1. Clique no System User criado.
2. Aba **Contas de anúncios** → **Adicionar contas** → selecione a conta de anúncios usada no projeto → permissão **Acesso total** (ou Leitura).
3. Se o sync usar Page Insights (conversas por página): aba **Páginas** → adicione a página com permissão adequada.

### 3. Instalar o app no System User

1. Ainda em **Usuários do sistema**, clique no System User.
2. Aba **Aplicativos** → **Adicionar aplicativos**.
3. Selecione o **app** do projeto (o mesmo que tem a Marketing API) e confirme.

### 4. Gerar o token (sem expiração)

1. Na mesma tela do System User, clique em **Gerar novo token**.
2. Selecione o **app** no dropdown.
3. Marque as permissões:
   - `ads_read`
   - `ads_management`
   - `business_management`
   - Se usar Page Insights: `pages_read_engagement`, `pages_show_list`, `read_insights`
4. **Não** marque a opção de “token com validade de 60 dias” (ou “expires in 60 days”). Assim o token fica **sem data de expiração**.
5. Clique em **Gerar token**.
6. **Copie e guarde o token** em local seguro (ex.: `.env.local`). A Meta não mostra o valor de novo depois que você sai da tela.

### 5. Usar no projeto

No `.env.local`:

```env
META_ACCESS_TOKEN=SEU_TOKEN_DE_SYSTEM_USER_AQUI
```

O restante (`META_AD_ACCOUNT_ID`, `META_BUSINESS_ID`, etc.) continua igual. O sync e o histórico passam a usar esse token e não vão mais parar por “Session has expired”.

## Se não tiver Business Manager

- Crie um em [business.facebook.com](https://business.facebook.com) e vincule a **Conta de anúncios** e o **App** a esse negócio. Só assim é possível criar System User e gerar token sem expiração pela interface.
- Alternativa técnica (para devs): usar a [API de System Users](https://developers.facebook.com/docs/marketing-api/system-users/install-apps-and-generate-tokens/) com um token de admin do negócio para instalar o app no System User e gerar o token (sem `set_token_expires_in_60_days` = token sem expiração).

## Segurança

- Token **sem expiração** é mais cômodo para automação, mas se vazamento ocorrer, o acesso continua válido até você revogar.
- Boas práticas:
  - Guardar o token só em variáveis de ambiente (nunca commitar no Git).
  - Usar o token apenas em backend/scripts (não no browser).
  - Se suspeitar de vazamento: revogar o token no Business Manager (System User → revogar token) e gerar um novo.

## Referências

- [System Users – Install Apps and Generate Tokens (Meta)](https://developers.facebook.com/docs/marketing-api/system-users/install-apps-and-generate-tokens/)
- [Marketing API – Authentication](https://developers.facebook.com/docs/marketing-api/get-started/authentication/)
