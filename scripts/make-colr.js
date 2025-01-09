import {XmlWriter} from './xml.js'
import layers from '../build/layers.json' with {type:'json'}
import Bar from './progress.js'

let colors = new Map()

let w = new XmlWriter('build/colr.ttx')

w.putXml()

w.open('ttFont', {ttLibVersion: "4.34"})

w.open('COLR')

~w.leaf('version', {value: 0})

let bar = new Bar(layers.length)
let w1 = 0
bar.start()
for (let g of layers) {
	bar.step(w1++)
	if (!g.layers)
		continue
	w.open('ColorGlyph', {name: g.glyphName.replace(/^uni(?=...._)/,'u')})
	
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
	w.done('ColorGlyph')
}
w.done('COLR')

w.done('ttFont')

w.finish()
bar.end()


w = new XmlWriter('build/cpal.ttx')

w.putXml()

w.open('ttFont', {ttLibVersion: "4.34"})

w.open('CPAL')

~w.leaf('version', {value: 0})
~w.leaf('numPaletteEntries', {value: colors.size})
~w.open('palette')
for (let [col, id] of colors)
	w.leaf('color', {index: id, value: col})
~w.done('palette')
w.done('CPAL')

w.done('ttFont')

w.finish()


import glyphs from '../build/glyphs.json' with {type:'json'}

w = new XmlWriter('build/hmtx.ttx')

w.putXml()

w.open('ttFont', {ttLibVersion: "4.34"})

w.open('hmtx')
~w.leaf('mtx', {name:'.notdef', width: 720, lsb:0})
for (let g of glyphs) {
	let zero = g.glyphName=="uni200D" || g.glyphName=="uniFE0F" || g.glyphName=="uni20E3" || g.glyphName.startsWith("uE00")
	
	w.leaf('mtx', {name:g.glyphName, width: zero ? 0 : 720, lsb:0})
}
w.done('hmtx')

w.done('ttFont')

w.finish()

// todo: we probably have to set the numberofmetrics field in HEAD
