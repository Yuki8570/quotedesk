import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import fs from 'fs';
const r = await build({
  entryPoints: ['src/main.jsx'], bundle: true, minify: true, format: 'iife', write: false,
  jsx: 'automatic', target: ['chrome100', 'safari15', 'edge100'], outdir: 'dist',
  nodePaths: ['/opt/npm-tools/node_modules'], define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none', logLevel: 'warning',
});
const js = r.outputFiles.find(f => f.path.endsWith('.js')).text;
const css = fs.readFileSync('src/styles.css', 'utf8');
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QuoteDesk 报价单系统</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
console.log('built', (html.length / 1024).toFixed(0) + ' KB');
