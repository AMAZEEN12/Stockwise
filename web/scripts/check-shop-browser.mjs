import {chromium,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
const browser=await chromium.launch();
try {
  const page=await browser.newPage(); const name=`QC product ${randomUUID().slice(0,8)}`;
  await page.goto('http://127.0.0.1:5173/sign-in'); await page.getByRole('button',{name:'Owner',exact:true}).click(); await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Products',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Add product'}).click();
  for(const [label,value] of [['Name',name],['Reference',name.replaceAll(' ','-')],['Category','Quality checks'],['Selling price','450.05'],['Quantity','2'],['Low-stock threshold','1']]) await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole('button',{name:'Save product',exact:true}).click(); await expect(page.getByRole('status')).toContainText('Product added');
  await page.getByRole('textbox',{name:'Search name or reference'}).fill(name); await expect(page.locator('.product-row')).toHaveCount(1); await expect(page.locator('.product-price')).toHaveText('₦450.05');
  await page.getByRole('link',{name:'Sell',exact:true}).click(); await page.getByRole('textbox',{name:'Search products to add'}).fill(name); await page.getByRole('button',{name:new RegExp(name)}).click();
  await page.getByRole('button',{name:'Confirm sale',exact:true}).click(); await page.getByRole('button',{name:'Confirm',exact:true}).click(); await expect(page.getByRole('heading',{name:'Sale recorded'})).toBeVisible(); await expect(page.locator('.receipt-total')).toContainText('₦450.05');
  await page.reload(); await expect(page.getByRole('heading',{name:'Sale recorded'})).toBeVisible();
  console.log('PASS: actual browser without interception: sign-in → Products → add product → catalogue search → sale confirmation → receipt → refresh. Local demonstration only.');
} finally {await browser.close();}
