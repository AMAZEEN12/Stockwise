import * as yup from 'yup';
import { parseNaira } from '../lib/money';
const whole = (label: string) => yup.string().required(`${label} is required.`).test('whole', `${label} must be a whole number.`, (value) => /^\d+$/.test(value ?? '') && BigInt(value ?? '0') <= 2147483647n);
export const productSchema = yup.object({
  name: yup.string().trim().required('Enter a product name.').max(200),
  reference: yup.string().trim().required('Enter a unique reference.').max(40),
  category: yup.string().trim().required('Choose a category.').max(60),
  price: yup.string().required('Enter a selling price.').test('price', 'Price can have at most 2 decimals and must be within the supported amount.', (value) => {try {parseNaira(value ?? ''); return true;} catch {return false;}}),
  quantity: whole('Quantity'), lowStockThreshold: whole('Low-stock threshold'),
});
