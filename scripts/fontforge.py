# Based on https://github.com/FontCustom/fontcustom/blob/master/lib/fontcustom/scripts/generate.py

import fontforge
import sys
import json

glyphList = json.load(sys.stdin)
size = 720
descent = round(size*3/18)

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

#f.os2_typoascent = f.ascent
#f.os2_typodescent = f.descent
#f.hhea_ascent = f.ascent
#f.hhea_descent = f.descent


f.addLookup('any', 'gsub_ligature', None, [("ccmp",[("DFLT",["dflt"])])])
f.addLookupSubtable('any', 'depth')

def gname(cp):
	if (cp>=0x10000):
		return "u%X" % cp
	return "uni%04X" % cp

def lname(codes):
	return "u"+"_".join("%04X" % c for c in codes)

def create_unicode(cp, vs16):
	glyph = f.createChar(cp, gname(cp))
	if 'vs16' in g and g['vs16']:
		glyph.altuni = ((cp, 0xFE0F, 0),)
	if cp==0x200D or cp==0x20E3 or cp==0xFE0F or cp>=0xE0000:
		glyph.width = 0
	else:
		glyph.width = size

def create_ligature(codes):
	glyph = f.createChar(-1, lname(codes))
	glyph.addPosSub('depth', [gname(c) for c in codes])
	glyph.width = size

def create_layer(name, shapecount):
	glyph = f.createChar(-1, name)
	for i in range(0, shapecount):
		glyph.importOutlines('build/layers/'+name+"_"+str(i)+".svg", simplify=False, correctdir=True)
	glyph.removeOverlap()
	glyph.correctDirection()
	glyph.simplify(0.5, ('removesingletonpoints', 'choosehv', 'smoothcurves', 'ignoreextrema'), 0.2, 7.2, 7.2)
	glyph.round()
	glyph.simplify(0.25, ('removesingletonpoints', 'choosehv', 'smoothcurves', 'ignoreextrema'), 0.2, 7.2, 7.2)
	glyph.canonicalContours()
	glyph.canonicalStart()
	glyph.width = size
	
for g in glyphList:
	name = str(g['glyphName'])
	sys.stderr.write('glyph '+name+"\n")
	glyph = None
	if ('codes' in g):
		codes = [int(x, 16) for x in g['codes']]
		if (len(codes)==1):
			create_unicode(codes[0], g.get('vs16'))
		else:
			create_ligature(codes)
	else:
		create_layer(name, g['shapeCount'])
		
f.generate("build/glyphs.otf", flags=('opentype', 'round', 'no-hints', 'no-flex', 'short-post'))

# todo: use setTableData to create cpal/colr
