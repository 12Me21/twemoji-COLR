import {process_svg} from './read-svg.js'
import Fs from 'fs'

import edata from '../data/edata.mjs'

let layers = new Map()

//edata.sort((a,b)=>{
//	return a.ident.length - b.ident.length
//})

let glyphs = []
let x = performance.now()
let w1 = 0, w2 = edata.length, ws = -1
process.stderr.write("\n\x1B[A💣\\"+"_".repeat(97)+"\x1B7")

for (let em of edata) {
	let ws2 = Math.round(w1/w2*100)
	if (ws2!=ws) {
		process.stderr.write("\x1B8\b\x1B7🔥\n")
		ws = ws2
	}
	w1++ // is there a builtin for progress bars
	
	glyphs.push({glyphName:em.glyphName, codes:em.codes, vs16:em.vs16})
	if (!em.file)
		continue
	
	//if (w1/w2>0.5)
	//	throw new Error('x')
	
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
	//process.stderr.write("shapes:"+sc+"layers:"+paths.length+"new:"+nl+"\n")
}
process.stderr.write('\x1B8💥\n')
//console.log(layers)
let x2 = performance.now()
console.warn(x2-x)
process.exit(0)

let meta = edata.map(em=>{
	return JSON.stringify({ident: em.ident, layers: em.layers, glyphName: em.glyphName})
}).join("\n,\t")

for (let [str, [lname, shapes]] of layers) {
	for (let [i,s] of shapes.entries()) {
		let lname2 = lname+"_"+i
		console.warn('writing layer: ',lname2,'/',layers.size)
		let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">\n`+str+"\n</svg>"
		
		Fs.writeFileSync("build/layers/"+lname2+".svg", svg)
	}
	glyphs.push({glyphName:lname,shapeCount:shapes.length})
}

Fs.writeFileSync("build/glyphs.json", JSON.stringify(glyphs))

Fs.writeFileSync("build/layers.mjs", "export default [\n\t"+meta+",\n]")

console.warn('ok!')

//let files = Fs.readdirSync('twemoji/assets/svg')
//for (let f of files) {
//	let paths = process_svg('twemoji/assets/svg/'+f)
//}
