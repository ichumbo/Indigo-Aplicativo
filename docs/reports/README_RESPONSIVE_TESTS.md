# Guia de Testes e Arquitetura de Responsividade Mobile
## DragonCorp Performance & Fitness • Sistema de Layout Seguro

Este documento detalha os padrões de arquitetura responsiva, a fórmula matemática de compensação de *Safe Area* e o roteiro completo de testes manuais e automatizados para garantir que o aplicativo **DragonCorp** mantenha uma experiência visual impecável em 100% dos dispositivos iOS e Android.

---

## 1. Arquitetura de Safe Area & Tokens de Layout

### A Origem dos Problemas em Telas Modernas
Historicamente, muitos aplicativos móveis utilizavam valores estáticos como `paddingTop: 52` ou envolviam a tela inteira em um `<SafeAreaView>` e somavam novamente `insets.top` no `ScrollView`. Isso gerava dois erros críticos:

1. **Corte na Dynamic Island (iPhone 14 Pro, 15, 16):**
   A Ilha Dinâmica ocupa **59px** de margem superior. Um cabeçalho com `paddingTop: 52` fixo fica com o botão voltar e o título parcialmente encobertos pela câmera física.
2. **Bug do "Vazio Negro" (Double-Padding Bug de ~142px):**
   Quando a tela usa `<SafeAreaView edges={["top", ...]}>` (que já aplica `59px`) e o `ScrollView` interno aplica `topPadding: insets.top + 18` (mais `77px`), o cabeçalho é empurrado **136px a 142px** para baixo, deixando um vazio desproporcional no topo.

### As Regras de Ouro DragonCorp

#### Regra A: Telas com Cabeçalho Fixo Nativo (Padrão Recomendado)
```tsx
import { useResponsiveLayout } from "@/constants/responsive";

export default function MyScreen() {
  const layout = useResponsiveLayout();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* 1. Header fixo com Safe Area dinâmica */}
      <View style={[styles.header, { paddingTop: layout.safeHeaderTop }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Título da Tela</Text>
        <View style={styles.actionSlot} />
      </View>

      {/* 2. ScrollView independente rolando suavemente abaixo do header */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Conteúdo com paddingTop sutil (12px a 16px) */}
      </ScrollView>
    </View>
  );
}
```

#### Regra B: Telas Utilizando `<SafeAreaView>` (Ex: `trainer-profile-tool-screen.tsx`)
```tsx
<SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
  {/* Header fixo no topo do SafeAreaView com padding sutil */}
  <View style={styles.topBar}>
    {/* Botão voltar, Título perfeitamente centralizado, Ações */}
  </View>

  {/* ScrollView NUNCA deve somar insets.top novamente */}
  <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: layout.stackBottomPadding }}>
    {children}
  </ScrollView>
</SafeAreaView>
```

---

## 2. A Métrica `safeHeaderTop`

No arquivo [`constants/responsive.ts`](file:///Users/pumapunku/Documents/GitHub/Indigo-Aplicativo/constants/responsive.ts), definimos o token:
```ts
safeHeaderTop: Math.max(12, insets.top + 8)
```

### Comportamento por Dispositivo:
| Dispositivo | Inset Superior (`insets.top`) | `safeHeaderTop` Resultante | Espaço Visual Útil |
| :--- | :--- | :--- | :--- |
| **iPhone 16 / 15 / 14 Pro (Dynamic Island)** | `59px` | **`67px`** | Botões e textos 8px abaixo da ilha |
| **iPhone 14 / 13 / 12 / 11 / X (Notch Tradicional)** | `47px` | **`55px`** | Alinhamento harmônico com status bar |
| **iPhone SE (2ª e 3ª Geração), iPhone 8** | `20px` | **`28px`** | Espaçamento compacto e proporcional |
| **Android (Punch-Hole ou Barra Padrão)** | `24px` a `32px` | **`32px` a `40px`** | Distância segura dos ícones de status |
| **Web / Telas Cheias sem Inset** | `0px` | **`12px`** | Margem de segurança estética |

---

## 3. Matriz de Centralização Matemática de Cabeçalhos

Em telas de ferramentas do Personal (`trainer-profile-tool-screen.tsx`), o título precisa estar **100% centralizado** na tela, independentemente de haver 0, 1 ou 2 botões na lateral direita:

```ts
const rightButtonsCount = (actionButton ? 1 : 0) + (filterButton ? 1 : 0);
const sideActionsWidth = Math.max(38, rightButtonsCount * 38 + Math.max(0, rightButtonsCount - 1) * 8);
```
- Se a direita tem 0 botões: tanto a esquerda quanto a direita reservam `38px` (largura do botão voltar). O título fica perfeitamente centrado.
- Se a direita tem 1 botão: ambos os lados têm `38px`. O título fica centrado.
- Se a direita tem 2 botões (`38 + 8 + 38 = 84px`): a lateral esquerda compensa com uma caixa fantasma de `84px`, garantindo alinhamento central milimétrico.

---

## 4. Roteiro de Testes Automatizados

Para rodar todos os testes de responsividade e integridade estrutural do aplicativo:

```bash
npm test
```

### O que o teste valida:
1. **Responsividade de Telas Compactas (≤ 375px):** Testa iPhone SE 1ª e 2ª geração, cálculo de padding horizontal (12px-16px) e altura de barra inferior (62px).
2. **Responsividade de Telas Padrão (390px - 430px):** Testa iPhone 14, iPhone 15 Pro Max, margens e insets.
3. **Responsividade de Tablets e iPads (≥ 768px):** Garante teto de largura de conteúdo (`contentMaxWidth = 720px`) para evitar que layouts fiquem esticados.
4. **Cálculo Dinâmico de `safeHeaderTop`:** Testa todos os 5 cenários de insets de hardware.
5. **Auditoria Estática de Código:** Escaneia todos os arquivos em `app/` e `components/` e falha automaticamente se alguém introduzir `paddingTop: 52` fixo.
6. **Auditoria de Duplo Espaçamento:** Garante que o `trainer-profile-tool-screen` não some `layout.topPadding` dentro do `SafeAreaView`.

---

## 5. Roteiro de Testes Manuais

### A. Testando com o Expo Go no Celular Físico
1. Inicie o servidor:
   ```bash
   npm run start -- -c
   ```
2. Abra o app da câmera (iOS) ou o aplicativo Expo Go (Android) e escaneie o QR Code.
3. Acesse as seguintes telas críticas pelo perfil do Personal Trainer:
   - **Central de Feedbacks:** Perfil > Minhas Ferramentas > Feedbacks
   - **Anamneses Recebidas:** Perfil > Minhas Ferramentas > Anamnese
   - **Alunos que Precisam de Atenção:** Perfil > Minhas Ferramentas > Alunos que Precisam de Atenção
   - **Ranking de Frequência:** Perfil > Minhas Ferramentas > Ranking Frequência
   - **Ranking de Evolução:** Perfil > Minhas Ferramentas > Ranking Evolução
   - **Agenda do Personal:** Perfil > Minhas Ferramentas > Agenda
   - **Evolução de Cargas / Performance:** Perfil do Aluno > Performance de Cargas
   - **Comparativo de Avaliações:** Perfil do Aluno > Avaliação Física > Comparar

**Critério de Aprovação:**
- O botão voltar e o título devem estar visíveis logo abaixo da ilha dinâmica/notch, sem espaço vazio exagerado e sem nenhum corte.
- Ao rolar a página, o cabeçalho deve permanecer fixo ou recolher com suavidade.
- A TabBar flutuante inferior não deve sobrepor o último card da lista.

### B. Testando no Simulador iOS (Xcode)
Abra os seguintes simuladores para cobrir todas as categorias de hardware:
1. **iPhone 16 Pro / iPhone 15 Pro:** Valida Dynamic Island (59px inset).
2. **iPhone 14 / iPhone 13:** Valida notch clássico (47px inset).
3. **iPhone SE (3rd generation):** Valida tela de 4.7" sem notch (20px inset).
4. **iPad Pro 11-inch:** Valida layout em tablet com limite de 720px centralizado.

### C. Testando via Google Chrome DevTools (Emulação Mobile)
1. Inicie a versão web ou abra o bundle do Metro no navegador.
2. Pressione `F12` ou `Cmd + Option + I` para abrir as ferramentas de desenvolvedor.
3. Ative o modo dispositivo (`Cmd + Shift + M`).
4. Selecione `iPhone 14 Pro Max` e teste diferentes orientações (Retrato / Paisagem).

---

## 6. Checklist de Validação Visual Pré-Publicação

| Item | Verificação | Status |
| :---: | :--- | :---: |
| 1 | Nenhum elemento interativo (botão voltar, fechar) está cortado pela câmera frontal | [x] Aprovado |
| 2 | Distância equilibrada entre a barra de status e o início do título (8px - 14px) | [x] Aprovado |
| 3 | Título da tela não quebra de forma deselegante em telas de 320px-375px | [x] Aprovado |
| 4 | Modais e Popovers abrem diretamente abaixo dos botões de gatilho | [x] Aprovado |
| 5 | Rolagem do conteúdo possui `paddingBottom` suficiente para não cobrir itens sob a TabBar | [x] Aprovado |
| 6 | Telas de login e recuperação de senha adaptam o formulário com o teclado aberto | [x] Aprovado |
| 7 | Telas de termos de uso e política de privacidade possuem cabeçalho fixo navegável | [x] Aprovado |

---

*Desenvolvido com excelência técnica para DragonCorp Performance & Fitness.*
