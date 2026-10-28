export const mockUser = {id:'a2222222-2222-4222-8222-222222222222', email:'owner@stockwise.test', displayName:'Demo Owner', role:'OWNER'};
export function stockState(product) {return !product.active ? 'ARCHIVED' : product.quantity === 0 ? 'OUT' : product.quantity <= product.lowStockThreshold ? 'LOW' : 'IN_STOCK';}
export function makeProducts() {
  return [
    ['Indomie Chicken 70g','IND-070','Noodles',45000,48,5,true],
    ['Peak Milk Tin 400g','PKM-400','Dairy',235000,0,5,true],
    ['Dettol 250ml','DET-250','Household',180000,5,5,true],
    ['Golden Penny Spaghetti 500g','GPS-500','Pasta',98000,3,5,true],
    ['Cadbury Bournvita Chocolate Malt Drink Refill Pouch 900g','BVT-900','Beverages',395000,12,5,true],
    ['Milo Sachet 20g','MIL-020','Beverages',15000,30,5,true],
    ['Old Bread Mix 1kg','OBM-100','Baking',60000,0,5,false],
    ['Dettol Soap 100g','DET-100','Household',65000,18,5,true],
    ['Dettol Liquid 500ml','DET-500','Household',290000,0,5,true],
  ].map(([name,reference,category,priceKobo,quantity,lowStockThreshold,active],index) => {
    const product = {id:`11111111-1111-4111-8111-${String(index+1).padStart(12,'0')}`, name,reference,category,priceKobo,quantity,lowStockThreshold,active,version:1,createdAt:'2026-10-24T08:41:00Z',updatedAt:'2026-10-24T08:41:00Z'};
    return {...product, stockState:stockState(product)};
  });
}
