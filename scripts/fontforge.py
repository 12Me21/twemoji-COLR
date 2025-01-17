import fontforge
import sys
import json
from common import *

glyphList = json.load(sys.stdin)

f = fontforge.font()
f.encoding = 'UnicodeFull'

# temporary metrics, to facilitate importing the svgs
f.em = VIEWBOX * SCALE
f.ascent = 0
f.descent = VIEWBOX * SCALE

f.addLookup('any', 'gsub_ligature', None, [("ccmp",[("DFLT",["dflt"])])])
f.addLookupSubtable('any', 'depth')

for g in glyphList:
	name = str(g['glyphName'])
	sys.stderr.write(f"glyph {name}\n")
	glyph = f.createChar(-1, name)
	glyph.width = 0
	if 'encoding' in g:
		cp = int(g['encoding'][0])
		vs = g['encoding'][1]
		#cp = cp if vs & (1|4) else -1 # unfortunately this doesn't work
		glyph.unicode = cp
		if vs & 2:
			glyph.altuni = [(cp, 0xFE0F, 0)]
		#if vs & 4:
		#	glyph.altuni = [(cp, x, 0) for x in range(0x1F3FB,0x1F3FF+1)]
	if 'ligature' in g:
		glyph.addPosSub('depth', g['ligature'])
	if 'shapeCount' in g:
		# load each shape in the layer, being sure to *individually* correct their directions, otherwise removeOverlap() will break
		for i in range(0, g['shapeCount']):
			glyph.importOutlines(f"build/layers/{name}_{i}.svg", simplify=False, correctdir=True, scale=True)

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

f.save("build/glyphs.sfd")

# todo: use setTableData to create cpal/colr
