import { describe, expect, it } from 'vitest';
import { canEditJournal, emptyTemplate, validateTemplate } from '@/lib/journal-template';

describe('Shared journal editing', () => {
  it('allows faculty', () => expect(canEditJournal(['faculty'])).toBe(true));
  it('allows administrators', () => expect(canEditJournal(['admin'])).toBe(true));
  it('denies students', () => expect(canEditJournal(['student'])).toBe(false));
  it('denies unassigned accounts', () => expect(canEditJournal([])).toBe(false));
  it('retains staff rights for multi-role superadmins', () => expect(canEditJournal(['student','faculty','admin'])).toBe(true));
  it('requires theory before publishing', () => expect(() => validateTemplate({...emptyTemplate(),code:'HAEM-01',title:'Microscope',status:'Published'})).toThrow());
  it('rejects duplicate observation column names', () => expect(() => validateTemplate({...emptyTemplate(),code:'HAEM-01',title:'Microscope',columns:[{label:'Part',type:'text',unit:'',validation:''},{label:'Part',type:'text',unit:'',validation:''}]})).toThrow());
});