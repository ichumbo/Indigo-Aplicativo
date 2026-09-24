# DragonCorp Web Panel — Especificação Oficial de Responsividade
**Documento de Referência Arquitetural e Contrato de Design Responsivo**

---

## 1. Breakpoints Oficiais

O painel web DragonCorp utiliza um sistema contínuo e progressivo baseado em tokens centralizados no arquivo `:root` ([index.css](file:///Users/pumapunku/Documents/GitHub/Indigo-Aplicativo/web/frontend/src/index.css)):

| Faixa | Faixa de Largura | Comportamento do Layout | Sidebar | Cabeçalho (Topbar) |
| :--- | :--- | :--- | :--- | :--- |
| **Extra Pequena (XS)** | 320px – 359px | Mobile compacto, 1 coluna | Drawer sobreposto | Compacto (ícone + menu) |
| **Pequena (SM)** | 360px – 479px | Mobile padrão, 1 coluna | Drawer sobreposto | Compacto (busca expansível) |
| **Intermediária (MD)** | 480px – 767px | Mobile grande / Phablet | Drawer sobreposto | Menu hamburguer + CTA |
| **Tablet (LG)** | 768px – 1023px | Tablet (1–2 colunas fluidas) | Compacta (72px) / Drawer | Busca + CTA + Ações |
| **Notebook (XL)** | 1024px – 1279px | Desktop compacto (2–3 colunas) | Expandida (240px) / Recolhível | Completo com atalhos |
| **Desktop (2XL)** | 1280px – 1535px | Desktop padrão (3–4 colunas) | Expandida (240px) | Completo com atalhos |
| **Ampla (3XL+)** | >= 1536px | Desktop amplo (máx 1600px) | Expandida (240px) | Completo com atalhos |

---

## 2. Comportamento da Sidebar

1. **Desktop Amplo e Padrão (>= 1024px)**:
   - Sidebar posicionada estaticamente com `position: sticky; top: 0; height: 100vh`.
   - Largura padrão: `240px` (ou `72px` quando o usuário opta por recolher).
   - Logotipo completo e nomes das seções visíveis.
   - Perfil do personal com CREF no rodapé.
2. **Mobile e Tablet (< 1024px)**:
   - Sidebar oculta por padrão no fluxo da página (`display: none` ou `position: fixed; left: -100%`).
   - Abre como **Drawer deslizante sobreposto** (`z-index: 100`) acionado pelo botão de menu hamburguer na Topbar.
   - Backdrop escuro semi-transparente com blur (`rgba(0, 0, 0, 0.7)`).
   - Fecha automaticamente ao selecionar qualquer rota, ao pressionar `Escape` ou ao clicar fora (backdrop).
   - Bloqueio de rolagem do `body` (`overflow: hidden`) enquanto o drawer estiver aberto.

---

## 3. Comportamento do Header (Topbar)

1. **Desktop (>= 1024px)**:
   - Barra de busca global com atalho visual (`⌘K` / `Ctrl+K`).
   - Botão de ação primária `+ Montar Treino`.
   - Sino de Notificações com badge de contagem não lida.
   - Dropdown de perfil com avatar e dados do treinador.
2. **Mobile (< 1024px)**:
   - Botão hamburguer visível à esquerda para abrir a sidebar.
   - Busca fluida que colapsa em ícone ou ocupa largura flexível sem empurrar botões.
   - Botão `+ Montar Treino` com texto oculto em telas muito estreitas (< 480px) preservando o ícone acessível (`aria-label="Montar Treino"`).
   - Nenhuma quebra de layout ou rolagem horizontal.

---

## 4. Containers e Espaçamento Fluido

- **Padding da Página**:
  - Desktop: `clamp(20px, 2.5vw, 32px)`.
  - Tablet: `16px 20px`.
  - Mobile: `12px 14px`.
- **Largura Máxima do Conteúdo**: `1440px` centralizado.
- **Isolamento de Overflow**: Todos os containers principais usam `min-width: 0; width: 100%`.

---

## 5. Sistema de Grids e Cards

- **Grids Fluidos com Auto-Fit**:
  ```css
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: clamp(12px, 1.5vw, 20px);
  ```
- **Stat Cards (`stat-card-sleek` / `.stats-grid-4`)**:
  - Mobile (320px – 599px): **Grid 2x2** (`repeat(2, minmax(0, 1fr))`) com padding e tipografia compactos e proporcionais.
  - Tablet (600px – 1023px): **Grid 2x2** (`repeat(2, minmax(0, 1fr))`).
  - Desktop (>= 1024px): **Grid 4 colunas** (`repeat(4, minmax(0, 1fr))`).
- **Preservação de Conteúdo**:
  - Títulos e valores numéricos com `overflow-wrap: break-word` e `text-overflow: ellipsis`.
  - Ícones com tamanhos fixos sem compressão (`flex-shrink: 0`).

---

## 6. Tabelas Responsivas

1. **Tabelas de Dados (Alunos, Treinos, Avaliações, Exercícios)**:
   - Sempre envolvidas em container `.table-responsive-container` com `overflow-x: auto; -webkit-overflow-scrolling: touch;`.
   - Linhas com `white-space: nowrap` onde apropriado para evitar células comprimidas.
   - Suporte alternativo a visualização em **Cards** selecionável no cabeçalho da página.

---

## 7. Formulários Responsivos

- **Desktop**: Layouts em 2 colunas para grupos de campos relacionados (ex: Data e Hora, Carga e Repetições).
- **Mobile (< 640px)**: 1 coluna vertical completa com altura de toque mínima de `44px`.
- Labels posicionados acima dos campos com contraste WCAG AA.

---

## 8. Modais e Diálogos

- **Dimensões Responsivas**:
  - Desktop: `max-width: 600px` (ou `900px` para montador/wizard), `max-height: 85vh`.
  - Mobile: `width: calc(100vw - 20px)`, `max-height: calc(100dvh - 24px)`.
- **Estrutura**:
  - Cabeçalho fixo com botão `X` de fechar sempre visível.
  - Corpo rolável com scroll suave (`overflow-y: auto`).
  - Rodapé fixo com botões de ação empilhados ou lado a lado conforme largura.

---

## 9. Regras de Tipografia e Acessibilidade

- Títulos utilizam `clamp()` para escalonamento proporcional sem quebras abruptas:
  - `h1`: `clamp(18px, 4vw, 24px)`
  - `h2`: `clamp(15px, 3vw, 18px)`
  - `body`: `13px – 14px`
- Suporte a zoom do navegador até 200% sem perda de funcionalidade.
- Preservação estrita do tema Dark Mode e contraste de cores personalizadas do personal.
