import {process_svg} from './read-svg.js'
import Fs from 'fs'

import edata from '../data/edata.mjs'

let layers = new Map()

//edata.sort((a,b)=>{
//	return a.ident.length - b.ident.length
//})

let glyphs = []

for (let em of edata) {
	console.warn('processing: ', em.ident)
	glyphs.push({glyphName:em.glyphName, codes:em.codes, vs16:em.vs16})
	if (!em.file)
		continue
	
	// todo: would be nice if we could like, tell it to start loading the next file right away so it will be ready by the time the current one processes.
	// also; would be nice if we could sync this task with fontforge so it imports the layers as we produce them
	let paths = process_svg("twemoji/assets/svg/"+em.file+".svg")
	
	let sc = 0
	let nl = 0
	let ls = []
	for (let [p,c] of paths) {
		let s = p.map(p=>{
			sc++
			return p.toString()
		}).join("\n")
		let m = layers.get(s)
		if (m==undefined) {
			m = layers.size
			m = "layer"+String(m).padStart(5,"0")
			layers.set(s, [m, p])
			nl++
		} else {
			0,[m] = m
		}
		ls.push([m, c])
	}
	em.layers = ls
	console.warn("shapes:",sc,"layers:",paths.length,"new:",nl)
}
//console.log(layers)

let meta = edata.map(em=>{
	return JSON.stringify({ident: em.ident, layers: em.layers, glyphName: em.glyphName})
}).join("\n,\t")

let pool = new Set()

for (let [str, [lname, shapes]] of layers) {
	for (let [i,s] of shapes.entries()) {
		let lname2 = lname+"_"+i
		console.warn('writing layer: ',lname2,'/',layers.size, 'pressure:',pool.size)
		let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">\n`+str+"\n</svg>"
		
		let p = Fs.promises.writeFile("build/layers/"+lname2+".svg", svg)
		pool.add(p)
		p.then(x=>pool.delete(p))
		if (pool.size >= 10)
			await Promise.any([...pool])
	}
	glyphs.push({glyphName:lname,shapeCount:shapes.length})
}

await Promise.all([...pool])

Fs.writeFileSync("build/glyphs.json", JSON.stringify(glyphs))

Fs.writeFileSync("build/layers.mjs", "export default [\n\t"+meta+",\n]")

console.warn('ok!')

//let files = Fs.readdirSync('twemoji/assets/svg')
//for (let f of files) {
//	let paths = process_svg('twemoji/assets/svg/'+f)
//}
