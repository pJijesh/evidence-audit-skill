const { chromium } = require('playwright');
const html = `<html><body style="margin:0;width:1280px;height:360px;background:#f6f3ec;color:#1d1d1b;font-family:Georgia,'Times New Roman',serif;position:relative">
<div style="position:absolute;left:80px;top:46px;font-size:54px;font-weight:700;letter-spacing:-1px">evidence-audit-skill</div>
<div style="position:absolute;left:80px;top:122px;font-size:24px;color:#55534e;font-family:Helvetica,Arial,sans-serif">A security audit where every finding quotes the code it stands on.</div>
<div style="position:absolute;left:80px;top:190px;width:1120px;font-family:Menlo,Consolas,monospace;font-size:20px;line-height:1.7">
<div><span style="color:#55534e">F-001</span>  <b>SQL injection in login</b>  app.py:19  <span style="color:#b3261e;font-weight:700">confirmed</span>  <span style="color:#55534e">quote matches file</span></div>
<div><span style="color:#55534e">F-012</span>  <b>Guest note as HTML</b>  static/app.js:5  <span style="color:#8a6d00;font-weight:700">needs_validation</span>  <span style="color:#55534e">write path not in snapshot</span></div>
<div><span style="color:#55534e">F-013</span>  <b>Search box as HTML</b>  static/app.js:10  <span style="color:#55534e;font-weight:700">rejected</span>  <span style="color:#55534e">no attacker reaches it</span></div></div>
<div style="position:absolute;left:80px;bottom:26px;font-size:17px;color:#55534e;font-family:Helvetica,Arial,sans-serif">Claude Code, Codex, Cursor and OpenCode. Zero dependencies.</div></body></html>`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 360 } });
await p.setContent(html); await p.screenshot({ path: process.argv[2] }); await b.close(); })();
