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

couples = {
	"hands": ("‍🤝", "‍"),
	"kiss": ("‍❤‍💋", "‍"),
	"heart": ("‍❤", "‍"),
}

f.addLookup('any', 'gsub_ligature', None, [("ccmp",[("DFLT",["dflt"])])])
f.addLookupSubtable('any', 'depth')

# destroy couple emojis !!
f.addLookup('decouple', 'gsub_multiple', None, [("ccmp",[("DFLT",["dflt"])])], 'any')
f.addLookupSubtable('decouple', 'decouple-1')

# recreate them
f.addLookup('couples', 'gsub_contextchain', None, [("ccmp",[("DFLT",["dflt"])])], 'decouple')

for c in couples:
	name = "couple_"+c
	
	f.addLookup(name+"_left", 'gsub_ligature', None, ())
	f.addLookupSubtable(name+"_left", name+"_left2")
	f.addLookup(name+"_right", 'gsub_ligature', None, ())
	f.addLookupSubtable(name+"_right", name+"_right2")

def gname(cp):
	if (cp>=0x10000):
		return "u%X" % cp
	return "uni%04X" % cp

def lname(codes):
	return "u"+"_".join("%04X" % c for c in codes)

person_list = []
for gender in range(3):
	base = ord("🧑👨👩"[gender])
	for skin in range(6):
		person_list += [gname(base) if skin==0 else lname([base,0x1F3FB+skin-1])]

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
	glyph.width = WIDTH
	# load each shape in the layer, being sure to *individually* correct their directions, otherwise removeOverlap() will break
	for i in range(0, shapecount):
		glyph.importOutlines('build/layers/'+name+"_"+str(i)+".svg", simplify=False, correctdir=True, scale=True)

def create_couple(name, cdata):
	glyph = f.createChar(-1, name)
	glyph.width = WIDTH
	
	ctype = cdata[0]
	num = cdata[1]
	side = cdata[2]
	
	c = couples[ctype]
	cname = "couple_"+ctype
	before = c[0]
	after = c[1]
	
	if side=="left":
		glyph.addPosSub(cname+"_left2", [person_list[num]] + [gname(ord(b)) for b in before])
	else:
		glyph.addPosSub(cname+"_right2", [gname(ord(b)) for b in after] + [person_list[num]])
	
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
	elif 'couple' in g:
		create_couple(name, g['couple'])
	else:
		create_layer(name, g['shapeCount'])

# now simplify all the glyphs at once
f.selection.all()
f.transform([1,0,0,1,MARGIN*SCALE,(VIEWBOX-WATERLINE)*SCALE], ('noWidth'))
# merge all the shapes together
f.removeOverlap()
f.correctDirection()
# apply various simplifications
f.simplify(0.5, ('removesingletonpoints', 'choosehv', 'smoothcurves', 'ignoreextrema'), 0.2, 7.2, 7.2)
f.round()
f.simplify(0.25, ('removesingletonpoints', 'choosehv', 'smoothcurves', 'ignoreextrema'), 0.2, 7.2, 7.2)
f.canonicalContours()
f.canonicalStart()
		
# explode and kill them !!!
decouples = json.load(open("data/couples-decompose.json", "r"))
for couple in decouples:
	before = lname([ord(c) for c in couple[0]])
	after = tuple([gname(ord(c)) for c in couple[1]])
	f[before].addPosSub('decouple-1', after)

left_all = []
right_all = []
# and now, we try
for cname in couples:
	name = "couple_"+cname
	c = couples[cname]
	before = c[0]
	after = c[1] # note this must be a single character only !
		
	left_list = []
	for x in range(0, 3*6):
		left_list += [f"{name}_{x}_left"]
		left_all += [f"{name}_{x}_left"]
		right_all += [f"{name}_{x}_right"]
	
	rule1 = f"| [{" ".join(person_list)}] @<{name+"_left"}> {" ".join(["["+gname(ord(b))+"]" for b in before])} | {" ".join(["["+gname(ord(b))+"]" for b in after])} [{" ".join(person_list)}]"
	rule2 = f"[{" ".join(left_list)}] | {" ".join(["["+gname(ord(b))+"]" for b in after])} @<{name+"_right"}> [{" ".join(person_list)}] |"
	
	f.addContextualSubtable('couples', name+"_2", 'coverage', rule2)
	f.addContextualSubtable('couples', name+"_1", 'coverage', rule1)
#1012044
#1012240
#1011844 bad
# right lookup contains 1 zwj: 1012012
#1000196

f.addLookup('couples_kern', 'gpos_pair', None, [("ccmp",[("DFLT",["dflt"])])])
f.addKerningClass('couples_kern', 'couples_kern1', [left_all], [[],right_all], [0,-WIDTH])

f.save("build/layers.sfd")

# todo: use setTableData to create cpal/colr
