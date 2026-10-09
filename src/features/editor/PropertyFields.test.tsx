import { fireEvent,render,screen,cleanup } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { NumberField } from '@/components/common/PropertyInputs';
afterEach(cleanup);
describe('NumberField',()=>{
 it('commits once on blur rather than every keystroke',()=>{
  const change=vi.fn();render(<NumberField label="Width" value={100} onChange={change} min={1}/>);
  const input=screen.getByRole('spinbutton',{name:'Width'});fireEvent.change(input,{target:{value:'200'}});fireEvent.change(input,{target:{value:'250'}});expect(change).not.toHaveBeenCalled();fireEvent.blur(input);expect(change).toHaveBeenCalledExactlyOnceWith(250);
 });
 it('clamps committed input and rejects an empty edit',()=>{
  const change=vi.fn();render(<NumberField label="Opacity" value={50} onChange={change} min={0} max={100}/>);const input=screen.getByRole('spinbutton',{name:'Opacity'});fireEvent.change(input,{target:{value:'200'}});fireEvent.blur(input);expect(change).toHaveBeenCalledWith(100);change.mockClear();fireEvent.change(input,{target:{value:''}});fireEvent.blur(input);expect(change).not.toHaveBeenCalled();
 });
});
