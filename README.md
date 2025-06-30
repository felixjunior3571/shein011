# SuperPay Integration API

Sistema completo de integração com SuperPayBR v4 usando Node.js, Express e Supabase.

## 🚀 Características

- ✅ **Webhook-based** - Sem polling, respeita rate limiting
- ✅ **Tokens seguros** - Expiração de 15 minutos
- ✅ **Status completos** - Todos os códigos da SuperPay
- ✅ **Pronto para produção** - Error handling completo
- ✅ **Supabase** - Banco PostgreSQL gerenciado

## 📋 Endpoints

### POST /checkout
Cria uma fatura PIX e retorna QR Code + código copia/cola.

**Body:**
\`\`\`json
{
  "amount": 27.97,
  "description": "Frete PAC - Cartão SHEIN",
  "payer": {
    "name": "João Silva",
    "document": "12345678901",
    "email": "joao@email.com"
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "external_id": "FRETE_1703123456789_abc123",
    "token": "a1b2c3d4e5f6...",
    "amount": 27.97,
    "pix_code": "00020126580014br.gov.bcb.pix...",
    "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "expires_at": "2023-12-21T10:30:00.000Z",
    "status": "pendente"
  }
}
\`\`\`

### POST /webhook/superpay
Recebe atualizações de status da SuperPay.

**Body (enviado pela SuperPay):**
\`\`\`json
{
  "external_id": "FRETE_1703123456789_abc123",
  "status": 5,
  "invoice_id": "inv_123456"
}
\`\`\`

### GET /verifica-status?token=...
Verifica status do pagamento via token.

**Response:**
\`\`\`json
{
  "success": true,
  "paid": true,
  "status": "pago",
  "message": "Pagamento confirmado!",
  "description": "Seu pagamento foi aprovado com sucesso",
  "action": "redirect_success",
  "data": {
    "external_id": "FRETE_1703123456789_abc123",
    "amount": 27.97,
    "status": "pago",
    "paid_at": "2023-12-21T10:15:30.000Z"
  }
}
\`\`\`

## 🔧 Configuração

### 1. Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

\`\`\`env
# SuperPay
SUPERPAY_TOKEN=seu_token_aqui
SUPERPAY_SECRET=sua_chave_secreta_aqui
SUPERPAY_BASE_URL=https://api.superpaybr.com

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_service_role_key_aqui

# Server
PORT=3000
ALLOWED_ORIGINS=https://seusite.com
WEBHOOK_BASE_URL=https://sua-api.vercel.app
\`\`\`

### 2. Banco de Dados

Execute o SQL no Supabase:

\`\`\`bash
# No painel do Supabase, vá em SQL Editor e execute:
cat scripts/create-payments-table.sql
\`\`\`

### 3. Instalação

\`\`\`bash
npm install
npm start
\`\`\`

## 📊 Status Codes

| Código | Status Interno | Descrição |
|--------|---------------|-----------|
| 1 | aguardando | Aguardando pagamento |
| 2 | processando | Processando |
| 3 | aguardando | Aguardando confirmação |
| 4 | processando | Em análise |
| 5 | **pago** | Pago/Aprovado ✅ |
| 6 | recusado | Recusado ❌ |
| 7 | cancelado | Cancelado ❌ |
| 8 | estornado | Estornado ❌ |
| 9 | vencido | Vencido ❌ |

## 🛡️ Segurança

- ✅ Tokens únicos com 15min de expiração
- ✅ CORS configurado
- ✅ Helmet para headers de segurança
- ✅ Validação de dados de entrada
- ✅ Error handling completo

## 🚀 Deploy

### Vercel
\`\`\`bash
vercel --prod
\`\`\`

### Railway
\`\`\`bash
railway login
railway deploy
\`\`\`

### Docker
\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

## 📝 Logs

O sistema gera logs detalhados:

\`\`\`
🚀 SuperPay Integration API iniciada!
📡 Servidor rodando na porta 3000
🛒 Iniciando checkout: FRETE_1703123456789_abc123
🔄 SuperPay Request: POST /v4/invoices
✅ SuperPay Response: 200 /v4/invoices
✅ Checkout criado com sucesso: FRETE_1703123456789_abc123
🔔 Webhook recebido da SuperPay: {...}
💰 Pagamento confirmado: FRETE_1703123456789_abc123
\`\`\`

## ⚠️ Regras Importantes

1. **Nunca fazer polling** na API da SuperPay
2. **Sempre usar webhooks** para atualizações
3. **Consultar apenas Supabase** no endpoint de status
4. **Tokens expiram em 15 minutos**
5. **Sempre retornar sucesso** nos webhooks

## 🆘 Troubleshooting

### Erro de conexão Supabase
- Verifique SUPABASE_URL e SUPABASE_KEY
- Execute o SQL de criação da tabela

### Erro na SuperPay
- Verifique SUPERPAY_TOKEN e SUPERPAY_SECRET
- Teste com `/health` endpoint

### Webhook não funciona
- Configure WEBHOOK_BASE_URL corretamente
- Adicione a URL no painel da SuperPay

## 📞 Suporte

Para dúvidas sobre a integração SuperPay, consulte a documentação oficial ou entre em contato com o suporte.
\`\`\`

```plaintext file="CREDENTIALS_GUIDE.md"
# 🔐 Guia Completo de Credenciais - SuperPay Integration

## 📍 Onde Encontrar Cada Credencial

### 🏦 SuperPay Credentials

#### 1. SUPERPAY_TOKEN
- **Onde encontrar:** Painel SuperPay → Configurações → API → Tokens
- **Caminho:** https://painel.superpaybr.com → Menu lateral → "API" → "Tokens"
- **Formato:** `sp_live_abc123...` ou `sp_test_abc123...`
- **Exemplo:** `sp_live_1234567890abcdef1234567890abcdef`

#### 2. SUPERPAY_SECRET
- **Onde encontrar:** Painel SuperPay → Configurações → API → Chaves Secretas
- **Caminho:** https://painel.superpaybr.com → Menu lateral → "API" → "Webhooks"
- **Formato:** String aleatória de 32+ caracteres
- **Exemplo:** `sk_live_abcdef1234567890abcdef1234567890`

#### 3. SUPERPAY_BASE_URL
- **Valor fixo:** `https://api.superpaybr.com`
- **Não precisa alterar:** Esta é a URL oficial da API v4

### 🗄️ Supabase Credentials

#### 1. SUPABASE_URL
- **Onde encontrar:** Dashboard Supabase → Settings → API → Project URL
- **Caminho:** https://supabase.com/dashboard → Seu projeto → Settings → API
- **Formato:** `https://[projeto-id].supabase.co`
- **Exemplo:** `https://abcdefghijklmnop.supabase.co`

#### 2. SUPABASE_KEY
- **Onde encontrar:** Dashboard Supabase → Settings → API → service_role secret
- **Caminho:** https://supabase.com/dashboard → Seu projeto → Settings → API
- **Tipo:** Use a chave `service_role` (não a `anon public`)
- **Formato:** String longa começando com `eyJ...`
- **Exemplo:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 🔧 Configurações do Servidor

#### 1. PORT
- **Valor padrão:** `3000`
- **Descrição:** Porta onde o servidor vai rodar
- **Exemplo:** `3000`, `8080`, `5000`

#### 2. ALLOWED_ORIGINS
- **Descrição:** URLs permitidas para CORS
- **Formato:** URLs separadas por vírgula
- **Exemplo:** `https://meusite.com,https://www.meusite.com`
- **Para desenvolvimento:** `*` (permite todas)

#### 3. WEBHOOK_BASE_URL
- **Descrição:** URL base da sua API para webhooks
- **Formato:** URL completa sem barra final
- **Exemplo:** `https://minha-api.vercel.app`
- **Importante:** SuperPay vai chamar `${WEBHOOK_BASE_URL}/webhook/superpay`

#### 4. WEBHOOK_SECRET_KEY (Opcional)
- **Descrição:** Chave para validar webhooks (opcional)
- **Formato:** String aleatória
- **Exemplo:** `minha-chave-secreta-webhook-123`

## 🚀 Passo a Passo Completo

### Passo 1: Criar Conta SuperPay
1. Acesse https://superpaybr.com
2. Crie sua conta
3. Faça login no painel: https://painel.superpaybr.com

### Passo 2: Obter Credenciais SuperPay
1. No painel, vá em **API** → **Tokens**
2. Copie seu `SUPERPAY_TOKEN`
3. Vá em **API** → **Webhooks**
4. Copie sua `SUPERPAY_SECRET`

### Passo 3: Criar Projeto Supabase
1. Acesse https://supabase.com
2. Crie um novo projeto
3. Aguarde a criação (2-3 minutos)

### Passo 4: Obter Credenciais Supabase
1. No dashboard, vá em **Settings** → **API**
2. Copie a **Project URL** (`SUPABASE_URL`)
3. Copie a chave **service_role secret** (`SUPABASE_KEY`)

### Passo 5: Configurar .env
\`\`\`env
# SuperPay
SUPERPAY_TOKEN=sp_live_seu_token_aqui
SUPERPAY_SECRET=sk_live_sua_secret_aqui
SUPERPAY_BASE_URL=https://api.superpaybr.com

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server
PORT=3000
ALLOWED_ORIGINS=https://seusite.com
WEBHOOK_BASE_URL=https://sua-api.vercel.app
\`\`\`

### Passo 6: Criar Tabela no Supabase
1. No Supabase, vá em **SQL Editor**
2. Execute o conteúdo de `scripts/create-payments-table.sql`
3. Clique em **Run** para criar a tabela

### Passo 7: Configurar Webhook na SuperPay
1. No painel SuperPay, vá em **API** → **Webhooks**
2. Adicione a URL: `https://sua-api.vercel.app/webhook/superpay`
3. Selecione os eventos de pagamento
4. Salve a configuração

## ⚠️ Dicas Importantes

### Ambiente de Teste vs Produção
- **Teste:** Use tokens que começam com `sp_test_`
- **Produção:** Use tokens que começam com `sp_live_`

### Segurança
- ✅ Nunca commite o arquivo `.env`
- ✅ Use variáveis de ambiente no deploy
- ✅ Mantenha as chaves secretas seguras
- ✅ Use HTTPS em produção

### Troubleshooting Comum

#### Erro: "SUPERPAY_TOKEN não está definida"
- Verifique se o arquivo `.env` existe
- Confirme se a variável está sem espaços
- Reinicie o servidor após alterar `.env`

#### Erro: "Conexão Supabase falhou"
- Verifique se a URL está correta
- Confirme se está usando a chave `service_role`
- Teste a conexão no painel do Supabase

#### Webhook não funciona
- Confirme se a URL está acessível publicamente
- Verifique se não há firewall bloqueando
- Teste com ferramentas como ngrok em desenvolvimento

## 📞 Suporte

### SuperPay
- Documentação: https://docs.superpaybr.com
- Suporte: suporte@superpaybr.com

### Supabase
- Documentação: https://supabase.com/docs
- Comunidade: https://github.com/supabase/supabase/discussions

### Este Sistema
- Verifique os logs do servidor
- Use o endpoint `/health` para testar
- Consulte o README.md para mais detalhes
