import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { plainText } from '@/types/model';
import { referencedFontFamilies } from '@/features/fonts/missingFonts';
import { importPptx } from './importPptx';
import { parsePptxText, readPptxThemeFonts, resolvePptxTypeface } from './pptxFonts';

const drawing = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const presentation = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const relationship = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const themeXml = `<a:theme xmlns:a="${drawing}"><a:themeElements><a:fontScheme name="Imported fonts">
  <a:majorFont><a:latin typeface="Missing Heading"/><a:ea typeface=""/><a:cs typeface="Missing Heading Arabic"/></a:majorFont>
  <a:minorFont><a:latin typeface="Missing Body"/><a:ea typeface=""/><a:cs typeface=""/><a:font script="Arab" typeface="Missing Body Arabic"/></a:minorFont>
</a:fontScheme></a:themeElements></a:theme>`;

function xml(value: string): Document {
  return new DOMParser().parseFromString(value, 'application/xml');
}

describe('PowerPoint font parsing', () => {
  it('resolves major/minor Latin and complex-script theme references, including supplemental Arabic fonts', () => {
    const theme = readPptxThemeFonts(xml(themeXml));
    expect(resolvePptxTypeface('+mj-lt', theme)).toBe('Missing Heading');
    expect(resolvePptxTypeface('+mn-lt', theme)).toBe('Missing Body');
    expect(resolvePptxTypeface('+mj-cs', theme)).toBe('Missing Heading Arabic');
    expect(resolvePptxTypeface('+mn-cs', theme)).toBe('Missing Body Arabic');
    expect(resolvePptxTypeface('Uploaded Family', theme)).toBe('Uploaded Family');
    expect(resolvePptxTypeface(undefined, readPptxThemeFonts())).toBe('Geist');
  });

  it('keeps every run font and Arabic complex-script font in existing rich text marks', () => {
    const body = xml(`<p:txBody xmlns:a="${drawing}" xmlns:p="${presentation}"><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="r" rtl="1"><a:defRPr><a:latin typeface="+mn-lt"/><a:cs typeface="+mn-cs"/></a:defRPr></a:pPr>
      <a:r><a:rPr sz="1800" b="1"><a:latin typeface="Run Latin"/><a:cs typeface="Run Arabic"/><a:solidFill><a:srgbClr val="123456"/></a:solidFill></a:rPr><a:t>Hello مرحبا</a:t></a:r>
      <a:r><a:rPr><a:latin typeface="Second Run"/></a:rPr><a:t> second</a:t></a:r><a:br/><a:r><a:t>العربية</a:t></a:r>
    </a:p></p:txBody>`).documentElement;
    const content = parsePptxText(body, readPptxThemeFonts(xml(themeXml)));
    const paragraph = content.content?.[0];
    expect(paragraph?.attrs).toEqual({ textAlign: 'right', dir: 'rtl' });
    const runs = paragraph?.content ?? [];
    expect(runs.map(run => run.text ?? '\n').join('')).toBe('Hello مرحبا second\nالعربية');
    expect(runs.filter(run => run.type === 'text').map(run => run.marks?.[0]?.attrs?.fontFamily)).toEqual(['Run Latin', 'Run Arabic', 'Second Run', 'Missing Body Arabic']);
    expect(runs[0]?.marks).toEqual([{ type: 'textStyle', attrs: { fontFamily: 'Run Latin', fontSize: '36px', color: '#123456' } }, { type: 'bold' }]);
  });

  it('inherits paragraph and body list font defaults instead of silently resetting runs to Geist', () => {
    const body = xml(`<p:txBody xmlns:a="${drawing}" xmlns:p="${presentation}"><a:lstStyle><a:lvl2pPr><a:defRPr><a:latin typeface="List Font"/></a:defRPr></a:lvl2pPr></a:lstStyle>
      <a:p><a:pPr lvl="1"/><a:r><a:t>list</a:t></a:r></a:p>
      <a:p><a:pPr><a:defRPr><a:latin typeface="Paragraph Font"/></a:defRPr></a:pPr><a:r><a:t>paragraph</a:t></a:r></a:p>
    </p:txBody>`).documentElement;
    const content = parsePptxText(body, readPptxThemeFonts());
    expect(content.content?.map(paragraph => paragraph.content?.[0]?.marks?.[0]?.attrs?.fontFamily)).toEqual(['List Font', 'Paragraph Font']);
  });

  it('follows slide layout/master relationships to the actual theme and exposes imported run fonts for resolution', async () => {
    const zip = new JSZip();
    zip.file('ppt/presentation.xml', `<p:presentation xmlns:p="${presentation}" xmlns:r="${relationship}"><p:sldIdLst><p:sldId id="256" r:id="slide"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`);
    zip.file('ppt/_rels/presentation.xml.rels', '<Relationships><Relationship Id="slide" Target="slides/slide1.xml"/></Relationships>');
    zip.file('ppt/slides/_rels/slide1.xml.rels', '<Relationships><Relationship Id="layout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>');
    zip.file('ppt/slideLayouts/slideLayout1.xml', `<p:sldLayout xmlns:p="${presentation}"/>`);
    zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', '<Relationships><Relationship Id="master" Target="../slideMasters/slideMaster1.xml"/></Relationships>');
    zip.file('ppt/slideMasters/slideMaster1.xml', `<p:sldMaster xmlns:p="${presentation}" xmlns:a="${drawing}"><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr><a:latin typeface="+mj-lt"/><a:cs typeface="+mj-cs"/></a:defRPr></a:lvl1pPr></p:titleStyle></p:txStyles></p:sldMaster>`);
    zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', '<Relationships><Relationship Id="theme" Target="../theme/custom.xml"/></Relationships>');
    zip.file('ppt/theme/custom.xml', themeXml);
    zip.file('ppt/slides/slide1.xml', `<p:sld xmlns:p="${presentation}" xmlns:a="${drawing}"><p:cSld><p:spTree>
      <p:sp><p:nvSpPr><p:cNvPr id="1" name="Title"/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="1270000" y="635000"/><a:ext cx="2540000" cy="635000"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Title</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:nvSpPr><p:cNvPr id="2" name="Body"/></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr><a:latin typeface="+mn-lt"/><a:cs typeface="+mn-cs"/></a:rPr><a:t>Body العربية</a:t></a:r><a:r><a:rPr><a:latin typeface="Last Run Font"/></a:rPr><a:t> final</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:nvSpPr><p:cNvPr id="3" name="Shape"/></p:nvSpPr><p:spPr><a:prstGeom prst="ellipse"/></p:spPr><p:txBody><a:p><a:r><a:rPr><a:cs typeface="Shape Arabic"/></a:rPr><a:t>شكل</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree></p:cSld></p:sld>`);
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const document = await importPptx(new File([new Uint8Array(bytes)], 'fonts.pptx'));
    expect(document.theme.fonts).toEqual({ heading: 'Missing Heading', body: 'Missing Body' });
    expect(referencedFontFamilies(document)).toEqual(['Missing Heading', 'Missing Body', 'Missing Body Arabic', 'Last Run Font', 'Shape Arabic']);
    const title = document.slides[0]?.elements[0];
    const body = document.slides[0]?.elements[1];
    expect(title).toMatchObject({ type: 'text', x: 200, y: 100, width: 400, height: 100, fontFamily: 'Missing Heading' });
    if (body?.type !== 'text') throw new Error('Expected imported text');
    expect(plainText(body.content)).toBe('Body العربية final');
  });
});
