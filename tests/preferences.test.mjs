import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { somali, normalizeCopy, translateCopy } from '../app/lib/somali.mjs';

test('every explicitly localized interface literal has a catalog entry or is an intentional proper name/code', () => {
  const source=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const unchanged=new Set(['EN','SO','Soomaali','WhatsApp','Nairobi, Kenya','SomWay Travel & Logistics.','NBO','MGQ','NBO–DXB','N','M','kg','/ kg','— kg','KES','USD','Africa/Mogadishu','Africa/Nairobi','Subax wanaagsan','Galab wanaagsan','Fiid wanaagsan']);
  const missing=new Set();
  function visit(n) {
    if(ts.isCallExpression(n)&&n.expression.getText(ast)==='tr'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){
      const key=n.arguments[0].text;
      if(!Object.hasOwn(somali,normalizeCopy(key))&&!unchanged.has(key)&&!key.includes('@')&&!key.includes('http'))missing.add(key);
    }
    ts.forEachChild(n,visit);
  }
  visit(ast);assert.deepEqual([...missing],[]);
});

test('translation preserves interpolated customer data and switching to English restores source copy', () => {
  const text='Welcome, {0}';
  assert.equal(translateCopy(text,'so',['Cash']), 'Soo dhawoow, Cash');
  assert.equal(translateCopy(text,'en',['Cash']), 'Welcome, Cash');
  assert.equal(translateCopy('TKT-00028','so'),'TKT-00028');
  assert.equal(translateCopy('s','so'),'');
  assert.equal(translateCopy('Accounts Payable','so'),'Deymaha la bixinayo');
});

test('translated select options keep explicit original values', () => {
  const source=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  const ast=ts.createSourceFile('page.tsx',source,99,true,4);const missing=[];
  function visit(n){
    if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(ast)==='option'&&n.children.some(x=>ts.isJsxExpression(x)&&x.expression&&ts.isCallExpression(x.expression)&&x.expression.expression.getText(ast)==='tr')){
      if(!n.openingElement.attributes.properties.some(p=>p.name?.getText(ast)==='value'))missing.push(n.getText(ast));
    }
    ts.forEachChild(n,visit);
  }visit(ast);assert.deepEqual(missing,[]);
});

test('generated theme CSS has valid variable references and is scoped to dark mode', () => {
  const css=fs.readFileSync(new URL('../app/theme-components.css',import.meta.url),'utf8');
  assert.ok(!css.includes('--var('));
  assert.ok(css.includes('html[data-theme="dark"] .metric-card'));
  assert.ok(css.includes('html[data-theme="dark"] .empty'));
});
