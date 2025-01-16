import Fs from 'fs'
import Readline from 'readline'

function lines(path) {
	return Readline.createInterface({input: Fs.createReadStream(path)})
}

let emojis = []
let extras = []
let couples = [] // couple prototypes

// zero width joiner
extras.push({codes: ["0x200D"], varsel: 1})
// variation selector 16 (do we need this in the font?)
extras.push({codes: ["0xFE0F"], varsel: 1})
// combining enclosing keycap
extras.push({codes: ["0x20E3"], file: '1f7e6', varsel: 1})
// phone keypad characters (for keycap emojis)
for (let chr of "0123456789#*") {
	let code = chr.codePointAt().toString(16)
	extras.push({
		codes: ["0x"+code],
		file: code+"-20e3",
		varsel: 2,
	})
}
// tag letters (for regional flags)
for (let i=0;i<36;i++) {
	let letter = i.toString(36)
	extras.push({
		codes: ["0x"+(0xE0000+letter.codePointAt()).toString(16)],
		varsel: 1,
	})
}
// tag cancel (for regional flags)
extras.push({
	codes: ["0xE007F"],
	varsel: 1,
})
// regional indicators (for country flags)
for (let i=0;i<26;i++) {
	let letter = (i+10).toString(36)
	let code = (0x1F1E6+i).toString(16)
	let codes = ["0x"+code.toUpperCase()]
	extras.push({
		codes,
		file: code,
		varsel: 1,
	})
}

// varsel: bitfield
// 1: may appear with no variation selector or skin tone modifier
// 2: may appear with variation selector 16
// 4: may appear with skin tone modifier
// e.g. 6 means that the character always appears with either a skin tone modifier or a varation selector 16
let varsel = {__proto__:null}

let hardcoded_couples = {
	"👭":"👩‍🤝‍👩",
	"👭🏻":"👩🏻‍🤝‍👩🏻",
	"👭🏼":"👩🏼‍🤝‍👩🏼",
	"👭🏽":"👩🏽‍🤝‍👩🏽",
	"👭🏾":"👩🏾‍🤝‍👩🏾",
	"👭🏿":"👩🏿‍🤝‍👩🏿",
	"👫":"👩‍🤝‍👨",
	"👫🏻":"👩🏻‍🤝‍👨🏻",
	"👫🏼":"👩🏼‍🤝‍👨🏼",
	"👫🏽":"👩🏽‍🤝‍👨🏽",
	"👫🏾":"👩🏾‍🤝‍👨🏾",
	"👫🏿":"👩🏿‍🤝‍👨🏿",
	"👬":"👨‍🤝‍👨",
	"👬🏻":"👨🏻‍🤝‍👨🏻",
	"👬🏼":"👨🏼‍🤝‍👨🏼",
	"👬🏽":"👨🏽‍🤝‍👨🏽",
	"👬🏾":"👨🏾‍🤝‍👨🏾",
	"👬🏿":"👨🏿‍🤝‍👨🏿",
	"💏":"🧑‍❤️‍💋‍🧑",
	"💏🏻":"🧑🏻‍❤️‍💋‍🧑🏻",
	"💏🏼":"🧑🏼‍❤️‍💋‍🧑🏼",
	"💏🏽":"🧑🏽‍❤️‍💋‍🧑🏽",
	"💏🏾":"🧑🏾‍❤️‍💋‍🧑🏾",
	"💏🏿":"🧑🏿‍❤️‍💋‍🧑🏿",
	"💑":"🧑‍❤️‍🧑",
	"💑🏻":"🧑🏻‍❤️‍🧑🏻",
	"💑🏼":"🧑🏼‍❤️‍🧑🏼",
	"💑🏽":"🧑🏽‍❤️‍🧑🏽",
	"💑🏾":"🧑🏾‍❤️‍🧑🏾",
	"💑🏿":"🧑🏿‍❤️‍🧑🏿",
}

function decode_couple(str) {
	str = hardcoded_couples[str] || str
	let m = /^([🧑👨👩][🏻-🏿]?)‍(🤝|❤️‍💋|❤️)‍([🧑👨👩][🏻-🏿]?)$/u.exec(str)
	if (!m) return null
	let [_,person1,type,person2] = m
	return {person1,type,person2}
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
			varsel[c] |= 2
		else if (+next >= 0x1F3FB && +next <= 0x1F3FF)
			varsel[c] |= 4
		else
			varsel[c] |= 1
		return +c != 0xFE0F
	})
	
	let novs = codes2.length==1 || name=="eye in speech bubble" || codes[codes.length-1] == 0x20E3
	
	let file = (novs ? codes2 : codes).map(x=>(+x).toString(16)).join("-")
	
	let couple = decode_couple(str)
	if (couple) {
		// use the couples with 2 of the same person-type as sources
		let type = {"🤝":"hands","❤️‍💋":"kiss","❤️":"heart"}[couple.type];
		if (couple.person1==couple.person2) {
			let id = {"🧑":0,"🧑🏻":1,"🧑🏼":2,"🧑🏽":3,"🧑🏾":4,"🧑🏿":5,"👨":6+0,"👨🏻":6+1,"👨🏼":6+2,"👨🏽":6+3,"👨🏾":6+4,"👨🏿":6+5,"👩":12+0,"👩🏻":12+1,"👩🏼":12+2,"👩🏽":12+3,"👩🏾":12+4,"👩🏿":12+5}[couple.person1]
			couples.push({
				couple: [type, id, "left"],
				glyphName: `couple_${type}_${id}_left`,
				file,
			})
			couples.push({
				couple: [type, id, "right"],
				glyphName: `couple_${type}_${id}_right`,
				file,
			})
		}
		// we need to keep the hardcoded versions, because they will appear in the wild and need to be decomposed
		if (codes.length > 2)
			continue
	}
	
	emojis.push({
		codes: codes2,
		file,
		version: +version,
	})
}

function gname(codes) {
	return codes.map((n,short)=>{
		let u = (+n).toString(16).toUpperCase().padStart(4, "0")
		if (short)
			return u
		if (u.length>4)
			return "u"+u
		else
			return "uni"+u
	}).join("_")
}

process.stdout.write("[")

let first = true
function print_item(obj) {
	process.stdout.write((first?"\n\t":",\n\t")+JSON.stringify(obj))
	first = false
}

for (let data of extras) {
	print_item({
		codes: data.codes,
		file: data.file || null,
		glyphName: gname(data.codes),
		varsel: data.varsel,
	})
}

for (let data of emojis) {
//	if (data.version >= 15)
//		continue
//	if (/[🇦-🇿]/u.test(String.fromCodePoint(...data.codes)))
//		continue
	
	let vs = data.codes.length==1 && varsel[data.codes[0]] || undefined
	
	print_item({
		codes: data.codes,
		varsel: vs,
		file: data.file,
		glyphName: gname(data.codes)
	})
}

for (let data of couples) {
	print_item({
		codes: null,
		file: data.file,
		glyphName: data.glyphName,
		couple: data.couple,
	})
}

process.stdout.write("\n]\n")

// types of things:
// 1: encoded character (ie in the cmap table) - may require varsel 16 (or skin tone modifier.. how do we handle that?)
// 2: ligature (constructed from multiple glyphs via ligature subsitution)
// 3: couple half (constructed from a contextual chaining lookup)
// - and each of these may have a .file, indicating that it appears in the COLR table, and has layers to process

// or i guess like,  what are the attributes of a glyph
// - all [glyph name]
// - is in cmap table [codepoint, variation selector flags]
// - is in basic ligature lookup [list of codepoints — or glyph names] - ah if we use glyph names, then we can do multiple steps of substituion (e.g. person+skin3 -> person_skin3, person_skin3+zwj+school -> teacher_skin3) but idk if this is actually smaller... didn't we already write code to try? what ever happened to that?
// - is in hardcoded couple deconstruction lookup [list of glyphs to deconstruct into]
// - is in couple halfs substitution, and couple halfs kerning [source person type, couple type, which half] - do we store these attributes like enums or as lists of glyph names (the former is simpler, the latter is more extensible)
// - is in COLR table (i.e. has layers) [svg file name]
// - is a layer [list of shapes to load? / how many]
