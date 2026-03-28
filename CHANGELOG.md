# Changelog - TaxiControl Pro

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

## [v1.1.0.0] - 2025-01-15

### 🤖 Co-Piloto IA com Voz

#### Funcionalidades Implementadas:
- **Co-Piloto IA**: Assistente virtual inteligente com interface de chat por voz e texto
  - Botão flutuante de microfone com animação pulse (visível em todos os painéis)
  - Saudação automática ao abrir: "Olá! Sou seu co-piloto do sistema TaxiControl Pro..."
  - Gravação de voz via Web Audio API (MediaRecorder)
  - Transcrição de áudio em tempo real (ASR - Speech to Text)
  - Respostas inteligentes da IA (LLM - Large Language Model)
  - Síntese de voz para as respostas (TTS - Text to Speech)
  - Toggle para ativar/desativar voz
  - Histórico de conversa com contexto mantido
  - Indicadores visuais de gravação (vermelho pulsante) e processamento (bolinhas animadas)
  - Design em Sheet lateral direito com header gradiente amber

- **Capacidades do Co-Piloto**:
  - Consultar status de motoristas cadastrados
  - Informar localização em tempo real dos motoristas ativos
  - Detalhar corridas em andamento (origem, destino, valor estimado)
  - Fornecer resumo financeiro (faturamento, total de corridas, distância)
  - Calcular tarifas estimadas com base na configuração atual
  - Relatar corridas recentes finalizadas

- **APIs novas**:
  - `POST /api/copilot` - Chat com IA (consulta DB + LLM)
  - `POST /api/copilot/transcribe` - Transcrição de áudio (ASR)
  - `POST /api/copilot/speak` - Síntese de voz (TTS)

- **Integração**:
  - Disponível no Painel do Motorista e no Painel do Administrador
  - Posicionamento inteligente: acima da nav bar no mobile, canto inferior direito no desktop

---

## [v1.0.0.0] - 2025-01-15

### 🚀 Versão Inicial

#### Funcionalidades Implementadas:
- **Sistema de Autenticação**: Login com email/senha, hash com bcryptjs, tokens de sessão
- **Painel do Motorista**:
  - Dashboard com estatísticas do dia (corridas, faturamento, distância, tarifa)
  - Formulário de nova corrida com cálculo dinâmico de tarifa
  - Rastreamento de corrida ativa com cronômetro e GPS simulado
  - Histórico de corridas com filtro por status
  - Geração de recibo para impressão (window.print)
- **Painel do Administrador**:
  - Dashboard com visão geral (motoristas, corridas, faturamento, ativos)
  - Gerenciamento de motoristas (CRUD com busca e filtro)
  - Mapa em tempo real com polling a cada 5 segundos
  - Relatórios financeiros com filtro por data e motorista, exportação CSV
  - Configurações de tarifa (bandeirada e valor por km)
  - Simulador interativo de cálculo de tarifa
- **APIs RESTful**:
  - `/api/auth/login` - Autenticação
  - `/api/auth/register` - Registro de usuários
  - `/api/auth/me` - Dados do usuário logado
  - `/api/location` - GPS dos motoristas (POST upsert, GET ativos)
  - `/api/trips` - Corridas (POST criar, PUT finalizar, GET listar)
  - `/api/settings` - Configurações (GET/PUT)
  - `/api/reports` - Relatórios financeiros
  - `/api/users` - Gerenciamento de usuários (GET/DELETE)
  - `/api/seed` - Seed do banco com dados demo
- **Design**:
  - Tema amber/amarelo (identidade visual táxi)
  - Mobile-first com navegação bottom bar para motoristas
  - Sidebar responsiva para admin (colapsa em mobile)
  - Animações com framer-motion
  - Modo claro/escuro suportado
  - Componentes shadcn/ui

#### Stack Tecnológica:
- Next.js 16 (App Router)
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui (New York style)
- Prisma ORM (SQLite)
- Zustand (estado cliente)
- Framer Motion (animações)
- Sonner (notificações toast)
- bcryptjs (hash de senhas)

#### Credenciais de Demonstração:
- **Admin**: admin@taxicontrol.com / admin123
- **Motorista**: motorista@taxicontrol.com / motorista123
