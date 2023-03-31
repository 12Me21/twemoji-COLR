import {process_svg} from './read-svg.js'
import Fs from 'fs'
import edata from '../data/edata.mjs'

let layers = new Map()

edata.sort((a,b)=>{
	return a.ident.length - b.ident.length
})

for (let em of edata) {
	console.warn('processing: ', em.ident)
	
	let paths = process_svg("twemoji/assets/svg/"+em.file+".svg")
	let ls = []
	let cs = []
	for (let [p,c] of paths) {
		let s = p.toString()
		let m = layers.get(s)
		if (m==undefined) {
			m = layers.size
			layers.set(s, m)
		}
		ls.push(m)
		cs.push(c)
	}
	em.layers = ls
	em.colors = cs
}
//console.log(layers)

let meta = edata.map(em=>{
	return JSON.stringify({ident: em.ident, layers: em.layers, colors: em.colors})
}).join("\n,\t")

Fs.writeFileSync("build/layers.mjs", "export default [\n\t"+meta+",\n]")

for (let [str, n] of layers) {
	console.warn('writing layer: ',n,'/',layers.size)
	let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">\n`+str+"\n</svg>"
	let lname = "layer"+String(n).padStart(5,"0")
	Fs.writeFileSync("build/layers/"+lname+".svg", svg)
}

//let files = Fs.readdirSync('twemoji/assets/svg')
//for (let f of files) {
//	let paths = process_svg('twemoji/assets/svg/'+f)
//}
