# 🚀 SuperPay Integration API

Sistema completo de integração com SuperPayBR v4 usando Node.js, Express e Supabase.

## 📋 Características

✅ **Webhook-based**: Sem polling ou cron jobs  
✅ **Seguro**: Tokens únicos com expiração de 15 minutos  
✅ **Completo**: Tratamento de todos os status da SuperPay  
✅ **Produção**: Pronto para deploy com logs e error handling  
✅ **Performance**: Consultas otimizadas apenas no Supabase  

## 🛠️ Instalação

\`\`\`bash
# Clonar e instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Executar script SQL no Supabase
# Copiar conteúdo de scripts/create-payments-table.sql

# Iniciar em desenvolvimento
npm run dev

# Iniciar em produção
npm start
\`\`\`

## 🔧 Configuração

### Variáveis de Ambiente (.env)

\`\`\`env
# SuperPayBR
SUPERPAY_TOKEN=seu_token_aqui
SUPERPAY_SECRET=sua_secret_key_aqui
SUPERPAY_BASE_URL=https://api.superpaybr.com

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_service_role_key_aqui

# Opcional
WEBHOOK_SECRET_KEY=chave_secreta_webhook
WEBHOOK_BASE_URL=https://seu-dominio.com
PORT=3000
\`\`\`

## 📡 Endpoints

### POST /checkout
Cria nova fatura PIX

**Request:**
\`\`\`json
{
  "amount": 27.97,
  "description": "Frete SHEIN",
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com"
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "token": "abc123...",
    "external_id": "FRETE_1703123456_a1b2",
    "qr_code": "data:image/png;base64...",
    "pix_code": "00020126...",
    "amount": 27.97,
    "expires_at": "2023-12-21T10:15:00Z",
    "status_url": "/verifica-status?token=abc123..."
  }
}
\`\`\`

### GET /verifica-status?token=...
Verifica status do pagamento

**Response (Pendente):**
\`\`\`json
{
  "success": true,
  "data": {
    "status": "pendente",
    "paid": false,
    "message": "Aguardando confirmação do pagamento",
    "qr_code": "data:image/png;base64...",
    "pix_code": "00020126..."
  }
}
\`\`\`

**Response (Pago):**
\`\`\`json
{
  "success": true,
  "data": {
    "status": "pago",
    "paid": true,
    "message": "Pagamento confirmado com sucesso!",
    "redirect": "/obrigado",
    "paid_at": "2023-12-21T10:05:30Z"
  }
}
\`\`\`

### POST /webhook/superpay
Recebe webhooks da SuperPay (configurado automaticamente)

## 🔄 Fluxo Completo

1. **Frontend** → `POST /checkout` → Cria fatura e token
2. **Cliente** → Paga PIX no banco
3. **SuperPay** → `POST /webhook/superpay` → Atualiza status
4. **Frontend** → `GET /verifica-status` → Verifica se pago
5. **Redirect** → `/obrigado` se pago

## 🛡️ Status Suportados

| Código | Status | Descrição |
|--------|--------|-----------|
| 1-4 | pendente | Aguardando pagamento |
| 5 | pago | ✅ Pagamento confirmado |
| 6 | recusado | ❌ Pagamento recusado |
| 7 | cancelado | ❌ Pagamento cancelado |
| 8 | estornado | ❌ Pagamento estornado |
| 9 | vencido | ⏰ Pagamento vencido |

## 🚀 Deploy

### Vercel
\`\`\`bash
npm i -g vercel
vercel --prod
\`\`\`

### Railway
\`\`\`bash
railway login
railway init
railway up
\`\`\`

### Docker
\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

## 📊 Logs

O sistema gera logs detalhados para monitoramento:

\`\`\`
🛒 Iniciando checkout: { externalId: 'FRETE_...', amount: 27.97 }
✅ Checkout criado com sucesso: { externalId: '...', token: '...' }
🔔 Webhook recebido da SuperPay: { external_id: '...', status: 5 }
✅ Pagamento atualizado via webhook: { status: 'pago' }
\`\`\`

## ⚠️ Regras Importantes

🚫 **NUNCA** fazer polling na API SuperPay  
✅ **SEMPRE** usar webhooks para atualizações  
✅ **APENAS** consultar Supabase no /verifica-status  
🔐 Tokens expiram em **15 minutos**  
📡 Webhook URL deve estar configurada na SuperPay  

## 🆘 Suporte

- Logs detalhados em todas as operações
- Error handling completo
- Health check em `/health`
- Validações de entrada
- Timeouts configurados
