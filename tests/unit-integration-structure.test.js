const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("Teste de Estrutura Integrada por Unidade - Validação Completa de Módulos", async () => {
  const root = process.cwd();
  const scriptPath = path.join(root, "scripts", "unit-integration-structure-test.js");

  const output = execFileSync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: "utf8",
  });

  assert.ok(
    output.includes("RELATÓRIO DE ESTRUTURA INTEGRADA POR UNIDADE"),
    "Deve gerar a matriz de validação estrutural"
  );
  assert.ok(
    output.includes("RELATORIO_ESTRUTURA_INTEGRADA_UNIDADES.md"),
    "Deve salvar o relatório executivo em markdown"
  );
});
