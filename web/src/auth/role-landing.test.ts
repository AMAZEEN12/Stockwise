import {describe,it,expect} from 'vitest';
import {postLoginDestination,roleLanding} from './role-landing';

describe('service-owned role landing policy',()=>{
  it('maps the three roles to the approved existing screens',()=>{
    expect(roleLanding('OWNER')).toBe('/app/products');
    expect(roleLanding('ASSISTANT')).toBe('/app/sell');
    expect(roleLanding('ADMIN')).toBe('/app/sales');
  });
  it('retains permitted internal destinations and their filters',()=>{
    expect(postLoginDestination('ASSISTANT','/app/sell')).toBe('/app/sell');
    expect(postLoginDestination('OWNER','/app/products?category=Rice#results')).toBe('/app/products?category=Rice#results');
    expect(postLoginDestination('ADMIN','/app/customers')).toBe('/app/customers');
  });
  it('does not resume write screens after a role loses permission',()=>{
    expect(postLoginDestination('ADMIN','/app/sell')).toBe('/app/sales');
    expect(postLoginDestination('ASSISTANT','/app/products/new')).toBe('/app/sell');
    expect(postLoginDestination('OWNER','/app/products/new')).toBe('/app/products/new');
  });
  it('rejects external, normalized traversal, unknown and backslash destinations',()=>{
    for(const value of [null,'https://example.com','//example.com','/app/../sign-up','/app/%2e%2e/sign-up','/app/unknown','/\\example.com','/app/products\n']) {
      expect(postLoginDestination('ADMIN',value)).toBe('/app/sales');
    }
  });
});
