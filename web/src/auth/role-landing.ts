import type {User} from '../models/responses/auth.response';

const landingPages:Record<User['role'],string>={OWNER:'/app/products',ASSISTANT:'/app/sell',ADMIN:'/app/sales'};
export function roleLanding(role:User['role']) {return landingPages[role];}

export function postLoginDestination(role:User['role'],returnTo:string|null) {
  const fallback=roleLanding(role);
  if(!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.includes('\\') || [...returnTo].some((character)=>character.charCodeAt(0)<32))return fallback;
  const origin='https://stockwise.invalid';
  const destination=new URL(returnTo,origin);
  if(destination.origin!==origin)return fallback;
  const path=destination.pathname;
  const allowed=['/app/dashboard','/app/products','/app/customers','/app/sales'].includes(path)
    || (path==='/app/sell' && role!=='ADMIN')
    || (path==='/app/products/new' && role==='OWNER')
    || /^\/app\/receipts\/[0-9a-f-]{36}$/i.test(path)
    || /^\/app\/customers\/[0-9a-f-]{36}$/i.test(path)
    || /^\/app\/products\/[0-9a-f-]{36}\/movements$/i.test(path);
  return allowed ? path+destination.search+destination.hash : fallback;
}
