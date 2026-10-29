// Liste toutes les phrases à traduire (appels t("…") + libellés des référentiels)
// et signale celles qui manquent dans chaque langue. Usage : node scripts/i18n-keys.cjs [--missing]
const ts = require(require.resolve("typescript", { paths: [__dirname + "/../apps/web"] }));
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (!["node_modules", "dist", ".expo", "locales"].includes(f.name)) walk(p, out); }
    else if (/\.(tsx?|ts)$/.test(f.name) && !f.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

const keys = new Set();
function strings(node, acc) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) acc.push(node.text);
  else if (ts.isConditionalExpression(node)) { strings(node.whenTrue, acc); strings(node.whenFalse, acc); }
  else if (ts.isParenthesizedExpression(node)) strings(node.expression, acc);
  else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) strings(node.right, acc);
  return acc;
}
const files = [...walk(path.join(root, "apps/web/src")), ...walk(path.join(root, "apps/mobile/src")), ...walk(path.join(root, "packages/shared/src"))];
for (const file of files) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  (function visit(n) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "t" && n.arguments[0]) strings(n.arguments[0], []).forEach((s) => keys.add(s));
    ts.forEachChild(n, visit);
  })(sf);
}
// Libellés des référentiels partagés (affichés via t(x.label))
const c = fs.readFileSync(path.join(root, "packages/shared/src/constants.ts"), "utf8");
for (const m of c.matchAll(/label: "([^"]+)"/g)) keys.add(m[1]);
for (const m of c.matchAll(/^\s+\w+: "([^"]+)",$/gm)) keys.add(m[1]);

const list = [...keys].filter((k) => /\p{L}/u.test(k)).sort();
if (process.argv.includes("--missing")) {
  const dir = path.join(root, "packages/shared/src/i18n/locales");
  let total = 0;
  for (const f of fs.readdirSync(dir)) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const missing = list.filter((k) => !(k in d));
    total += missing.length;
    console.log(`${f}: ${list.length - missing.length}/${list.length}`);
  }
  process.exit(total ? 1 : 0);
} else {
  process.stdout.write(JSON.stringify(list, null, 1));
}
