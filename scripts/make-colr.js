import {XmlWriter} from './xml.js'
import layers from '../build/layers.mjs'

let colors = new Map()

let w = new XmlWriter('../build/colr.ttx')

w.open('COLR')

~w.leaf('version', {value: 0})

for (let g of layers) {
	w.open('ColorGlyph', {name: g.glyphName})
	for (let l of g.layers) {
		let color = l[1], cid
		if (colors.has(color))
			cid = colors.get(color)
		else {
			cid = colors.size
			colors.set(color, cid)
		}
		w.leaf('layer', {colorID: cid, name: l[0]})
	}
	w.close('ColorGlyph')
}
w.done('COLR')

w.finish()


w = new XmlWriter('../build/cpal.ttx')

w.open('CPAL')

~w.leaf('version', {value: 0})
~w.leaf('numPaletteEntries', {value: colors.size})
~w.open('palette')
for (let [col, id] of colors)
	palette$.ele("color", {index: id, value: col})
~w.done('palette')
w.done('CPAL')

w.finish()
