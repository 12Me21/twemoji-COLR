import {process_svg} from './read-svg.js'
import Fs from 'fs'
import Bar from './progress.js'

import edata from '../data/edata.json' with {type:'json'}

let layers = new Map()

function merge_shapes(p1) {
	let paths = []
	let currentPath = null
	for (let [shape, color] of p1) {
		if (!currentPath || currentPath[1]!=color) {
			paths.push(currentPath = [[], color])
		}
		currentPath[0].push(shape)
	}
	return paths
}

function split_in_half(paths) {
	let all = []
	for (let [p,c] of paths)
		for (let s of p)
			all.push([[s],c])
	let split = [all.splice(0, all.length/2), all]
	// note that this doesn't re-merge by color !
	return split
}

let glyphs = []
let bar = new Bar(edata.length)
let w1 = 0
let totalshapes = 0
bar.start()
for (let em of edata) {
	bar.step(w1++)
	
	if (em.couple)
		glyphs.push({glyphName:em.glyphName, vs16:em.vs16, couple:em.couple})
	else
		glyphs.push({glyphName:em.glyphName, codes:em.codes, vs16:em.vs16})
	if (!em.file)
		continue
	
	//if (w1/w2>0.5)
	//	throw new Error('x')
	
	// todo: would be nice if we could like, tell it to start loading the next file right away so it will be ready by the time the current one processes.
	// also; would be nice if we could sync this task with fontforge so it imports the layers as we produce them
	console.info(`processing svg: ‘${em.file}.svg’`)
	let paths = process_svg("twemoji/assets/svg/"+em.file+".svg")
	// hack
	if (em.couple) {
		let halfs = split_in_half(paths)
		if (em.couple[2]=="left")
			paths = halfs[0]
		else
			paths = halfs[1]
		paths = merge_shapes(paths)
	}
	
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
			totalshapes+=p.length
		} else {
			0,[m] = m
		}
		ls.push([m, c])
	}
	em.layers = ls
	//totalshapes += sc
	//process.stderr.write("shapes:"+sc+"layers:"+paths.length+"new:"+nl+"\n")
}
bar.end()
//console.log(layers)

let meta = edata.map(em=>{
	return JSON.stringify({layers: em.layers, glyphName: em.glyphName})
}).join("\n,\t")

console.warn("layers:", layers.size, "shapes:", totalshapes)
bar = new Bar(totalshapes)
w1 = 0
bar.start()
for (let [str, [lname, shapes]] of layers) {
	for (let [i,s] of shapes.entries()) {
		bar.step(w1++)
		let lname2 = lname+"_"+i
		//console.warn('writing layer: ',lname2,'/',layers.size)
		let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">\n`+s.toString()+"\n</svg>"//ugh we call tostring twice here.. what if we just split the existing string on \n 
		
		Fs.writeFileSync("build/layers/"+lname2+".svg", svg)
	}
	glyphs.push({glyphName:lname,shapeCount:shapes.length})
}
bar.end()

Fs.writeFileSync("build/glyphs.json", JSON.stringify(glyphs))

Fs.writeFileSync("build/layers.json", "[\n\t"+meta+"\n]")

console.warn('ok!')

//let files = Fs.readdirSync('twemoji/assets/svg')
//for (let f of files) {
//	let paths = process_svg('twemoji/assets/svg/'+f)
//}
