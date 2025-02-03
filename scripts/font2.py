import fontforge
import sys
import json
from common import *

WATERLINE = 6 # how far up the baseline should be (in svg units)
MARGIN = 1 # left/right bearing, in svg units
EMOJI_SCALE = 1.125 # in `em` units. 1.125 means, at a font size of 16px, emojis will be 18px
FULLNAME = "Twemoji COLR"

def Fixed(n):
	return round(n*SCALE)

EM = Fixed(VIEWBOX / EMOJI_SCALE)
WIDTH = Fixed(MARGIN+VIEWBOX+MARGIN)

f = fontforge.open("build/glyphs.sfd")

#f.hasvmetrics = True

f.fontname = FULLNAME.replace(" ", "")
f.familyname = FULLNAME
f.fullname = FULLNAME
f.weight = "Regular"
f.version = "15.150" # i'll just use the emoji version (15.1)

f.os2_vendor = "12;;"
f.copyright = '(c) my balls'

f.design_size = 16
f.upos = Fixed(-WATERLINE+1) # idk ?? nothing uses this anyway
f.uwidth = Fixed(2)

f.os2_winascent_add = False
f.os2_windescent_add = False
f.os2_typoascent_add = False
f.os2_typodescent_add = False
f.hhea_ascent_add = False
f.hhea_descent_add = False

f.os2_winascent = Fixed(VIEWBOX-WATERLINE+1)
f.os2_windescent = Fixed(WATERLINE+1)
f.os2_typoascent = f.os2_winascent #round(712/768*EM) # idr how i calculated these, but i did. UPDATE: i got them from the hhea ascent/descent values in my copy of Roboto.
f.os2_typodescent = -f.os2_windescent # round(-188/768*EM)
f.os2_typolinegap = 0
f.hhea_ascent = f.os2_typoascent
f.hhea_descent = f.os2_typodescent
f.hhea_linegap = 0

# this causes issues with fallback for me, for now
#f.os2_panose = (5, 2, 1, 0, 1, 2, 2, 2, 2, 2)
#f.os2_family_class = 3072


def make_skin_list(base):
	l = []
	for skin in range(6):
		l += [gname(base) if skin==0 else lname([base,0x1F3FB+skin-1])]
	return l

person_list = sum([make_skin_list(ord(p)) for p in "🧑👨👩"], [])
hand_list_left = make_skin_list(ord("🫱"))
hand_list_right = make_skin_list(ord("🫲"))

def gnames(string):
	return [gname(ord(b)) for b in string]

couples = {
	"hs": (hand_list_left, gnames(""), gnames("‍"), hand_list_right),
	"hh": (person_list, gnames("‍🤝"), gnames("‍"), person_list),
	"k": (person_list, gnames("‍❤‍💋"), gnames("‍"), person_list),
	"wh": (person_list, gnames("‍❤"), gnames("‍"), person_list),
}

# destroy couple emojis !!
f.addLookup('decouple', 'gsub_multiple', None, [("ccmp",[("DFLT",["dflt"])])], 'any')
f.addLookupSubtable('decouple', 'decouple-1')

# recreate them
f.addLookup('couples', 'gsub_contextchain', None, [("calt",[("DFLT",["dflt"])])], 'decouple')

for c in couples:
	name = "couple_"+c
	
	f.addLookup(name+"_left", 'gsub_ligature', None, ())
	f.addLookupSubtable(name+"_left", name+"_leftsub")
	f.addLookup(name+"_right", 'gsub_ligature', None, ())
	f.addLookupSubtable(name+"_right", name+"_rightsub")
	
	# couple_<name>_leftsub and couple_<name>_rightsub are conditional subsitutions
	# they activate when our main uhh contextual chaining subtable detects a match.
	# _leftsub replaces the beginning of the couple ligature with the left person in the couple, while _rightsub replaces the ending with the right person in the couple.
	# for example, with the sequence: man + zwj + heart + zwj + person
	# man+zwj+heart is replaced by the left half-couple
	# zwj+person is replaced by the right half-couple
	# the matching is done by the contextual chaining subtables couple_<name>_first and _second, which enable the substitution subtables couple_<name>_leftsub and _rightsub

def create_couple(glyph, cdata):
	ctype = cdata[0]
	pers = cdata[1]
	side = cdata[2]
	
	c = couples[ctype]
	cname = "couple_"+ctype
	
	if side=="left":
		glyph.addPosSub(cname+"_leftsub", [pers] + c[1])
	else:
		glyph.addPosSub(cname+"_rightsub", c[2] + [pers])

glyphList = json.load(open('build/glyphs.json'))
for g in glyphList:
	name = str(g['glyphName'])
	if 'decouple' in g:
		# explode and kill them !!!
		glyph = f[name]
		glyph.addPosSub('decouple-1', g['decouple'])
	if 'couple' in g:
		glyph = f.createChar(-1, name)
		create_couple(glyph, g['couple'])

left_all = []
right_all = []
# and now, we try
for cname in couples:
	name = f"couple_{cname}"
	c = couples[cname]
	
	left_list = []
	for x in c[0]:
		left_list += [f"{name}_{x}_left"]
		left_all += [f"{name}_{x}_left"]
	for x in c[3]:
		right_all += [f"{name}_{x}_right"]
	
	covs_0 = "["+" ".join(c[0])+"]"
	covs_1 = " ".join([f"[{n}]" for n in c[1]])
	covs_2 = " ".join([f"[{n}]" for n in c[2]])
	covs_3 = "["+" ".join(c[3])+"]"
	covs_left = "["+" ".join(left_list)+"]"
	
	rule1 = f"| {covs_0} @<{name}_left> {covs_1} | {covs_2} {covs_3}"
	rule2 = f"{covs_left} | {covs_2} @<{name}_right> {covs_3} |"
	
	f.addContextualSubtable('couples', name+"_second", 'coverage', rule2)
	f.addContextualSubtable('couples', name+"_first", 'coverage', rule1)
#1012044
#1012240
#1011844 bad
# right lookup contains 1 zwj: 1012012
#1000196

#f.addLookup('couples_kern', 'gpos_pair', None, [("dist",[("DFLT",["dflt"])])])
#f.addKerningClass('couples_kern', 'couples_kern1', [left_all], [[],right_all], [0,-WIDTH])

# now set the real metrics. (be careful so fontforge doesn't re-scale the entire font)
descent = round(0.2 * EM) # set the ratio of ascent:descent to 5:1 (doesnt really matter for display itself, but we do this to match other fonts)
f.ascent = EM - descent
f.descent = descent
assert f.em == EM

f.horizontalBaseline = (
	('romn', 'icfb','icft', 'ideo','idtp', 'math'),
	(
		('DFLT', 'romn', (
			0, #romn
			Fixed(-WATERLINE), #icfb
			Fixed(VIEWBOX-WATERLINE), #icft
			Fixed(-WATERLINE-MARGIN), #ideo
			Fixed(VIEWBOX-WATERLINE+MARGIN), #idtp
			Fixed(VIEWBOX/2-WATERLINE), #math
		), ()),
	)
)

# f.verticalBaseline = (
# 	('romn', 'icfb','icft', 'ideo','idtp', 'math'),
# 	(
# 		('DFLT', 'romn', (
# 			0, #romn
# 			Fixed(MARGIN), #icfb
# 			Fixed(MARGIN+VIEWBOX), #icft
# 			Fixed(0), #ideo
# 			Fixed(MARGIN+VIEWBOX+MARGIN), #idtp
# 			Fixed(MARGIN+VIEWBOX/2), #math
# 		), ()),
# 	)
# )

for gname in f:
	glyph = f[gname]
	cp = glyph.unicode
	if cp==0x200D or cp==0x20E3 or cp==0xFE0F or cp>=0xE0000:
		glyph.width = 0
#		glyph.vwidth = 0
	elif glyph.glyphname in left_all:
		glyph.width = 0
#		glyph.vwidth = WIDTH
	else:
		glyph.width = WIDTH
#		glyph.vwidth = WIDTH

f.selection.all()
f.transform([1,0,0,1,Fixed(MARGIN),Fixed(VIEWBOX-WATERLINE)], ('noWidth'))
f.canonicalStart()

print(f.em)
f.generate("build/glyphs.otf", flags=('opentype', 'round', 'no-hints', 'no-flex', 'short-post'))
