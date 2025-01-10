# Based on https://github.com/FontCustom/fontcustom/blob/master/lib/fontcustom/scripts/generate.py

import fontforge
import sys
import json

glyphList = json.load(sys.stdin)

VIEWBOX = 36 # viewbox of twemoji svgs
WATERLINE = 8 # how far up the baseline should be (in svg units)
MARGIN = 1 # left/right bearing, in svg units
EMOJI_SCALE = 1.125 # in `em` units. i.e. at a font size of 16px, emojis will be 18px

SCALE = 24 # upscale factor for svg units

EM = round((VIEWBOX / EMOJI_SCALE) * SCALE)
DESCENT = round(0.2 * EM) # doesnt really matter for display itself, but we do this to match other fonts
WIDTH = round((MARGIN+VIEWBOX+MARGIN) * SCALE)

f = fontforge.font()
f.encoding = 'UnicodeFull'
f.copyright = '(c) my balls'
f.design_size = 16
f.fontname = "TwemojiMozilla"
f.familyname = "Twemoji Mozilla"
f.fullname = "Twemoji Mozilla"
f.os2_vendor = "12;;"

# temporary metrics, to facilitate importing the svgs
f.em = VIEWBOX * SCALE
f.ascent = 0
f.descent = VIEWBOX * SCALE

f.upos = -108 # idk ?? nothing uses this anyway
f.uwidth = 2 * SCALE

f.os2_winascent_add = False
f.os2_windescent_add = False
f.os2_typoascent_add = False
f.os2_typodescent_add = False
f.hhea_ascent_add = False
f.hhea_descent_add = False

f.os2_winascent = (VIEWBOX-WATERLINE)*SCALE + SCALE
f.os2_windescent = (WATERLINE)*SCALE + SCALE
f.os2_typoascent = f.os2_winascent #round(712/768*EM) # idr how i calculated these, but i did. UPDATE: i got them from the hhea ascent/descent values in my copy of Roboto.
f.os2_typodescent = -f.os2_windescent # round(-188/768*EM)
f.os2_typolinegap = 0
f.hhea_ascent = f.os2_typoascent
f.hhea_descent = f.os2_typodescent
f.hhea_linegap = 0

# this causes issues with fallback for me, for now
#f.os2_panose = (5, 2, 1, 0, 1, 2, 2, 2, 2, 2)
#f.os2_family_class = 3072

guessed_gids = [[],[],[]]

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
		glyph.width = WIDTH

def create_ligature(codes):
	glyph = f.createChar(-1, lname(codes))
	glyph.addPosSub('depth', [gname(c) for c in codes])
	glyph.width = WIDTH

def create_layer(name, shapecount):
	glyph = f.createChar(-1, name)
	# load each shape in the layer, being sure to *individually* correct their directions, otherwise removeOverlap() will break
	for i in range(0, shapecount):
		glyph.importOutlines('build/layers/'+name+"_"+str(i)+".svg", simplify=False, correctdir=True, scale=True)
	glyph.transform([1,0,0,1,MARGIN*SCALE,(VIEWBOX-WATERLINE)*SCALE])
	# merge all the shapes together
	glyph.removeOverlap()
	glyph.correctDirection()
	# apply various simplifications
	glyph.simplify(0.5, ('removesingletonpoints', 'choosehv', 'smoothcurves', 'ignoreextrema'), 0.2, 7.2, 7.2)
	glyph.round()
	glyph.simplify(0.25, ('removesingletonpoints', 'choosehv', 'smoothcurves', 'ignoreextrema'), 0.2, 7.2, 7.2)
	glyph.canonicalContours()
	glyph.canonicalStart()
	glyph.width = WIDTH

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

# now set the real metrics. (be careful so fontforge doesn't re-scale the entire font)
f.ascent = EM - DESCENT
f.descent = DESCENT
assert f.em == EM
		
f.generate("build/glyphs.otf", flags=('opentype', 'round', 'no-hints', 'no-flex', 'short-post'))

# todo: use setTableData to create cpal/colr
