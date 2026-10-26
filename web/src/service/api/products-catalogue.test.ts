import {afterEach,describe,expect,it,vi} from 'vitest';
import {configureStore} from '@reduxjs/toolkit';
import type {AxiosRequestConfig,InternalAxiosRequestConfig} from 'axios';
import {productsApi} from './products.api';
import {httpClient} from '../http-client';
import type {Product} from '../../models/responses/products.response';

const stores:ReturnType<typeof makeStore>[]=[];
function makeStore(){return configureStore({reducer:{[productsApi.reducerPath]:productsApi.reducer},middleware:(getDefault)=>getDefault().concat(productsApi.middleware)});}
function store(){const value=makeStore();stores.push(value);return value;}
function product(index:number,overrides:Partial<Product>={}):Product {
  return {id:`33333333-3333-4333-8333-${String(index).padStart(12,'0')}`,name:`Item ${String(index).padStart(3,'0')}`,reference:`REF-${index}`,category:'Demo',priceKobo:45000,quantity:10,lowStockThreshold:2,active:true,version:1,stockState:'IN_STOCK',createdAt:'2026-10-26T08:00:00Z',updatedAt:'2026-10-26T08:00:00Z',...overrides};
}
function serve(response:(config:AxiosRequestConfig)=>unknown){
  return vi.spyOn(httpClient,'request').mockImplementation(async(config)=>({data:response(config),status:200,statusText:'OK',headers:{},config:config as InternalAxiosRequestConfig}));
}
afterEach(()=>{for(const value of stores)value.dispatch(productsApi.util.resetApiState());stores.length=0;vi.restoreAllMocks();});

describe('sale catalogue over existing product pages',()=>{
  it('loads without a keyword, sorts names with UUID ties, hides archived and keeps zero stock',async()=>{
    const rows=[product(4,{name:'Zebra'}),product(2,{name:'apple',quantity:0}),product(1,{name:'Apple'}),product(3,{active:false})];
    const request=serve(()=>({items:rows,page:0,size:20,totalItems:4}));
    const result=await store().dispatch(productsApi.endpoints.saleCatalogue.initiate({q:'',throughPage:0})).unwrap();
    expect(result.items.map((item)=>item.id)).toEqual([rows[2].id,rows[1].id,rows[0].id]);
    expect(result.items[1].quantity).toBe(0);expect(result.nextPage).toBeNull();
    expect(request.mock.calls[0][0]).toMatchObject({url:'/products',params:{q:'',page:0,size:20}});
    expect(Object.keys(request.mock.calls[0][0].params as Record<string,unknown>)).toEqual(['q','page','size']);
  });

  it('continues past archived-only pages instead of announcing an empty catalogue',async()=>{
    const rows=Array.from({length:23},(_,i)=>product(i+1,{active:i>=20}));
    const request=serve(({params})=>({items:rows.slice(params.page*20,(params.page+1)*20),page:params.page,size:20,totalItems:23}));
    const result=await store().dispatch(productsApi.endpoints.saleCatalogue.initiate({q:'Item',throughPage:0})).unwrap();
    expect(result.items).toHaveLength(3);expect(result.nextPage).toBeNull();expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0].params).toEqual({q:'Item',page:1,size:20});
  });

  it('reads only the requested prefix, then re-reads it when loading more',async()=>{
    const rows=Array.from({length:45},(_,i)=>product(i+1));
    const request=serve(({params})=>({items:rows.slice(params.page*20,(params.page+1)*20),page:params.page,size:20,totalItems:45}));
    const value=store();
    const first=await value.dispatch(productsApi.endpoints.saleCatalogue.initiate({q:'',throughPage:0})).unwrap();
    expect(first.items).toHaveLength(20);expect(first.nextPage).toBe(1);
    const second=await value.dispatch(productsApi.endpoints.saleCatalogue.initiate({q:'',throughPage:1})).unwrap();
    expect(second.items).toHaveLength(40);expect(second.nextPage).toBe(2);
    expect(request.mock.calls.map(([config])=>(config.params as {page:number}).page)).toEqual([0,0,1]);
  });

  it.each(['duplicate','changed total','empty gap','unsafe amount'])('rejects %s without a successful partial result',async(kind)=>{
    const rows=Array.from({length:21},(_,i)=>product(i+1));
    serve(({params})=>{
      if(params.page===0)return {items:rows.slice(0,20),page:0,size:20,totalItems:21};
      const items=kind==='duplicate' ? [rows[0]] : kind==='empty gap' ? [] : [{...rows[20],...(kind==='unsafe amount' ? {priceKobo:0.5} : {})}];
      return {items,page:1,size:20,totalItems:kind==='changed total' ? 22 : 21};
    });
    await expect(store().dispatch(productsApi.endpoints.saleCatalogue.initiate({q:'',throughPage:1})).unwrap()).rejects.toMatchObject({code:'INVALID_PRODUCT_CATALOGUE'});
  });

  it('returns a genuinely empty collection without requesting another page',async()=>{
    const request=serve(()=>({items:[],page:0,size:20,totalItems:0}));
    expect(await store().dispatch(productsApi.endpoints.saleCatalogue.initiate({q:'missing',throughPage:0})).unwrap()).toEqual({query:'missing',items:[],nextPage:null});
    expect(request).toHaveBeenCalledTimes(1);
  });
});
