# 🔐 Guia de Credenciais - SuperPay Integration

## 📋 Onde Encontrar Cada Credencial

### 🏦 SuperPayBR Credentials

#### 1. SUPERPAY_TOKEN
**Onde encontrar:**
- Acesse o painel da SuperPay: https://painel.superpaybr.com
- Faça login na sua conta
- Vá em **"Configurações"** → **"API"** → **"Tokens"**
- Copie o **Token de Produção** ou **Token de Sandbox**

**Exemplo:**
\`\`\`env
SUPERPAY_TOKEN=ykt9tPrVpDSyWyZ
\`\`\`

#### 2. SUPERPAY_SECRET
**Onde encontrar:**
- No mesmo painel da SuperPay
- **"Configurações"** → **"API"** → **"Chaves Secretas"**
- Copie a **Secret Key** correspondente ao seu token

**Exemplo:**
\`\`\`env
SUPERPAY_SECRET=eWt0OXRQclZwRFN5V3laOjoxNzM0OTExODcxMA==
\`\`\`

#### 3. SUPERPAY_BASE_URL
**Valor fixo:**
\`\`\`env
SUPERPAY_BASE_URL=https://api.superpaybr.com
\`\`\`

---

### 🗄️ Supabase Credentials

#### 1. SUPABASE_URL
**Onde encontrar:**
- Acesse: https://supabase.com/dashboard
- Faça login na sua conta
- Selecione seu projeto
- Vá em **"Settings"** → **"API"**
- Copie a **"Project URL"**

**Exemplo:**
\`\`\`env
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
\`\`\`

#### 2. SUPABASE_KEY
**Onde encontrar:**
- No mesmo painel do Supabase
- **"Settings"** → **"API"**
- Copie a **"service_role secret"** (não a anon key)
- ⚠️ **IMPORTANTE**: Use a service_role para operações do servidor

**Exemplo:**
\`\`\`env
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

---

### 🔧 Configurações Opcionais

#### 1. WEBHOOK_SECRET_KEY
**Como gerar:**
\`\`\`bash
# Gerar uma chave aleatória
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\`\`\`

**Exemplo:**
\`\`\`env
WEBHOOK_SECRET_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
\`\`\`

#### 2. PORT
**Valor padrão:**
\`\`\`env
PORT=3000
\`\`\`

#### 3. ALLOWED_ORIGINS
**Para desenvolvimento:**
\`\`\`env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
\`\`\`

**Para produção:**
\`\`\`env
ALLOWED_ORIGINS=https://seu-frontend.com,https://www.seu-site.com
\`\`\`

---

## 🚀 Configuração Passo a Passo

### Passo 1: SuperPay
1. Acesse https://painel.superpaybr.com
2. Faça login ou crie uma conta
3. Vá em **Configurações** → **API**
4. Copie o **Token** e **Secret Key**
5. Configure o **Webhook URL** para: `https://seu-dominio.com/webhook/superpay`

### Passo 2: Supabase
1. Acesse https://supabase.com/dashboard
2. Crie um novo projeto ou selecione existente
3. Vá em **Settings** → **API**
4. Copie a **Project URL** e **service_role key**
5. Execute o SQL do arquivo `scripts/create-payments-table.sql`

### Passo 3: Configurar .env
\`\`\`bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar com suas credenciais
nano .env
\`\`\`

### Passo 4: Testar Conexões
\`\`\`bash
# Instalar dependências
npm install

# Testar em desenvolvimento
npm run dev

# Verificar health check
curl http://localhost:3000/health
\`\`\`

---

## 🔍 Verificação das Credenciais

### Testar SuperPay
\`\`\`bash
curl -X POST http://localhost:3000/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1.00,
    "description": "Teste",
    "customer": {
      "name": "Teste",
      "email": "teste@email.com"
    }
  }'
\`\`\`

### Testar Supabase
\`\`\`bash
# Verificar se a tabela foi criada
curl http://localhost:3000/health
\`\`\`

---

## ⚠️ Segurança

### ✅ Boas Práticas
- **NUNCA** commitar o arquivo `.env`
- Use **service_role key** do Supabase (não anon key)
- Configure **CORS** adequadamente
- Use **HTTPS** em produção
- Mantenha as **chaves secretas** seguras

### 🚫 Não Fazer
- Não usar tokens de sandbox em produção
- Não expor credenciais no frontend
- Não usar anon key do Supabase no servidor
- Não deixar CORS aberto (*) em produção

---

## 🆘 Problemas Comuns

### Erro 401 - SuperPay
- Verificar se o token está correto
- Confirmar se está usando token de produção/sandbox correto
- Verificar se a secret key corresponde ao token

### Erro 403 - Supabase
- Usar service_role key (não anon key)
- Verificar se a URL do projeto está correta
- Confirmar se a tabela foi criada

### Webhook não funciona
- Verificar se a URL está configurada na SuperPay
- Confirmar se o endpoint está acessível publicamente
- Testar com ngrok em desenvolvimento

---

## 📞 Suporte

### SuperPay
- Documentação: https://docs.superpaybr.com
- Suporte: suporte@superpaybr.com

### Supabase
- Documentação: https://supabase.com/docs
- Discord: https://discord.supabase.com
