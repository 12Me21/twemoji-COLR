from struct import Struct

colrheader = Struct(">HHLLH")
baseglyphrecord = Struct(">HHH")
layerrecord = Struct(">HH")

cpalheader = Struct(">HHHHLH")
colorrecord = Struct("<L")

def write_colr(glyphs):
	glyphs = [g for g in glyphs if 'layers' in g]
	numlayers = sum(len(g['layers']) for g in glyphs)
	
	glyphs = 0
	layers = 0
	baseglyphstart = len(colrheader)
	layerstart = baseglyphstart + len(baseglyphrecord)*len(glyphs)
	
	colr = bytes(layerstart + len(layerrecord)*len(layers))
	
	colrheader.pack_into(
		colr, 0,
		0,
		len(glyphs), baseglyphstart,
		layerstart, len(layers)
	)
	
	colors = dict()
	
	def find_color(color):
		if color in colors:
			return colors[color]
		n = len(colors)
		colors[color] = n
		return n
	
	layerindex = 0
	for g in glyphs:
		#...
		baseglyphrecord.pack_into(
			colr, baseglyphstart,
			glyph.id, layerindex, len(g.layers)
		)
		baseglyphstart += 6
		for l in g.layers:
			layerrecord.pack_into(
				colr, layerstart,
				l['layer'], find_color(l['color'])
			)
			layerstart += len(layerrecord)
			layerindex += 1

			########### cpal

			colorstart = len(cpalheader)
			cpal = bytes(colorstart + len(colorrecord) * len(colors))

			cpalheader.pack_into(
				cpal, 0,
				len(colors), 1, len(colors), colorstart,
				0
			)
	
	for c in colors:
		rgba = int(c[1:], 16)

		colorrecord.pack_into(
			cpal, colorstart,
			rgba >> 8 | (rgba & 8) << 8*3
		)
		colorstart += len(colorrecord)
	
	return (colr, cpal)

