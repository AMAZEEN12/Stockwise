import * as yup from 'yup';
import { isCalendarDate } from '../shared/lagos-date';

export const restockSchema = yup.object({
  quantity: yup.string().required('Enter the quantity received.').test(
    'quantity', 'Quantity must be a whole number between 1 and 2,147,483,647.',
    (value) => /^\d+$/.test(value ?? '') && BigInt(value ?? '0') >= 1n && BigInt(value ?? '0') <= 2147483647n,
  ),
  receivedOn: yup.string().required('Choose the date received.').test(
    'date', 'Choose a valid date.', (value) => isCalendarDate(value ?? ''),
  ),
  note: yup.string().trim().max(500, 'Use at most 500 characters.'),
});
