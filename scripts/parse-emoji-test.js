import Fs from 'fs'
import Readline from 'readline'

function lines(path) {
	return Readline.createInterface({input: Fs.createReadStream(path)})
}

let emojis = []
let extras = []
let couples = [] // couple prototypes

// zero width joiner
extras.push({codes: ["0x200D"]})
// variation selector 16 (do we need this?)
extras.push({codes: ["0xFE0F"]})
// combining enclosing keycap
extras.push({codes: ["0x20E3"], file: '1f7e6'})
// phone keypad characters (for keycap emojis)
for (let chr of "0123456789#*") {
	let code = chr.codePointAt().toString(16)
	extras.push({
		codes: ["0x"+code],
		file: code+"-20e3",
		vs16: 2,
	})
}
// tag letters (for regional flags)
for (let i=0;i<36;i++) {
	let letter = i.toString(36)
	extras.push({
		codes: ["0x"+(0xE0000+letter.codePointAt()).toString(16)],
	})
}
// tag cancel (for regional flags)
extras.push({
	codes: ["0xE007F"],
})
// regional indicators (for country flags)
for (let i=0;i<26;i++) {
	let letter = (i+10).toString(36)
	let code = (0x1F1E6+i).toString(16)
	let codes = ["0x"+code.toUpperCase()]
	extras.push({
		codes,
		file: code,
	})
}

let vs16 = {__proto__:null}

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
for (let file of ['data/emoji-test.txt', 'data/extra-emoji-test.txt'])
	for await (let line of lines(file)) {
		let match = /^(.*?); *?(fully-qualified|component) *?# (.*?) E(.*?) (.*?)$/.exec(line)
		if (!match) continue
		let [, codes, qual, str, version, name] = match
		codes = codes.match(/\w+/g).map(x=>"0x"+x.replace(/^0+/,""))
		
		// filter out varsel16s, create list of which chars need them
		let prev
		let codes2 = codes.filter(c=>{
			if (prev) {
				if (+c == 0xFE0F) {
					if (vs16[prev]===undefined)
						vs16[prev] = 2
					else
						vs16[prev] = 1
					return false
				} else {
					if (vs16[prev] >= 1) {
						vs16[prev] = 1
					} else
						vs16[prev] = 0
				}
			}
			prev = c
			return true
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
			// only keep the simple single-glyph versions, for situations where ligatures aren't supported etc.
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
		vs16: data.vs16,
	})
}

for (let data of emojis) {
//	if (data.version >= 15)
//		continue
//	if (/[🇦-🇿]/u.test(String.fromCodePoint(...data.codes)))
//		continue
	
	if (data.file)
		if (!Fs.existsSync(`twemoji/assets/svg/${data.file}.svg`)) {
			data.file = null
			console.warn(`missing svg ${data.file}.svg, for`, data.codes)
		}
	
	let v16 = data.codes.length==1 && vs16[data.codes[0]] || undefined
	
	print_item({
		codes: data.codes,
		vs16: v16,
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
