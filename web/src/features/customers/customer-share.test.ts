import { describe, it, expect } from 'vitest';
import {
  buildCustomerPortalUrl,
  buildCustomerWhatsAppShareUrl,
} from './customer-share';

describe('Customer Portal Share Helpers', () => {
  it('builds canonical customer portal URL with origin and customer ID', () => {
    const url = buildCustomerPortalUrl('https://stockwise.shop', 'cust-uuid-1234');
    expect(url).toBe('https://stockwise.shop/c/cust-uuid-1234');
  });

  it('builds WhatsApp share URL with phone number and pre-filled message', () => {
    const whatsappUrl = buildCustomerWhatsAppShareUrl('https://stockwise.shop', {
      id: 'cust-uuid-1234',
      displayName: 'Ada Okafor',
      contactPlaceholder: '+234 803 123 4567',
    });

    expect(whatsappUrl).toContain('https://wa.me/2348031234567?text=');
    expect(decodeURIComponent(whatsappUrl)).toContain('Ada Okafor');
    expect(decodeURIComponent(whatsappUrl)).toContain('https://stockwise.shop/c/cust-uuid-1234');
  });

  it('builds WhatsApp share URL without phone number if contact is missing or non-numeric', () => {
    const whatsappUrl = buildCustomerWhatsAppShareUrl('https://stockwise.shop', {
      id: 'cust-uuid-5678',
      displayName: 'Bolu Adeyemi',
    });

    expect(whatsappUrl.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(whatsappUrl)).toContain('Bolu Adeyemi');
    expect(decodeURIComponent(whatsappUrl)).toContain('https://stockwise.shop/c/cust-uuid-5678');
  });
});

