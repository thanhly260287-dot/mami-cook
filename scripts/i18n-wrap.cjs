// Outil de maintenance : entoure les textes français visibles d'un appel t("…")
// et liste toutes les clés. Usage : node scripts/i18n-wrap.cjs <fichiers…>
// Les textes déjà traduits sont ignorés ; le résultat est relu et vérifié par tsc.
const ts = require(require.resolve("typescript", { paths: [process.cwd() + "/apps/web"] }));
const fs = require("fs");

const ATTRS = new Set(["placeholder", "title", "label", "description", "aria-label", "alt", "sub", "text", "hint", "emptyText"]);
const PROPS = new Set(["title", "desc", "label", "q", "a", "d", "t", "l", "message", "description", "body"]);
const SKIP_ATTRS = new Set(["className", "style", "href", "to", "src", "id", "htmlFor", "name", "type", "key", "role", "accept", "autoComplete", "inputMode", "contentFit", "edges", "behavior", "textContentType", "keyboardType", "autoCapitalize", "returnKeyType", "clearButtonMode", "variant", "size", "tone", "side", "icon", "emoji", "mode", "pathname"]);
const FRENCH = /[a-zà-ÿ]{2,}/i;
const looksCss = (s) => /^[a-z0-9:\-\[\]/.%#_ ]+$/.test(s) && /-/.test(s) && !/[A-ZÀ-Ü]/.test(s);
const isText = (s) => FRENCH.test(s) && !looksCss(s) && !/^(https?:|\/|mailto:|#|@|[a-z_]+$|[a-z]+[A-Z])/.test(s.trim()) && !/^[\w.-]+\.(svg|png|jpg|json|js|tsx?)$/.test(s);

function attrName(node) {
  let n = node.parent;
  while (n && !ts.isJsxAttribute(n) && !ts.isSourceFile(n)) n = n.parent;
  return n && ts.isJsxAttribute(n) ? n.name.getText() : null;
}
function insideCall(node, names) {
  let n = node.parent;
  while (n && !ts.isSourceFile(n)) {
    if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
      const c = n.expression.getText();
      if (names.some((x) => c === x || c.endsWith("." + x))) return c;
      if (["cn", "t", "clsx", "translate", "useQuery", "invalidateQueries"].includes(c.split(".").pop())) return "skip";
    }
    n = n.parent;
  }
  return null;
}
function inJsxExpr(node) {
  let n = node.parent;
  while (n && !ts.isSourceFile(n)) { if (ts.isJsxExpression(n)) return true; if (ts.isFunctionLike(n) && !ts.isArrowFunction(n)) return false; n = n.parent; }
  return false;
}

const keys = new Set();
for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  const lit = (s) => JSON.stringify(s);
  function visit(node) {
    if (ts.isJsxText(node)) {
      const raw = node.getFullText();
      const trimmed = raw.replace(/\s+/g, " ").trim();
      if (isText(trimmed)) {
        const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
        const keepLead = /\n/.test(lead) ? lead : lead ? "{\" \"}" : "", keepTrail = /\n/.test(trail) ? trail : trail ? "{\" \"}" : "";
        edits.push([node.getFullStart(), node.getEnd(), `${keepLead}{t(${lit(trimmed)})}${keepTrail}`]);
        keys.add(trimmed);
      }
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const s = node.text;
      const p = node.parent;
      if (!isText(s)) return ts.forEachChild(node, visit);
      if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p) || ts.isElementAccessExpression(p)) return;
      if (ts.isPropertyAssignment(p) && p.name === node) return;
      if (ts.isCallExpression(p) && p.expression.getText().split(".").pop() === "t") return;
      const call = insideCall(node, ["success", "error", "info", "warning", "Error", "alert", "Alert.alert", "confirm"]);
      if (call === "skip") return;
      // Comparaisons (status === "…") et clés techniques : on ne touche pas.
      if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(p.operatorToken.kind)) return;
      if (ts.isCaseClause(p)) return;
      let wrap = false;
      if (ts.isJsxAttribute(p)) wrap = ATTRS.has(p.name.getText());
      else if (call) wrap = true;
      else if (ts.isPropertyAssignment(p) && PROPS.has(p.name.getText())) wrap = true;
      else if (inJsxExpr(node)) { const a = attrName(node); wrap = !a || !SKIP_ATTRS.has(a); }
      else if (ts.isArrayLiteralExpression(p) && /[A-ZÀ-Ü]/.test(s[0]) && s.includes(" ")) wrap = true;
      if (wrap) {
        const repl = ts.isJsxAttribute(p) ? `{t(${lit(s)})}` : `t(${lit(s)})`;
        edits.push([node.getStart(), node.getEnd(), repl]);
        keys.add(s);
      }
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (!edits.length) continue;
  let out = src;
  for (const [a, b, r] of edits.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + r + out.slice(b);
  if (!/import \{[^}]*\bt\b[^}]*\} from "@mami\/shared"/.test(out)) {
    if (/from "@mami\/shared";/.test(out)) out = out.replace(/import \{([^}]*)\} from "@mami\/shared";/, (m, g) => `import {${g.replace(/[\s,]*$/, "")}, t } from "@mami/shared";`);
    else out = `import { t } from "@mami/shared";\n` + out;
  }
  fs.writeFileSync(file, out);
  console.error(`${file}: ${edits.length}`);
}
fs.writeFileSync(process.env.KEYS_OUT || "/dev/stdout", JSON.stringify([...keys], null, 1));
