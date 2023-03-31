import {process_svg} from './read-svg.js'
import Fs from 'fs'
import edata from '../data/edata.mjs'

let layers = new Map()

edata.sort((a,b)=>{
	return a.ident.length - b.ident.length
})

let glyphs = []

for (let em of edata) {
	console.warn('processing: ', em.ident)
	glyphs.push({glyphName:em.glyphName, codes:em.codes, vs16:em.vs16})
	if (!em.file)
		continue
	
	let paths = process_svg("twemoji/assets/svg/"+em.file+".svg")
	let ls = []
	for (let [p,c] of paths) {
		let s = p.toString()
		let m = layers.get(s)
		if (m==undefined) {
			m = layers.size
			"layer"+String(m).padStart(5,"0")
			layers.set(s, m)
		}
		ls.push([m, c])
	}
	em.layers = ls
}
//console.log(layers)

let meta = edata.map(em=>{
	return JSON.stringify({ident: em.ident, layers: em.layers, glyphName: em.glyphName})
}).join("\n,\t")

Fs.writeFileSync("build/layers.mjs", "export default [\n\t"+meta+",\n]")

for (let [str, lname] of layers) {
	console.warn('writing layer: ',n,'/',layers.size)
	let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">\n`+str+"\n</svg>"
	Fs.writeFileSync("build/layers/"+lname+".svg", svg)
	glyphs.push({glyphName:lname})
}

Fs.writeFileSync("build/glyphs.json", JSON.stringify(glyphs))

console.warn('ok!')

//let files = Fs.readdirSync('twemoji/assets/svg')
//for (let f of files) {
//	let paths = process_svg('twemoji/assets/svg/'+f)
//}
