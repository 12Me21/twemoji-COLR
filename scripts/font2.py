import fontforge
import sys
import json
from common import *

WATERLINE = 6 # how far up the baseline should be (in svg units)
MARGIN = 1 # left/right bearing, in svg units
EMOJI_SCALE = 1.125 # in `em` units. 1.125 means, at a font size of 16px, emojis will be 18px
FULLNAME = "Apple Color Emoji"

EM = round((VIEWBOX / EMOJI_SCALE) * SCALE)
WIDTH = round((MARGIN+VIEWBOX+MARGIN) * SCALE)

f = fontforge.open("build/glyphs.sfd")

f.fontname = FULLNAME.replace(" ", "")
f.familyname = FULLNAME
f.fullname = FULLNAME
f.weight = "Book"
f.version = "15.150" # i'll just use the emoji version (15.1)

f.os2_vendor = "12;;"
f.copyright = '(c) my balls'

f.design_size = 16
f.upos = -(WATERLINE)*SCALE + SCALE # idk ?? nothing uses this anyway
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

couples = {
	"hands": ("‍🤝", "‍"),
	"kiss": ("‍❤‍💋", "‍"),
	"heart": ("‍❤", "‍"),
}

# destroy couple emojis !!
f.addLookup('decouple', 'gsub_multiple', None, [("ccmp",[("DFLT",["dflt"])])], 'any')
f.addLookupSubtable('decouple', 'decouple-1')

# recreate them
f.addLookup('couples', 'gsub_contextchain', None, [("calt",[("DFLT",["dflt"])])], 'decouple')

for c in couples:
	name = "couple_"+c
	
	f.addLookup(name+"_left", 'gsub_ligature', None, ())
	f.addLookupSubtable(name+"_left", name+"_left2")
	f.addLookup(name+"_right", 'gsub_ligature', None, ())
	f.addLookupSubtable(name+"_right", name+"_right2")

person_list = []
for gender in range(3):
	base = ord("🧑👨👩"[gender])
	for skin in range(6):
		person_list += [gname(base) if skin==0 else lname([base,0x1F3FB+skin-1])]

def create_couple(name, cdata):
	glyph = f.createChar(-1, name)
	
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

glyphList = json.load(open('build/glyphs.json'))
for g in glyphList:
	name = str(g['glyphName'])
	typ = g['type']
	if typ=='couple':
		sys.stderr.write('halfcouple '+name+"\n")
		create_couple(name, g['couple'])

decouples = [
	["👭",["👩","‍","🤝","‍","👩"]],
	["👭🏻",["👩🏻","‍","🤝","‍","👩🏻"]],
	["👭🏼",["👩🏼","‍","🤝","‍","👩🏼"]],
	["👭🏽",["👩🏽","‍","🤝","‍","👩🏽"]],
	["👭🏾",["👩🏾","‍","🤝","‍","👩🏾"]],
	["👭🏿",["👩🏿","‍","🤝","‍","👩🏿"]],
	["👫",["👩","‍","🤝","‍","👨"]],
	["👫🏻",["👩🏻","‍","🤝","‍","👨🏻"]],
	["👫🏼",["👩🏼","‍","🤝","‍","👨🏼"]],
	["👫🏽",["👩🏽","‍","🤝","‍","👨🏽"]],
	["👫🏾",["👩🏾","‍","🤝","‍","👨🏾"]],
	["👫🏿",["👩🏿","‍","🤝","‍","👨🏿"]],
	["👬",["👨","‍","🤝","‍","👨"]],
	["👬🏻",["👨🏻","‍","🤝","‍","👨🏻"]],
	["👬🏼",["👨🏼","‍","🤝","‍","👨🏼"]],
	["👬🏽",["👨🏽","‍","🤝","‍","👨🏽"]],
	["👬🏾",["👨🏾","‍","🤝","‍","👨🏾"]],
	["👬🏿",["👨🏿","‍","🤝","‍","👨🏿"]],
	["💏",["🧑","‍","❤","‍","💋","‍","🧑"]],
	["💏🏻",["🧑🏻","‍","❤","‍","💋","‍","🧑🏻"]],
	["💏🏼",["🧑🏼","‍","❤","‍","💋","‍","🧑🏼"]],
	["💏🏽",["🧑🏽","‍","❤","‍","💋","‍","🧑🏽"]],
	["💏🏾",["🧑🏾","‍","❤","‍","💋","‍","🧑🏾"]],
	["💏🏿",["🧑🏿","‍","❤","‍","💋","‍","🧑🏿"]],
	["💑",["🧑","‍","❤","‍","🧑"]],
	["💑🏻",["🧑🏻","‍","❤","‍","🧑🏻"]],
	["💑🏼",["🧑🏼","‍","❤","‍","🧑🏼"]],
	["💑🏽",["🧑🏽","‍","❤","‍","🧑🏽"]],
	["💑🏾",["🧑🏾","‍","❤","‍","🧑🏾"]],
	["💑🏿",["🧑🏿","‍","❤","‍","🧑🏿"]]
]

def cname(str):
	if len(str)==1:
		return gname(ord(str))
	return lname([ord(c) for c in str])

# explode and kill them !!!
#decouples = json.load(open("data/couples-decompose.json", "r"))
for couple in decouples:
	before = cname(couple[0])
	after = [cname(x) for x in couple[1]]
	f[before].addPosSub('decouple-1', after)

left_all = []
right_all = []
# and now, we try
for cname in couples:
	name = f"couple_{cname}"
	c = couples[cname]
	before = c[0]
	after = c[1] # note this must be a single character only !
	
	left_list = []
	for x in range(0, 3*6):
		left_list += [f"{name}_{x}_left"]
		left_all += [f"{name}_{x}_left"]
		right_all += [f"{name}_{x}_right"]
	
	covs_person = "["+" ".join(person_list)+"]"
	covs_before = " ".join(["["+gname(ord(b))+"]" for b in before])
	covs_after = " ".join(["["+gname(ord(b))+"]" for b in after])
	covs_left = "["+" ".join(left_list)+"]"
	
	rule1 = f"| {covs_person} @<{name}_left> {covs_before} | {covs_after} {covs_person}"
	rule2 = f"{covs_left} | {covs_after} @<{name}_right> {covs_person} |"
	
	f.addContextualSubtable('couples', name+"_2", 'coverage', rule2)
	f.addContextualSubtable('couples', name+"_1", 'coverage', rule1)
#1012044
#1012240
#1011844 bad
# right lookup contains 1 zwj: 1012012
#1000196

f.addLookup('couples_kern', 'gpos_pair', None, [("ccmp",[("DFLT",["dflt"])])])
f.addKerningClass('couples_kern', 'couples_kern1', [left_all], [[],right_all], [0,-WIDTH])

# now set the real metrics. (be careful so fontforge doesn't re-scale the entire font)
descent = round(0.2 * EM) # set the ratio of ascent:descent to 5:1 (doesnt really matter for display itself, but we do this to match other fonts)
f.ascent = EM - descent
f.descent = descent
assert f.em == EM

for gname in f:
	glyph = f[gname]
	cp = glyph.unicode
	if cp==0x200D or cp==0x20E3 or cp==0xFE0F or cp>=0xE0000:
		glyph.width = 0
	else:
		glyph.width = WIDTH

f.selection.all()
f.transform([1,0,0,1,MARGIN*SCALE,(VIEWBOX-WATERLINE)*SCALE], ('noWidth'))

print(f.em)
f.generate("build/glyphs.otf", flags=('opentype', 'round', 'no-hints', 'no-flex', 'short-post'))
