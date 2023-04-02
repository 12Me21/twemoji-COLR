import struct

hsize = 2+2+4+4+2

fheader = ">H>H>L>L>H"
fbaseglyph = ">H>H>H"
flayer = ">H>H"

baseglyphstart = struct.calcsize(fheader)
layerstart = baseglyphstart + struct.calcsize(fbaseglyph)*len(glyphs)
colrsize = layerstart + struct.calcsize(flayer)*numlayers

colr = bytes(layerstart + struct.calcsize(flayer)*numlayers)

struct.pack_into(
	fheader, colr, 0,
	0,
	len(glyphs), baseglyphstart,
	layerstart, numlayers
)

#############

colors = dict()

def find_color(color):
	if color in colors:
		return colors[color]
	return colors[color] := len(colors)

i = baseglyphstart
lstart = 0
for g in glyphs:
	#...
	struct.pack_into(
		fbaseglyph, colr, baseglyphstart,
		glyph.id, lstart, len(g.layers)
	)
	baseglyphstart += 6
	for l in g.layers:
		struct.pack_into(
			flayer, colr, layerstart,
			l['layer'], find_color(l['color'])
		)
		layerstart += 4
		lstart += 1
		
########### cpal

fcpalheader = ">H>H>H>H>L>H"
fcolor = "<L"

colorstart = struct.calcsize(fcpalheader)
cpalsize = colorsize + struct.calcsize(fcolor) * len(colors)
cpal = bytes(cpalsize)

struct.pack_into(
	fcpalheader, cpal,
	0,
	len(colors), 1, len(colors), colorstart,
	0
)

for c in colors:
	rgba = int(c[1:], 16)
	
	struct.pack_into(
		fcolor, cpal, colorstart,
		rgba >> 8 | (rgba & 8) << 8*3
	)
	colorstart += 4
	

