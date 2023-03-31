# Based on https://github.com/FontCustom/fontcustom/blob/master/lib/fontcustom/scripts/generate.py

import fontforge
import sys
import json

glyphList = json.load(sys.stdin)
size = 720
descent = round(size*0.25)

f = fontforge.font()
f.encoding = 'UnicodeFull'
f.copyright = '(c) my balls'
f.design_size = 16
f.fontname = "TwitterColorEmoji"
f.familyname = "Twitter Color Emoji"
f.fullname = "Twitter Color Emoji"
f.os2_vendor = "12;;"

f.em = size
f.descent = descent
f.ascent = size-descent
	
for g in glyphList:
	name = str(g['glyphName'])
	sys.stderr.write('glyph '+name+"\n")
	glyph = None
	if ('codes' in g):
		codes = [int(x, 16) for x in g['codes']]
		if (len(codes)==1):
			glyph = f.createChar(codes[0], name)
			if 'vs16' in g and g['vs16']:
				glyph.altuni = ((codes[0], 0xFE0F, 0),)
			if codes[0]==0x200D:
				glyph.width = 0
			else:
				glyph.width = size
		else:
			glyph = f.createChar(-1, name)
			glyph.width = size
	else:
		glyph = f.createChar(-1, name)
		glyph.importOutlines('build/layers/'+name+".svg", simplify=False)
		glyph.removeOverlap()
		glyph.correctDirection()
		glyph.simplify(0.5, ('removesingletonpoints', 'choosehv', 'smoothcurves', 'ignoreextrema'), 0.2, 7.2, 7.2)
		glyph.round()
		glyph.simplify(0.25, ('removesingletonpoints', 'choosehv', 'smoothcurves', 'ignoreextrema'), 0.2, 7.2, 7.2)
		glyph.canonicalContours()
		glyph.canonicalStart()
		glyph.width = size
		
# TTF
f.generate("build/glyphs.otf", flags=('opentype', 'round', 'no-hints', 'no-flex', 'short-post'))

# todo: use setTableData to create cpal/colr
