# DragonCorp — Auditoria Funcional Completa: Avaliações Físicas

> **Módulo:** Avaliações Físicas, Protocolos Antropométricos e Composição Corporal  
> **Plataformas:** Mobile (React Native / Expo), Web (React / Vite) e Backend (Laravel REST API / SQLite)  
> **Status Geral:** **APROVADO & SINCRONIZADO**

---

## 1. Visão Geral da Arquitetura de Avaliações Físicas

O sistema de avaliações físicas do DragonCorp permite ao personal trainer registrar avaliações completas e ao aluno visualizar seus relatórios e evolução corporal:

1. **Backend REST API (Laravel Sanctum & SQLite):**
   - Endpoints:
     - `GET /api/v1/assessments`: Lista avaliações com filtro opcional por `studentId`.
     - `POST /api/v1/assessments`: Registra nova avaliação calculando IMC, massa gorda e magra automaticamente.
     - `GET /api/v1/assessments/{id}`: Detalhes da avaliação com autorização IDOR.
     - `GET /api/v1/assessments/compare?first={id}&second={id}`: Comparativo longitudinal entre duas avaliações.
   - Model: `PhysicalAssessment` com colunas JSON: `general_info`, `anamnesis`, `body_composition`, `perimeters`, `skinfolds`, `cardio`, `functional`, `postural`.

2. **Painel Web do Personal Trainer (`/web/frontend`):**
   - `AssessmentsPage.tsx`: Catálogo completo, filtros, impressão de relatório PDF e Wizard em 8 etapas para nova avaliação física.
   - `AssessmentComparePage.tsx`: Comparativo visual com cálculo de deltas de peso, dobras, perímetros e composição.

3. **Aplicativo Mobile (`/app`):**
   - `app/(tabs)/assessments.tsx`: Hub de avaliações do treinador.
   - `app/assessment-editor.tsx`: Editor avançado com coleta de dobras cutâneas, perímetros, fotos posturais com consentimento e anamnese.
   - `app/assessment-detail.tsx`: Exibição de relatórios detalhados.
   - `app/assessment-compare.tsx`: Comparativo entre avaliações consecutivas.
   - `app/student-assessments.tsx`: Tela do aluno para consulta de suas avaliações liberadas.

---

## 2. Tipos de Avaliação e Protocolos Clínicos Oficiais

O DragonCorp implementa os seguintes protocolos de composição corporal validados na literatura:

1. **Jackson & Pollock (7 Dobras - 1978/1980):**
   - Pontos anatômicos: Peitoral, axilar média, tríceps, subescapular, abdômen, suprailíaca, coxa medial.
   - Padrão ouro para adultos de 18 a 61 anos de ambos os sexos.

2. **Jackson & Pollock (3 Dobras):**
   - Homens: Peitoral, abdômen, coxa.
   - Mulheres: Tríceps, suprailíaca, coxa.
   - Aplicação rápida e altamente correlacionada ao protocolo de 7 dobras.

3. **Guedes (3 Dobras - 1985):**
   - Desenvolvido especificamente para a população jovem e adulta brasileira.
   - Homens: Tríceps, abdômen, suprailíaca.
   - Mulheres: Subescapular, suprailíaca, coxa.

4. **Faulkner (4 Dobras - 1968):**
   - Pontos: Tríceps, subescapular, suprailíaca, abdômen.
   - Tradicional na preparação física e avaliação de atletas.

5. **Weltman (Perímetros - 1988):**
   - Indicado para indivíduos com sobrepeso ou obesidade onde a preensão de dobras cutâneas é imprecisa.
   - Utiliza medidas de circunferência e peso corporal.

6. **Bioimpedância Tetrapolar / Bipolar:**
   - Registro direto de % de gordura, massa muscular, água corporal total, gordura visceral e taxa metabólica basal.

---

## 3. Fluxo de Execução, Validação e Cálculos

1. **Entrada de Dados:**
   - Suporte a ponto e vírgula decimal brasileira (ex: `80,5 kg` normalizado para `80.5`).
   - Bloqueio rígido de entradas impossíveis (pesos nulos, negativos ou alturas zero).
   - Prevenção contra `NaN`, `Infinity` e valores indefinidos.

2. **Cálculo da Densidade Corporal (BD):**
   - Executado via equações polinomiais específicas por sexo e protocolo.

3. **Conversão para Percentual de Gordura (%G):**
   - Utiliza a Equação de Siri (1961):  
     $$\%G = \left(\frac{4.95}{\text{Densidade Corporal}} - 4.50\right) \times 100$$
   - Aplicação de limites biológicos válidos (mínimo de 2% e máximo de 65%).

4. **Fracionamento Corporal:**
   - **Massa Gorda (kg):** $\text{Peso} \times \left(\frac{\%G}{100}\right)$
   - **Massa Magra (kg):** $\text{Peso} - \text{Massa Gorda}$
   - **IMC:** $\frac{\text{Peso}}{(\text{Altura em metros})^2}$

---

## 4. Reavaliação e Comparativo Longitudinal

- **Regra do Comparativo:**
  - Ambas as avaliações devem pertencer obrigatoriamente ao mesmo aluno.
  - O cálculo de deltas ($\Delta = \text{Valor}_{\text{Recente}} - \text{Valor}_{\text{Anterior}}$) é realizado com precisão de 1 casa decimal.
  - Indicadores semânticos:
    - $\Delta \text{Peso}$ negativo com $\Delta \text{Massa Magra}$ positivo = recomposição corporal favorável.
    - $\Delta \text{Gordura}$ negativo = redução de adiposidade.
  - Caso o registro anterior possua valor zerado ou ausente para uma medida específica, o comparativo sinaliza como "Sem dado anterior" sem quebrar o relatório.

---

## 5. Fotos Posturais, Privacidade e Consentimento

- **Termo de Consentimento:**
  - O aluno deve conceder consentimento registrado (`PhotoConsent`) antes do upload e visualização das fotografias posturais.
- **Visualizações Posturais Suportadas:**
  - Frontal, Posterior, Lateral Direita, Lateral Esquerda.
- **Marcações Anatômicas:**
  - Identificação de assimetrias (cabeça, ombros, escápulas, coluna torácica/lombar, pelve, joelhos, tornozelos).
- **Segurança:**
  - URLs de fotos posturais não são públicas nem indexáveis.
  - Acesso protegido estritamente pelo identificador do personal e do aluno autenticado.
