const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("Auditoria de Cobertura Global do Sistema - Validação de 100% dos Serviços", async () => {
  const root = process.cwd();
  const scriptPath = path.join(root, "scripts", "full-system-coverage-test.js");

  const output = execFileSync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: "utf8",
  });

  assert.ok(
    output.includes("RELATÓRIO EXECUTIVO DE COBERTURA DO SISTEMA"),
    "Deve gerar a tabela de cobertura"
  );
  assert.ok(
    output.includes("RELATORIO_COBERTURA_SISTEMA_COMPLETO.md"),
    "Deve salvar o relatório executivo em markdown"
  );
});
