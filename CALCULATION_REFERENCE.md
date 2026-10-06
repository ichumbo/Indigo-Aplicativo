# DragonCorp — Manual de Referência e Inventário de Fórmulas Clínicas

> **Finalidade:** Catálogo exaustivo de equações antropométricas, cardiorrespiratórias e neuromusculares implementadas no ecossistema DragonCorp.  
> **Diretriz:** Fórmulas puras, fundamentadas na literatura acadêmica, sem invenções e com tratamento estrito de valores nulos, infinitos e limites biológicos.

---

## 1. Índice de Fórmulas

1. Índice de Massa Corporal (IMC / Quetelet)
2. Equação de Siri (1961) — Conversão de Densidade para Percentual de Gordura
3. Equação de Brozek et al. (1963)
4. Protocolo Jackson & Pollock (7 Dobras Cutâneas - 1978 / 1980)
5. Protocolo Jackson & Pollock (3 Dobras Cutâneas - 1978 / 1980)
6. Protocolo Faulkner (4 Dobras Cutâneas - 1968)
7. Protocolo Guedes (3 Dobras Cutâneas - 1985)
8. Protocolo Weltman (Perímetros - 1988)
9. Fracionamento de Massas (Gorda e Magra)
10. Peso Alvo / Peso Ideal
11. Teste de Caminhada de Rockport (VO2Max - 1986)
12. Teste dos 12 Minutos de Cooper (VO2Max - 1968)
13. Equação de Epley (1RM - Força Máxima Estimada - 1985)

---

## 2. Inventário Detalhado

### 2.1 Índice de Massa Corporal (IMC)
- **Fórmula:**  
  $$\text{IMC} = \frac{\text{Peso (kg)}}{(\text{Altura (m)})^2}$$
- **Protocolo:** Quetelet (Adotado pela OMS).
- **Entradas:** Peso em kg, Altura em cm (convertida para metros).
- **Arredondamento:** 1 casa decimal.
- **Limites Biológicos:** Altura $> 0$, Peso $> 0$.
- **Classificação OMS:**
  - $< 18.5$: Abaixo do peso
  - $18.5 - 24.9$: Peso normal
  - $25.0 - 29.9$: Sobrepeso
  - $30.0 - 34.9$: Obesidade Grau I
  - $35.0 - 39.9$: Obesidade Grau II
  - $\ge 40.0$: Obesidade Grau III

---

### 2.2 Equação de Siri (1961)
- **Fórmula:**  
  $$\%G = \left(\frac{4.95}{\text{Densidade Corporal}} - 4.50\right) \times 100$$
- **Fonte:** Siri, W. E. (1961). *Body composition from fluid spaces and density: analysis of methods*.
- **Entradas:** Densidade Corporal ($g/cm^3$).
- **Arredondamento:** 1 casa decimal.
- **Tratamento de Limites:** $2\% \le \%G \le 65\%$. Se Densidade $\le 0$, retorna `null`.

---

### 2.3 Jackson & Pollock — 7 Dobras Cutâneas
- **Fonte:** Jackson, A. S., & Pollock, M. L. (1978, 1980). *Generalized equations for predicting body density of men and women*.
- **Pontos:** Peitoral ($X_1$), Axilar Média ($X_2$), Tríceps ($X_3$), Subescapular ($X_4$), Abdômen ($X_5$), Suprailíaca ($X_6$), Coxa ($X_7$).
- **Somatório:** $\Sigma 7 = X_1 + X_2 + X_3 + X_4 + X_5 + X_6 + X_7$ (em mm).
- **Equação Masculina:**  
  $$\text{BD} = 1.112 - (0.00043499 \times \Sigma 7) + (0.00000055 \times (\Sigma 7)^2) - (0.00028826 \times \text{Idade})$$
- **Equação Feminina:**  
  $$\text{BD} = 1.0970 - (0.00046971 \times \Sigma 7) + (0.00000056 \times (\Sigma 7)^2) - (0.00012828 \times \text{Idade})$$
- **Conversão para %G:** Equação de Siri.

---

### 2.4 Jackson & Pollock — 3 Dobras Cutâneas
- **Fonte:** Jackson, A. S., & Pollock, M. L. (1978, 1980).
- **Homens:** Peitoral, Abdômen, Coxa ($\Sigma 3$).
  $$\text{BD} = 1.10938 - (0.0008267 \times \Sigma 3) + (0.0000016 \times (\Sigma 3)^2) - (0.0002574 \times \text{Idade})$$
- **Mulheres:** Tríceps, Suprailíaca, Coxa ($\Sigma 3$).
  $$\text{BD} = 1.0994921 - (0.0009929 \times \Sigma 3) + (0.0000023 \times (\Sigma 3)^2) - (0.0001392 \times \text{Idade})$$

---

### 2.5 Faulkner — 4 Dobras Cutâneas
- **Fonte:** Faulkner, J. A. (1968). *Physiology of swimming and diving*.
- **Pontos:** Tríceps, Subescapular, Suprailíaca, Abdômen ($\Sigma 4$ em mm).
- **Fórmula Direta de %G:**  
  $$\%G = (\Sigma 4 \times 0.153) + 5.783$$
- **Indicação:** Tradicional para atletas e desportistas.

---

### 2.6 Guedes — 3 Dobras Cutâneas
- **Fonte:** Guedes, D. P. (1985). *Composição Corporal em Populações Brasileiras*.
- **Homens:** Tríceps, Abdômen, Suprailíaca ($\Sigma 3$ em mm).  
  $$\text{BD} = 1.17136 - 0.06706 \times \log_{10}(\Sigma 3)$$
- **Mulheres:** Subescapular, Suprailíaca, Coxa ($\Sigma 3$ em mm).  
  $$\text{BD} = 1.16650 - 0.07063 \times \log_{10}(\Sigma 3)$$
- **Conversão para %G:** Equação de Siri.

---

### 2.7 Weltman (Perímetros para Sobrepeso e Obesidade)
- **Fonte:** Weltman, A. et al. (1988). *Accurate prediction of body composition in obese men and women*.
- **Homens:** Perímetro do Abdômen Médio ($Circ_{Abd}$ em cm), Peso ($P$ em kg).  
  $$\%G = 0.31457 \times Circ_{Abd} - 0.10969 \times P + 10.8336$$
- **Mulheres:** Perímetro do Abdômen Médio ($Circ_{Abd}$ em cm), Altura ($A$ em cm).  
  $$\%G = 0.11077 \times Circ_{Abd} - 0.17666 \times A + 0.14354 \times P + 35.6$$

---

### 2.8 Fracionamento de Massas
- **Massa Gorda (kg):**  
  $$\text{Massa Gorda} = \text{Peso} \times \left(\frac{\%G}{100}\right)$$
- **Massa Magra (kg):**  
  $$\text{Massa Magra} = \text{Peso} - \text{Massa Gorda}$$
- **Peso Alvo / Ideal (kg):**  
  $$\text{Peso Alvo} = \frac{\text{Massa Magra}}{1 - \left(\frac{\%G_{\text{Alvo}}}{100}\right)}$$

---

### 2.9 Teste de Cooper (12 Minutos — VO2Max)
- **Fonte:** Cooper, K. H. (1968). *A means of assessing maximal oxygen intake*.
- **Fórmula:**  
  $$\text{VO2Max (ml/kg/min)} = \frac{\text{Distância percorrida em metros} - 504.9}{44.73}$$
- **Entrada:** Distância em metros percorrida em 12 minutos contínuos.

---

### 2.10 Equação de Epley (1RM — Força Máxima Estimada)
- **Fonte:** Epley, B. (1985). *Poundage Chart*.
- **Fórmula:**  
  $$\text{1RM} = \text{Carga} \times \left(1 + \frac{\text{Repetições}}{30}\right)$$
- **Regra:** Se repetições $= 1$, $\text{1RM} = \text{Carga}$. Se repetições $\le 0$, retorna 0.
- **Arredondamento:** 1 casa decimal.
