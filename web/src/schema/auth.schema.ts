import * as yup from 'yup';

const email = yup.string().trim().email('Enter a valid email, like name@shop.com').max(254, 'Email must be 254 characters or fewer.').required('Enter your email.');
const password = yup.string().required('Enter your password.').min(8, 'Use at least 8 characters.').max(128, 'Use 128 characters or fewer.');
export const loginSchema = yup.object({ email, password });
// Proposed registration limits; not an approved API wire model.
export const registrationSchema = loginSchema.shape({ displayName: yup.string().trim().required('Enter your full name.').max(120, 'Use 120 characters or fewer.') });
