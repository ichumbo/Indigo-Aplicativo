# Como adicionar fontes Poppins

Para usar as fontes Poppins reais no aplicativo:

## 1. Baixar fontes
- Acesse: https://fonts.google.com/specimen/Poppins
- Baixe os arquivos TTF e coloque em `assets/fonts/`

## 2. Atualizar _layout.tsx
```tsx
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

const [loaded] = useFonts({
  'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
  'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
  // adicionar outras variantes
});
```

## 3. Usar nos estilos
```tsx
fontFamily: 'Poppins-Bold'
```

Por enquanto, o app usa fontes do sistema como fallback.