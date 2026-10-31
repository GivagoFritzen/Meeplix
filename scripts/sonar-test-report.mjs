#!/usr/bin/env node
/**
 * Converte o relatório JUnit gerado pelo Vitest (coverage/junit.xml)
 * para o formato "Generic Test Executions" aceito pelo SonarQube.
 *
 * Uso: node scripts/sonar-test-report.mjs [entrada] [saida]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const input = process.argv[2] ?? "coverage/junit.xml";
const output = process.argv[3] ?? "coverage/sonar-test-report.xml";

/** Escapa caracteres especiais de XML. */
function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Desfaz entidades já escapadas no XML de origem para evitar escape duplo. */
function unescapeXml(value = "") {
  return String(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Normaliza caminhos do Windows para o padrão usado pelo Sonar. */
function normalizePath(filePath) {
  return filePath
    .replace(/\\/g, "/")
    .replace(/^[A-Za-z]:\//, "")
    .replace(/^\/+/, "");
}

const xml = readFileSync(resolve(input), "utf8");
const suites = [...xml.matchAll(/<testsuite\b([^>]*)>([\s\S]*?)<\/testsuite>/g)];
const report = ["<testExecutions version=\"1\">"];
let total = 0;

for (const [, suiteAttrs, suiteBody] of suites) {
  const suiteName = /\bname="([^"]*)"/.exec(suiteAttrs)?.[1] ?? "";
  const filePath = normalizePath(suiteName);
  if (!filePath) continue;

  const cases = [...suiteBody.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)];
  if (cases.length === 0) continue;

  report.push(`  <file path="${escapeXml(filePath)}">`);

  for (const [, caseAttrs, , caseBody = ""] of cases) {
    const name = unescapeXml(/\bname="([^"]*)"/.exec(caseAttrs)?.[1] ?? "(sem nome)");
    const time = Number(/\btime="([^"]*)"/.exec(caseAttrs)?.[1] ?? 0);
    const duration = Number.isFinite(time) ? Math.round(time * 1000) : 0;

    const failure = /<failure\b[^>]*?(?:message="([^"]*)")?[^>]*>([\s\S]*?)<\/failure>/.exec(caseBody);
    const error = /<error\b[^>]*?(?:message="([^"]*)")?[^>]*>([\s\S]*?)<\/error>/.exec(caseBody);
    const skipped = /<skipped\b/.test(caseBody);

    const testCase = [`    <testCase name="${escapeXml(name)}" duration="${duration}"`];
    const problem = failure ?? error;

    if (problem) {
      const message = escapeXml(unescapeXml(problem[1] ?? problem[2] ?? "falha"));
      testCase.push(`>\n      <failure message="${message}"/>\n    </testCase>`);
    } else if (skipped) {
      testCase.push(`>\n      <skipped message="ignorado"/>\n    </testCase>`);
    } else {
      testCase.push("/>");
    }

    report.push(testCase.join(""));
    total += 1;
  }

  report.push("  </file>");
}

report.push("</testExecutions>");
writeFileSync(resolve(output), `${report.join("\n")}\n`, "utf8");
console.log(`Relatório Sonar gerado: ${output} (${total} testes, ${suites.length} arquivos)`);
