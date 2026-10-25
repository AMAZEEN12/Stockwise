import {beforeEach,describe,it,expect} from 'vitest';
import {httpClient} from '../../service/http-client';
import {clearCustomerAttempt,markCustomerListChecked,persistCustomerAttempt,readCustomerAttempt} from './customer-create-recovery';

describe('non-idempotent customer attempt recovery',() => {
  beforeEach(()=>sessionStorage.clear());
  it('keeps the original body and rejects another attempt until explicitly resolved',() => {
    persistCustomerAttempt('original-user',{displayName:'Demo'});
    expect(readCustomerAttempt('original-user')).toMatchObject({body:{displayName:'Demo'}});
    expect(()=>persistCustomerAttempt('original-user',{displayName:'Different'})).toThrow();
    markCustomerListChecked('original-user');expect(readCustomerAttempt('original-user')).toMatchObject({checked:true});
    clearCustomerAttempt();expect(readCustomerAttempt('original-user')).toBeNull();
  });
  it('never exposes another user or service attempt body',() => {
    persistCustomerAttempt('original-user',{displayName:'Demo'});
    expect(readCustomerAttempt('different-user')).toBe('other');
    const originalBase=httpClient.defaults.baseURL;
    try {httpClient.defaults.baseURL='http://different-service';expect(readCustomerAttempt('original-user')).toBe('other');}
    finally {httpClient.defaults.baseURL=originalBase;}
  });
});
