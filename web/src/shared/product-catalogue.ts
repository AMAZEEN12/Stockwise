import type {Product,ProductPage} from '../models/responses/products.response';

export function compareProductNames(first:Product,second:Product):number {
  const a=first.name.toLowerCase();
  const b=second.name.toLowerCase();
  return a<b ? -1 : a>b ? 1 : first.id<second.id ? -1 : first.id>second.id ? 1 : 0;
}

/** Refuse inconsistent pagination or unsafe selectable amounts, rather than guess. */
export function validSaleCataloguePage(value:unknown,page:number,seen:ReadonlySet<string>):value is ProductPage {
  if(!value || typeof value!=='object')return false;
  const data=value as Partial<ProductPage>;
  if(!Array.isArray(data.items) || data.page!==page || data.size!==20
    || !Number.isSafeInteger(data.totalItems) || data.totalItems!<0 || data.items.length>20)return false;
  const ids=new Set<string>();
  return data.items.every((product:Partial<Product>|null)=>{
    if(!product || typeof product.id!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(product.id)
      || ids.has(product.id) || seen.has(product.id) || typeof product.name!=='string' || !product.name.trim()
      || typeof product.active!=='boolean' || !Number.isSafeInteger(product.quantity) || product.quantity!<0
      || !Number.isSafeInteger(product.priceKobo) || product.priceKobo!<0)return false;
    ids.add(product.id);
    return true;
  });
}
