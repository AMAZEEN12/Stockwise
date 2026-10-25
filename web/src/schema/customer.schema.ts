import * as yup from 'yup';

const boundedText = (maximum:number,message:string) => yup.string().trim().test('length',message,(value) => !value || [...value].length <= maximum);
export const customerSchema = yup.object({
  displayName: boundedText(120,'Use at most 120 characters.').required('Enter a display name.'),
  contactPlaceholder: boundedText(60,'Use at most 60 characters.').default(''),
});
