import { Select } from './select';
import { FormField } from './form-field';
import { setThemePreference, useThemePreference } from '../../shared/theme';

/** Stockwise composition of the shared FormField and Select primitives. */
export function ThemeSelect() {
  const preference = useThemePreference();
  return (
    <div className="theme-select">
      <FormField label="Appearance" labelClassName="sr-only">
        {(field) => <Select {...field} value={preference}
          options={[{ value: 'system', label: 'System theme' }, { value: 'light', label: 'Light mode' }, { value: 'dark', label: 'Dark mode' }]}
          onValueChange={(value) => {
            if (value === 'system' || value === 'light' || value === 'dark') setThemePreference(value);
          }} />}
      </FormField>
    </div>
  );
}
