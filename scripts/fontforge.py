import fontforge
import sys
import json

glyphList = json.load(sys.stdin)

VIEWBOX = 36 # viewbox of twemoji svgs
WATERLINE = 6 # how far up the baseline should be (in svg units)
MARGIN = 1 # left/right bearing, in svg units
EMOJI_SCALE = 1.125 # in `em` units. i.e. at a font size of 16px, emojis will be 18px

SCALE = 24 # upscale factor for svg units

EM = round((VIEWBOX / EMOJI_SCALE) * SCALE)
DESCENT = round(0.2 * EM) # doesnt really matter for display itself, but we do this to match other fonts
WIDTH = round((MARGIN+VIEWBOX+MARGIN) * SCALE)

f = fontforge.font()
f.encoding = 'UnicodeFull'

# temporary metrics, to facilitate importing the svgs
f.em = VIEWBOX * SCALE
f.ascent = 0
f.descent = VIEWBOX * SCALE

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
	glyph.width = 0 # need to set width otherwise it gets deleted when we save ..
	if 'vs16' in g and g['vs16']:
		glyph.altuni = ((cp, 0xFE0F, 0),)

def create_ligature(codes):
	glyph = f.createChar(-1, lname(codes))
	glyph.width = 0
	glyph.addPosSub('depth', [gname(c) for c in codes])

def create_layer(name, shapecount):
	glyph = f.createChar(-1, name)
	glyph.width = 0
	# load each shape in the layer, being sure to *individually* correct their directions, otherwise removeOverlap() will break
	for i in range(0, shapecount):
		glyph.importOutlines(f"build/layers/{name}_{i}.svg", simplify=False, correctdir=True, scale=True)

for g in glyphList:
	name = str(g['glyphName'])
	typ = g['type']
	if typ=='codepoint':
		sys.stderr.write(f"codepoint {name}\n")
		codes = [int(x, 16) for x in g['codes']]
		if (len(codes)==1):
			create_unicode(codes[0], g.get('vs16'))
		else:
			create_ligature(codes)
	elif typ=='layer':
		sys.stderr.write(f"layer {name}\n")
		create_layer(name, g['shapeCount'])

# now simplify all the glyphs at once
f.selection.all()
# merge all the shapes together
f.removeOverlap() # (this one is the slowest)
f.correctDirection()
# apply various simplifications
f.simplify(0.5, ('removesingletonpoints', 'choosehv', 'smoothcurves', 'ignoreextrema'), 0.2, 7.2, 7.2)
f.round()
f.simplify(0.25, ('removesingletonpoints', 'choosehv', 'smoothcurves', 'ignoreextrema'), 0.2, 7.2, 7.2)
f.canonicalContours()
f.canonicalStart()

f.save("build/layers.sfd")

# todo: use setTableData to create cpal/colr
