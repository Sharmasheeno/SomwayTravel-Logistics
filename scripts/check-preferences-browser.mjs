import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE || import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'test-owner',name:'Test Owner',username:'test@example.com',role:'owner',active:true};
const data={agencyName:'SomWay',users:[user],branches:[{id:'mog',name:'Test Branch',code:'MOG',city:'Mogadishu',country:'Somalia',defaultCurrency:'USD',allowedCurrencies:['USD'],isActive:true}],tickets:[],cargo:[],visas:[],expenses:[],suppliers:[],clients:[],closes:[],rates:[],startingBalances:[],payments:[],supplierPayments:[],activities:[],paymentMethods:[],branchPaymentMethods:[]};
await page.route('**/api/**',async route=>{
 const path=new URL(route.request().url()).pathname;
 let body={};
 if(path.endsWith('/validate'))body={valid:new URL(route.request().url()).searchParams.get('path')!=='/'};
 else if(path.endsWith('/auth/status'))body={setupRequired:false,ownerActive:true};
 else if(path.endsWith('/auth/me'))body={user};
 else if(path==='/api/data')body={data};
 else if(path.includes('/reports/finance'))body={rows:[],totals:[],trend:[]};
 else if(path.includes('/receivables'))body={rows:[],totals:[],summary:{}};
 else if(path.includes('/notifications'))body={notifications:[]};
 else if(path.includes('/users'))body={users:[user]};
 else if(path.includes('/settings'))body={settings:{timezone:'Africa/Mogadishu',businessDayStart:'00:00',businessDayEnd:'23:59'}};
 await route.fulfill({json:body});
});
await page.addInitScript(()=>{if(!localStorage.getItem('somway-locale'))localStorage.setItem('somway-locale','so');if(!localStorage.getItem('somway-theme'))localStorage.setItem('somway-theme','dark');sessionStorage.setItem('somway.tab-session','1')});
await page.goto('http://127.0.0.1:5173/admin');
await page.locator('.sidebar').waitFor({timeout:60000});
const result=[];
const buttons=page.locator('.sidebar nav button');
const count=await buttons.count();
for(let i=0;i<count;i++){
 await buttons.nth(i).click();
 await page.waitForTimeout(250);
 const content=page.locator('.app-main');
 result.push({page:await buttons.nth(i).innerText(),text:await content.innerText(),bright:await page.evaluate(()=>Array.from(document.querySelectorAll('.app-main *')).filter(e=>{const r=e.getBoundingClientRect();const c=getComputedStyle(e).backgroundColor.match(/[\d.]+/g)?.map(Number);return r.width>100&&r.height>45&&c&&c[0]>200&&c[1]>200&&c[2]>200&&(c.length<4||c[3]>.8)}).map(e=>({class:e.className,color:getComputedStyle(e).backgroundColor})).slice(0,20))});
}
const forms=[];
for (const [index, name] of [[1,'Tigidh cusub'],[2,'Xamuul cusub'],[3,'Fiise cusub'],[5,'Kharash cusub'],[6,'Macmiil cusub'],[11,'Deyn cusub oo la bixinayo'],[13,'Isticmaale cusub']]) {
 await buttons.nth(index).click();
 await page.getByRole('button',{name,exact:true}).click();
 await page.locator('.modal-card').waitFor();
 forms.push({name,text:await page.locator('.modal-card').innerText()});
 await page.getByRole('button',{name:'Xir',exact:true}).last().click();
}
await page.getByRole('button',{name:'Adeegso Ingiriisi',exact:true}).click();
await page.locator('.theme-button').click();
await page.waitForTimeout(100);
const restored=await page.evaluate(()=>({language:document.documentElement.lang,theme:document.documentElement.dataset.theme,storedLocale:localStorage.getItem('somway-locale'),storedTheme:localStorage.getItem('somway-theme')}));
await page.setViewportSize({width:390,height:844});
await page.reload();
await page.locator('.sidebar').waitFor();
assert.equal(await page.locator('html').getAttribute('lang'),'en');
assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
const mobile=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
await page.screenshot({path:'preferences-dark.png',fullPage:true});
fs.writeFileSync('preferences-browser-results.json',JSON.stringify({errors,result,forms,restored,mobile},null,2));
console.log(JSON.stringify({errors,pages:result.length,bright:result.flatMap(x=>x.bright)},null,2));
await page.evaluate(()=>{localStorage.setItem('somway-locale','so');localStorage.setItem('somway-theme','dark')});
await page.goto('http://127.0.0.1:5173/');
await page.locator('.public-page').waitFor();
assert.equal(await page.locator('html').getAttribute('lang'),'so');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
await browser.close();
assert.deepEqual(errors,[]);
assert.equal(result.length,15);
assert.equal(forms.length,7);
assert.deepEqual(result.flatMap(x=>x.bright),[]);
assert.deepEqual(restored,{language:'en',theme:'light',storedLocale:'en',storedTheme:'light'});
assert.equal(mobile.width,mobile.scroll);



