import { describe, expect, it } from 'vitest';
import { notesHtml, notesText } from './notes';

describe('speaker notes sanitising', () => {
  it('keeps headings and code blocks as separate lines instead of running them together', () => {
    const html = notesHtml('<h1>Agenda</h1><pre><code>first line\nsecond line</code></pre><p>Closing</p>');
    expect(html).toBe('<p dir="auto">Agenda</p><p dir="auto">first line<br>second line</p><p dir="auto">Closing</p>');
    expect(notesText('<h1>Agenda</h1><pre><code>first line\nsecond line</code></pre>')).toBe('Agenda\nfirst line\nsecond line');
  });

  it('still removes scripts and attributes and unwraps inline markup it does not keep', () => {
    expect(notesHtml('<p onclick="x()">Hello <a href="javascript:x()">link</a> <code>code</code></p><script>x()</script>')).toBe('<p dir="auto">Hello link code</p>');
  });
});
