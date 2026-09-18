jest.mock('../../supabase/client', () => ({ supabase: {} }));
import { isValidPsnId } from '../psn';

test('isValidPsnId follows Sony’s rule', () => {
  for (const ok of ['abc', 'Sola_Plays-99', ' trimmed_ok ', 'a234567890123456']) expect(isValidPsnId(ok)).toBe(true);
  for (const bad of ['ab', '1abc', 'has space', 'a2345678901234567', 'emoji🙂', '']) expect(isValidPsnId(bad)).toBe(false);
});
