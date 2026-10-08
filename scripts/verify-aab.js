#!/usr/bin/env node
/**
 * Script de verificação de permissões do AAB utilizando o bundletool.
 * Uso: node scripts/verify-aab.js [caminho_do_arquivo.aab]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const aabPath = process.argv[2];

if (!aabPath) {
  console.log('\x1b[33m%s\x1b[0m', 'Uso: node scripts/verify-aab.js <caminho_para_o_arquivo.aab>');
  console.log('Exemplo: node scripts/verify-aab.js ./DragonCorp.aab');
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), aabPath);

if (!fs.existsSync(resolvedPath)) {
  console.error('\x1b[31m%s\x1b[0m', `Erro: Arquivo não encontrado: ${resolvedPath}`);
  process.exit(1);
}

console.log('\x1b[36m%s\x1b[0m', `Inspecionando permissões em: ${resolvedPath}...`);

// Determina se bundletool está no PATH ou usa java
let bundletoolCmd = 'bundletool';
try {
  execSync('bundletool version', { stdio: 'ignore' });
} catch {
  // Se não estiver global, verifica se existe bundletool.jar local
  if (fs.existsSync(path.resolve(__dirname, '../bundletool.jar'))) {
    bundletoolCmd = `java -jar "${path.resolve(__dirname, '../bundletool.jar')}"`;
  } else {
    console.error('\x1b[31m%s\x1b[0m', 'Erro: bundletool não foi encontrado no PATH nem como bundletool.jar.');
    process.exit(1);
  }
}

try {
  const manifestDump = execSync(`${bundletoolCmd} dump manifest --bundle="${resolvedPath}" --module=base`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });

  const forbiddenPermissions = [
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'READ_MEDIA_IMAGES',
    'READ_MEDIA_VIDEO'
  ];

  const foundForbidden = forbiddenPermissions.filter(perm => manifestDump.includes(perm));

  if (foundForbidden.length > 0) {
    console.error('\x1b[31m%s\x1b[0m', '❌ FALHA: Foram encontradas permissões restritas no AAB:');
    foundForbidden.forEach(p => console.error(`   - ${p}`));
    console.error('\x1b[31m%s\x1b[0m', 'Não envie este AAB para o Google Play.');
    process.exit(1);
  } else {
    console.log('\x1b[32m%s\x1b[0m', '✅ SUCESSO: Nenhuma permissão de READ_MEDIA_IMAGES ou READ_MEDIA_VIDEO encontrada no AAB!');
    console.log('\x1b[32m%s\x1b[0m', 'Este AAB está 100% em conformidade com as diretrizes do Google Play.');
  }
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', `Erro ao executar bundletool: ${error.message}`);
  process.exit(1);
}
