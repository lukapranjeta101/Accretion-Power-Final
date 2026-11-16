import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
test('mobile layout audit',async({page})=>{
    test.setTimeout(180000);
    const paths=['index','about','products','contact','privacy-policy','datasheets','epoxy-components','porcelain-products','composite-insulators','copper','bus-boots','castings','faqs','blog','blog-detail','case-studies','error-404'];
    const findings=[];
    for(const width of [320,390,768]){
        await page.setViewportSize({width,height:844});
        for(const path of paths){
            await page.goto(`/${path}.html`);await page.waitForTimeout(150);
            const issues=await page.evaluate(()=>[...document.querySelectorAll('h1,h2,h3,p,input,textarea,main a,section a,footer a,footer input')].filter(el=>{
                const r=el.getBoundingClientRect();
                const style=getComputedStyle(el);
                return r.width>0 && r.height>0 && (r.right>innerWidth+2 || r.left< -2) && style.position!=='absolute' && !el.closest('.swiper-slide, .infinite-scroll, .infinite-scroll-inverse, #mobile-menu');
            }).map(el=>({tag:el.tagName,text:el.textContent.trim().slice(0,70),class:el.className,left:Math.round(el.getBoundingClientRect().left),right:Math.round(el.getBoundingClientRect().right)})));
            if(issues.length)findings.push({width,path,issues});
            if(width===390 && ['index','contact','products','datasheets'].includes(path))await page.screenshot({path:`/tmp/mobile-${path}.png`});
        }
    }
    await fs.writeFile('/tmp/mobile-audit.json',JSON.stringify(findings,null,2));
    expect(findings, "Content should stay within the viewport").toEqual([]);
});
