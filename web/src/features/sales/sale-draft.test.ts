import {beforeEach,describe,expect,it} from 'vitest';
import {clearPending,persistPending,readPending,validSale} from './sale-draft';
import type {PendingSale} from './sale-draft';
describe('pending sale recovery boundary',() => {
  beforeEach(() => sessionStorage.clear());
  const snapshot:PendingSale = {key:'33333333-3333-4333-8333-333333333333',userId:'owner',createdAt:'2026-10-24T09:00:00Z',simulated:false,cart:[],body:{paymentType:'PAID',lines:[{productId:'11111111-1111-4111-8111-111111111111',quantity:1}]}};
  it('keeps the exact original key and body across reload and scopes recovery to the author',() => {
    persistPending(snapshot); expect(readPending('owner')).toEqual(snapshot); expect(readPending('assistant')).toBe('other-user');
    clearPending(); expect(readPending('owner')).toBeNull();
  });
  it('refuses corrupt/zero-quantity writes and unsafe receipt amounts',() => {
    sessionStorage.setItem('stockwise.pending-sale',JSON.stringify({...snapshot,body:{paymentType:'PAID',lines:[{productId:'x',quantity:0}]}}));
    expect(readPending('owner')).toBe('invalid');
    expect(validSale({id:'x',reference:'S-1',paymentType:'PAID',totalKobo:1.5,lines:[],createdBy:'owner',createdAt:'2026-10-24T00:00:00Z'})).toBe(false);
  });
});
