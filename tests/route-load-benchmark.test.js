const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("Teste de Carga por Rota - Execução Completa e SLA de Performance", async () => {
  const root = process.cwd();
  const scriptPath = path.join(root, "scripts", "route-load-test.js");

  const output = execFileSync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: "utf8",
  });

  assert.ok(output.includes("RELATÓRIO EXECUTIVO DE TESTES DE CARGA POR ROTA"), "Deve gerar o relatório de testes");
  assert.ok(output.includes("RELATORIO_TESTE_DE_CARGA_ROTAS.md"), "Deve persistir o arquivo de relatório");
});
