import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Choice, NumberField } from './PropertyInputs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { translate, useLocale } from '@/features/localization/locale';

// Exercise Choice's label/value mapping independently of popup positioning and portals.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, items, onValueChange }: {
    value: string;
    items: { value: string; label: string }[];
    onValueChange: (value: string) => void;
  }) => (
    <select aria-label="Mapped choices" value={value} onChange={(event) => onValueChange(event.target.value)}>
      {items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  ),
  SelectContent: () => null,
  SelectItem: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

afterEach(() => {
  cleanup();
  useLocale.getState().setLocale('en');
  localStorage.clear();
});

describe('localized property inputs', () => {
  it('translates string option labels without changing semantic values', () => {
    useLocale.getState().setLocale('ar');
    const change = vi.fn();
    const options = ['Settings', 'Language'] as const;
    render(<Choice label="Language" value="Settings" options={options} onChange={change} />);
    const select = screen.getByRole('combobox');
    expect(screen.getByRole('option', { name: translate('Settings', 'ar') }).getAttribute('value')).toBe('Settings');
    expect(screen.getByRole('option', { name: translate('Language', 'ar') }).getAttribute('value')).toBe('Language');
    fireEvent.change(select, { target: { value: 'Language' } });
    expect(change).toHaveBeenCalledExactlyOnceWith('Language');
    expect(options).toEqual(['Settings', 'Language']);
  });

  it('preserves explicit model tokens as labels change reactively', () => {
    const change = vi.fn();
    const options = [{ value: 'ar', label: 'Settings' }, { value: 'en', label: 'Language' }];
    render(<Choice label="Language" value="ar" options={options} onChange={change} />);
    act(() => useLocale.getState().setLocale('ar'));
    expect(screen.getByRole('option', { name: translate('Settings', 'ar') }).getAttribute('value')).toBe('ar');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });
    expect(change).toHaveBeenCalledExactlyOnceWith('en');
    expect(options).toEqual([{ value: 'ar', label: 'Settings' }, { value: 'en', label: 'Language' }]);
  });

  it('keeps an uncommitted numeric draft through an interface language change', () => {
    const change = vi.fn();
    render(<NumberField label="Language" value={100} onChange={change} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '250' } });
    act(() => useLocale.getState().setLocale('ar'));
    expect((input as HTMLInputElement).value).toBe('250');
    expect(change).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(change).toHaveBeenCalledExactlyOnceWith(250);
  });

  it('uses content direction for text fields and LTR direction for numbers', () => {
    render(<><Input aria-label="Text" /><Input type="number" aria-label="Number" /><Input aria-label="Override" dir="rtl" /><Textarea aria-label="Notes" /></>);
    expect(screen.getByRole('textbox', { name: 'Text' }).getAttribute('dir')).toBe('auto');
    expect(screen.getByRole('spinbutton', { name: 'Number' }).getAttribute('dir')).toBe('ltr');
    expect(screen.getByRole('textbox', { name: 'Override' }).getAttribute('dir')).toBe('rtl');
    expect(screen.getByRole('textbox', { name: 'Notes' }).getAttribute('dir')).toBe('auto');
  });

  it('leaves data options such as font family names untranslated', () => {
    useLocale.getState().setLocale('ar');
    render(<Choice label="Language" value="Settings" options={['Settings', 'Geist']} translateOptions={false} onChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'Settings' }).getAttribute('value')).toBe('Settings');
    expect(screen.queryByRole('option', { name: translate('Settings', 'ar') })).toBeNull();
  });
});
