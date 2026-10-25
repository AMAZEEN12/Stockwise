import type {Sale} from '../models/responses/sales.response';
import {checkedKobo,sumKobo} from '../lib/money';

const uuid=(value:unknown)=>typeof value==='string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export function validHistorySale(value:unknown):value is Sale {
  if(!value || typeof value!=='object')return false;
  const sale=value as Sale;
  try {
    return uuid(sale.id) && typeof sale.reference==='string' && !!sale.reference
      && ['PAID','CREDIT'].includes(sale.paymentType) && typeof sale.createdAt==='string' && Number.isFinite(Date.parse(sale.createdAt)) && uuid(sale.createdBy)
      && (sale.customerId===undefined ? sale.paymentType!=='CREDIT' : uuid(sale.customerId))
      && Array.isArray(sale.lines) && sale.lines.length>0 && sale.lines.length<=50
      && sale.lines.every((line)=>uuid(line.productId) && typeof line.productName==='string' && Number.isSafeInteger(line.quantity) && line.quantity>0
        && checkedKobo(line.lineTotalKobo)===sumKobo([{priceKobo:line.unitPriceKobo,quantity:line.quantity}]))
      && checkedKobo(sale.totalKobo)===sumKobo(sale.lines.map((line)=>({priceKobo:line.unitPriceKobo,quantity:line.quantity})));
  } catch {return false;}
}
