import {XmlWriter} from './xml.js'
import edata from '../data/edata.mjs'

let cmap = {}

for (let em of edata) {
	if (em.codes.length==1) {
		let codepoint = em.codes[0]
		cmap[codepoint] = em
	}
}

let ligatures = new Map()

function defLig(em, glyphs) {
	let list = ligatures.get(glyphs[0])
	if (!list) {
		list = []
		ligatures.set(glyphs[0], list)
	}
	list.push([em, glyphs])
}

for (let em of edata) {
	if (em.codes.length>1) {
		let components = em.codes.map(x=>cmap[x])
		defLig(em, components)
	}
}

let w = new XmlWriter("./build/gsub.ttx")

w.open('GSUB')

~w.leaf('Version', {value: "0x00010000"})

~w.open('ScriptList')
~~w.open('ScriptRecord', {index: 0})
~~~w.leaf('ScriptTag', {value: 'DFLT'})
~~~w.open('Script')
~~~~w.open('DefaultLangSys')
~~~~~w.leaf('ReqFeatureIndex', {value: 0xFFFF})
~~~~~w.leaf('FeatureIndex', {index: 0, value: 0})
~~~~w.done('DefaultLangSys')
~~~w.done('Script')
~~w.done('ScriptRecord')
~w.done('ScriptList')

~w.open('FeatureList')
~~w.open('FeatureRecord', {index: 0})
~~~w.leaf('FeatureTag', {value: 'ccmp'})
~~~w.open('Feature')
~~~~w.leaf('LookupListIndex', {index: 0, value: 0})
~~~~w.open('LookupList')
~~~~~w.open('Lookup', {index: 0})
~~~~~~w.leaf('LookupType', {value: 4})
~~~~~~w.leaf('LookupFlag', {value: 0})
~~~~~~w.open('LigatureSubst', {index: 0, Format: 1})
for (let [base, list] of ligatures) {
	list.sort((a,b)=>{
		return b[1].length - a[1].length
	})
	w.open('LigatureSet', {glyph: base.glyphName})
	for (let [em, glyphs] of list) {
		w.leaf('Ligature', {glyph: em.glyphName, components: glyphs.slice(1).map(x=>x.glyphName).join(",")})
	}
	w.close('LigatureSet')
}
~~~~~~w.done('LigatureSubst')
~~~~~w.done('Lookup')
~~~~w.done('LookupList')
~~~w.done('Feature')
~~w.done('FeatureRecord')
~w.done('FeatureList')
w.done('GSUB')

w.finish()
