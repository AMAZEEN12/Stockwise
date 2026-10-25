import {describe,expect,it} from 'vitest';
import {historyDates,historyTime} from './sales-history';
import {validHistorySale} from '../../shared/sales-history-validation';
import type {Sale} from '../../models/responses/sales.response';

describe('Lagos sales dates',()=>{
  it('changes Today at Lagos midnight before UTC midnight',()=>{
    expect(historyDates('today',new Date('2026-10-24T22:59:59Z'))).toEqual({from:'2026-10-24',to:'2026-10-24'});
    expect(historyDates('today',new Date('2026-10-24T23:00:00Z'))).toEqual({from:'2026-10-25',to:'2026-10-25'});
  });
  it('uses seven inclusive days and handles year/month/leap boundaries',()=>{
    expect(historyDates('week',new Date('2027-01-01T08:00:00Z'))).toEqual({from:'2026-12-26',to:'2027-01-01'});
    expect(historyDates('yesterday',new Date('2024-03-01T08:00:00Z'))).toEqual({from:'2024-02-29',to:'2024-02-29'});
  });
  it('formats times independently of browser timezone',()=>expect(historyTime('2026-10-24T23:12:00Z')).toBe('00:12'));
});
describe('history integrity',()=>{
  const sale:Sale={id:'44444444-4444-4444-8444-444444444444',reference:'S-000042',paymentType:'PAID',totalKobo:45000,createdBy:'a2222222-2222-4222-8222-222222222222',createdAt:'2026-10-24T08:47:00Z',lines:[{productId:'33333333-3333-4333-8333-333333333333',productName:'Demo item',quantity:1,unitPriceKobo:45000,lineTotalKobo:45000}]};
  it('rejects unsafe or inconsistent money instead of displaying a plausible total',()=>{
    expect(validHistorySale(sale)).toBe(true);
    expect(validHistorySale({...sale,totalKobo:450.5})).toBe(false);
    expect(validHistorySale({...sale,totalKobo:45001})).toBe(false);
    expect(validHistorySale({...sale,totalKobo:Number.MAX_SAFE_INTEGER+1})).toBe(false);
  });
  it('requires credit identity and valid time/type',()=>{
    expect(validHistorySale({...sale,paymentType:'CREDIT'})).toBe(false);
    expect(validHistorySale({...sale,createdAt:'invalid'})).toBe(false);
    expect(validHistorySale({...sale,paymentType:'UNKNOWN' as Sale['paymentType']})).toBe(false);
  });
});
