import Fs from 'fs'
import Readline from 'readline'

function lines(path) {
	return Readline.createInterface({input: Fs.createReadStream(path)})
}

let emojis = []
let extras = []
let couples = [] // couple prototypes

function svg_filename(codes) {
	return codes.map(x=>(+x).toString(16)).join("-")
}

// zero width joiner
extras.push({
	encoding: [0x200D, 1],
})
// variation selector 16 (do we need this in the font?)
extras.push({
	encoding: [0xFE0F, 1],
})
// combining enclosing keycap
extras.push({
	encoding: [0x20E3, 1],
	file: svg_filename([0x20E3]), // fallback
})
// these ascii characters (for keycap emojis)
for (let chr of "0123456789#*") {
	let code = chr.codePointAt()
	extras.push({
		encoding: [code, 2],
		file: svg_filename([code]), // fallback
	})
}
// tag letters (for regional flags)
for (let i=0;i<36;i++) {
	let letter = i.toString(36)
	extras.push({
		encoding: [0xE0000+letter.codePointAt(), 1],
	})
}
// tag cancel (for regional flags)
extras.push({
	encoding: [0xE007F, 1],
})
// regional indicators (for country flags)
for (let i=0;i<26;i++) {
	let letter = (i+10).toString(36)
	let code = 0x1F1E6+i
	extras.push({
		encoding: [code, 1],
		file: svg_filename([code]),
		emoji: String.fromCodePoint(code),
	})
}

// varsel: bitfield
// 1: may appear with no variation selector or skin tone modifier
// 2: may appear with variation selector 16
// 4: may appear with skin tone modifier
// e.g. 6 means that the character always appears with either a skin tone modifier or a varation selector 16
let varsel = {__proto__:null}

import hardcoded_couples from '../data/decouple.json' with {type:'json'}

function decode_couple(str) {
	if (hardcoded_couples[str])
		return hardcoded_couples[str]
	let m
	m = /^(🫱[🏻-🏿]?)‍(🫲[🏻-🏿]?)$/u.exec(str)
	if (m) {
		let [_,person1,person2] = m
		return {type:'hs', people:[person1, person2]}
	}
	m = /^([🧑👨👩][🏻-🏿]?)‍(🤝|❤️‍💋|❤️)‍([🧑👨👩][🏻-🏿]?)$/u.exec(str)
	if (m) {
		let [_,person1,type,person2] = m
		type = {"🤝":"hh","❤️‍💋":"k","❤️":"wh"}[type]
		return {type, people:[person1, person2]}
	}
	return null
}

// read/parse lines from files
for await (let line of lines('data/emoji-test.txt')) {
	let match = /^(.*?); *?(fully-qualified|component) *?# (.*?) E(.*?) (.*?)$/.exec(line)
	if (!match) continue
	let [, codes, qual, str, version, name] = match
	codes = codes.match(/\w+/g).map(x=>"0x"+x.replace(/^0+/,""))
	
	// filter out varsel16s, and create a list of which chars need them
	let codes2 = codes.filter((c,i,codes)=>{
		let next = codes[i+1]
		if (+next == 0xFE0F)
			varsel[+c] |= 2
		else if (+next >= 0x1F3FB && +next <= 0x1F3FF)
			varsel[+c] |= 4
		else
			varsel[+c] |= 1
		return +c != 0xFE0F
	})
	
	let novs = codes2.length==1 || name=="eye in speech bubble" || codes[codes.length-1] == 0x20E3
	
	let file = svg_filename(novs ? codes2 : codes)
	
	let couple = decode_couple(str)
	if (couple) {
		// use the couples with 2 of the same person-type as sources
		let use = couple.people[0] == couple.people[1]
		// except for handshakes, where we want differing skin tones
		if (couple.type=='hs') {
			// todo: we don't actually have a reference file for the
			// right hand with yellow skin
			// (since that one only appears in the 🤝 emoji where it's darkened since both hands are the same skintone)
			// so for combinations outside of unicode (like "🫱🏿‍🫲") the right hand will be the wrong color. i know what the correct colors are but they can't be determined automatically, i would have to hardcode it. that's fine though. but i'll do it later.
			use = ["🫱🏻‍🫲🏼","🫱🏼‍🫲🏽","🫱🏽‍🫲🏾","🫱🏾‍🫲🏿","🫱🏿‍🫲🏻","🤝"].includes(str)
		}
		if (use) {
			couples.push({
				couple: [couple.type, gname([...couple.people[0]].map(x=>x.codePointAt())), "left"],
				file,
			})
			couples.push({
				couple: [couple.type, gname([...couple.people[1]].map(x=>x.codePointAt())), "right"],
				file,
			})
		}
		// we need to keep the hardcoded versions, because they will appear in the wild and need to be decomposed
		if (codes.length > 1)
			continue
		// todo: for these, we can reuse the layers from the halfcouple glyphs. this is probably already the case due to regular layer reuse, however if we're tricky we can like, overlap  in the COLR table.
		// like say,  holding hands (man, left half) followed by holding hands (man, right half). then, the men holding hands can refer to that whole span of the colr table.
	}
	
	let data = {
		glyphName: gname(codes2),
		file,
	}
	data.name = name
	data.emoji = str
	/*if (hardcoded_couples[str]) {
		let couple = hardcoded_couples[str]
		data.decouple = couple.people.map((p,i)=>{
			return couple_half_gname([couple.type, gname([...p].map(x=>x.codePointAt())), ['left','right'][i]])
		})
	}*/
	if (codes2.length==1) {
		data.encoding = [+(codes2[0]), null]
	} else {
		data.ligature = codes2.map(x=>gname([x]))
	}
	emojis.push(data)
}

function gname(codes) {
	return codes.map((n,short)=>{
		let u = (+n).toString(16).toUpperCase().padStart(4, "0")
		if (short)
			return u
		return "u"+u
	}).join("_")
}

function couple_half_gname([type, pers, half]) {
	return `couple_${type}_${pers}_${half}`
}

process.stdout.write("[")

let first = true
function print_item(obj) {
	process.stdout.write((first?"\n\t":",\n\t")+JSON.stringify(obj))
	first = false
}

for (let data of extras) {
	data.glyphName = gname([data.encoding[0]])
	print_item(data)
}

for (let data of emojis) {
	if (data.encoding)
		data.encoding[1] = varsel[data.encoding[0]]
	print_item(data)
}

for (let data of couples) {
	data.glyphName = couple_half_gname(data.couple)
	print_item(data)
}

process.stdout.write("\n]\n")

// or i guess like,  what are the attributes of a glyph
// - all [glyph name] .glyphName
// - all? [some readable name like 'smiling face with hearts'] .name
// - is in cmap table [codepoint, variation selector flags] .code
// - is in basic ligature lookup [list of codepoints — or glyph names] - ah if we use glyph names, then we can do multiple steps of substituion (e.g. person+skin3 -> person_skin3, person_skin3+zwj+school -> teacher_skin3) but idk if this is actually smaller... didn't we already write code to try? what ever happened to that? .ligature
// - is in hardcoded couple deconstruction lookup [list of glyphs to deconstruct into] .decouple
// - is in couple halfs substitution, and couple halfs kerning [source person type, couple type, which half] - do we store these attributes like enums or as lists of glyph names (the former is simpler, the latter is more extensible) .couple = [coupletype, persontype, half]
// - is in COLR table (i.e. has layers) [svg file name] .file
// - is a layer [list of shapes to load? / how many] .shapeCount
