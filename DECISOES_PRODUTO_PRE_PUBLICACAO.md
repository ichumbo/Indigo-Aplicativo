# Registro Central de Decisões de Produto — DragonCorp

**Documento de Governança Técnica e Pré-Publicação**  
**Data da Auditoria:** 28 de Agosto de 2026  
**Responsável Técnico:** Engenheiro de Software Sênior & Arquiteto de Aplicações Mobile  

---

## 1. Matriz Central de Decisões de Produto

| Decisão | Estado Atual | Opções | Recomendação Técnica | Responsável | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Idade Mínima Personal** | 18 anos completos | 18 anos / 21 anos | Manter mínimo 18 anos validado no cadastro | Produto / Legal | **Definido** |
| **Alunos Menores de Idade** | Permitido com consentimento | A) Restrito a maiores<br>B) Permitido com consentimento de responsável | Cenário B com termo de consentimento e contato verificado do responsável | Produto / Legal | **Precisa de revisão jurídica** |
| **Consentimento do Responsável** | Módulo de governança implementado | A) Personal declara sozinho<br>B) Registro auditado de dados e permissões | Registro auditado com CPF, telefone, versão do termo e revogação | Legal / Compliance | **Precisa de revisão jurídica** |
| **Países Disponíveis** | Brasil (pt-BR) | A) Apenas Brasil<br>B) Global / Lusofonia | Iniciar com Brasil na fase 1 e expandir na fase 3 | Negócios | **Definido** |
| **Idioma Principal** | Português (Brasil) | Português / Inglês / Espanhol | Manter pt-BR prioritário; preparar strings para i18n | Produto | **Definido** |
| **Preço Mensal Pro** | R$ 49,90 / mês | R$ 39,90 a R$ 69,90 / mês | Manter R$ 49,90 configurado no StoreKit / Play Billing | Negócios / Finanças | **Precisa de aprovação** |
| **Preço Anual Pro** | R$ 479,00 / ano | R$ 399,00 a R$ 549,00 / ano | Desconto de 20% no plano anual | Negócios / Finanças | **Precisa de aprovação** |
| **Teste Grátis (Trial)** | 7 dias | Sem trial / 7 dias / 14 dias | Manter 7 dias no plano Pro com 1 aluno permanente no Free | Negócios | **Precisa de aprovação** |
| **Recursos Gratuitos** | 1 aluno ativo grátis com treinos e avaliações | 1 aluno / Apenas leitura / 15 dias | Manter 1 aluno permanente no Plano Free | Produto / Negócios | **Definido** |
| **Recursos Premium** | Alunos ilimitados, IA, relatórios PDF e rankings | Alunos ilimitados / Limite escalonado | Alunos ilimitados com suporte prioritário | Produto | **Definido** |
| **Limite de Alunos Free** | 1 Aluno Ativo | 1 aluno / 2 alunos | Manter 1 aluno ativo no plano Free | Produto | **Definido** |
| **Limite de Imagens** | 50 MB por usuário / galeria mobile | Sem limite / 50 MB / 200 MB | 50 MB com compressão WebP/JPEG na galeria | Infraestrutura | **Definido** |
| **Limite de Avaliações** | Ilimitadas para alunos vinculados | 1 por mês / Ilimitadas | Ilimitadas para histórico longitudinal completo | Produto | **Definido** |
| **Política de Cancelamento** | Direto nas lojas (iOS/Android) | In-app / Console das lojas | Gestão pelo console oficial da App Store e Google Play | Legal / Finanças | **Definido** |
| **Política de Reembolso** | Regras oficiais Apple e Google | Reembolso próprio / Loja oficial | Submetido às políticas das lojas (7 dias CDC no BR) | Legal | **Definido** |
| **Período de Retenção** | Durante vigência da conta + 5 anos fiscais | Imediato / 5 anos / Indefinido | Manutenção durante conta ativa e descarte na exclusão | Legal (DPO) | **Precisa de revisão jurídica** |
| **Exportação de Dados** | Módulo JSON/HTML LGPD Art. 18 | JSON / CSV / PDF | Exportação estruturada segura de dados pessoais | Engenharia / DPO | **Implementado** |
| **Exclusão de Conta** | In-app + Página Web Pública | Apenas in-app / In-app + Web | In-app + Web Pública (Apple 5.1.1(v) e Google Play) | Engenharia | **Implementado** |
| **Verificação do CREF** | 9 estados com auditoria e upload | A) Auto-declaração<br>B) Auditoria manual/integração | Auditoria manual com upload de carteira profissional | Compliance | **Implementado** |
| **Atendimento e Suporte** | In-app + suporte@dragoncorp.app | In-app / E-mail / WhatsApp | Chamados com protocolo DGC + FAQs + e-mail oficial | Operações | **Implementado** |
| **Prazo de Resposta (SLA)** | Até 24 horas úteis | 12h / 24h / 48h | 24 horas úteis com triagem de severidade | Suporte | **Definido** |
| **Responsável Legal** | DragonCorp Treinamento e Tecnologia Ltda. | Razão Social Oficial | Confirmar CNPJ e registro na Junta Comercial | Diretoria | **Precisa de aprovação** |
| **Controlador dos Dados** | DragonCorp Tecnologia | DPO designado | Nomear encarregado de dados formalmente | Diretoria / Jurídico | **Precisa de aprovação** |
| **E-mail Oficial Suporte** | suporte@dragoncorp.app | suporte@ / contato@ | Configurar e autenticar SPF, DKIM e DMARC | Infraestrutura | **Pendente de configuração externa** |
| **E-mail Oficial DPO** | privacidade@dragoncorp.app | dpo@ / privacidade@ | Caixa dedicada para solicitações de titulares LGPD | Infraestrutura | **Pendente de configuração externa** |
| **Domínio Oficial** | dragoncorp.app | dragoncorp.app / dragoncorp.com.br | Domínio com HTTPS obrigatório e DNS gerenciado | Infraestrutura | **Pendente de configuração externa** |

---

## 2. Classificação de Pendências

### A. Bloqueadores de Publicação (Blockers)
1. **Páginas Públicas em Produção:** O domínio `https://dragoncorp.app` deve estar apontando para os arquivos estáticos de Política de Privacidade, Termos de Uso, Suporte e Exclusão de Conta.
2. **Revisão Jurídica dos Termos:** Aprovação formal do texto de consentimento para alunos menores de 18 anos.
3. **Contas das Lojas:** Validação de identidade (D-U-N-S na Apple e Perfil de Pagamentos no Google Play).

### B. Pendências de Negócio
1. Homologação final dos preços do Plano Pro (R$ 49,90/mês e R$ 479,00/ano).
2. Confirmação do nome empresarial e CNPJ nos termos públicos.

### C. Configurações Externas (Infraestrutura)
1. Criação das caixas postais `suporte@dragoncorp.app` e `privacidade@dragoncorp.app`.
2. Publicação das entradas DNS: `SPF`, `DKIM` e `DMARC`.
