import Fs from 'fs'
import {lines} from './util.js'

// todo: theres one more unsupported set of redundant ligatures

let map = new Map()

let numbers = {
	__proto__: 'Zero One Two Three Four Five Six Seven Eight Nine Ten'.split(" "),
	'*':'asterisk','&':'and','#':'number sign',
	ñ:'n',Å:'A',é:'e',ô:'o',ç:'c',é:'e',ã:'a',é:'e',í:'i',ü:'u',
	'.':"",'(':"",')':"",'’':"",'“':"",'”':"",'!':"",
}

let extras = [
	{ident: 'ZeroWidthJoiner', codes: ["0x200D"]},
	{ident: 'VariationSixteen',codes: ['0xFE0F']}, // do we need this?
	
	{ident: 'Keycap', codes: ["0x20E3"], file: '1f7e6'},
	{ident: 'NumberSign', codes: ["0x23"], file: '23-20e3', vs16: 2},
	{ident: 'Asterisk', codes: ["0x2A"], file: '2a-20e3', vs16: 2},
]

let suit_hack1 = [], suit_hack2 = []

let skin_names = ['light skin tone','medium-light skin tone','medium skin tone','medium-dark skin tone','dark skin tone']

for (let i=0;i<10;i++) {
	let code = (0x30+i).toString(16)
	extras.push({
		ident: numbers[i],
		codes: ["0x"+code.toUpperCase()],
		file: code+"-20e3",
		vs16: 2,
	})
}

for (let i=0;i<36;i++) {
	let letter = i.toString(36)
	let name = i<10 ? numbers[i].toLowerCase() : letter
	extras.push({
		ident: 'Tag_'+name,
		codes: ["0x"+(0xE0000+letter.codePointAt()).toString(16).toUpperCase()],
	})
}
extras.push({
	ident: 'Tag_cancel',
	codes: ["0xE007F"],
})

for (let i=0;i<26;i++) {
	let letter = (i+10).toString(36)
	let code = (0x1F1E6+i).toString(16)
	let codes = ["0x"+code.toUpperCase()]
	extras.push({
		ident: 'RegionalIndicator_'+letter,
		codes,
		file: code,
		glyphName: gname(codes)
	})
}

let vs16 = {}

// read/parse lines from file
for await (let line of lines('data/emoji-test.txt')) {
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
	
	map.set(name, {
		codes: codes2,
		name,
		version: +version,
		file,
	})
	
	// append this one here
	if (name=="Statue of Liberty") {
		map.set("Shibuya", {
			codes: ['0xE50A'],
			name: "Shibuya",
			version: -1,
			file: 'e50a',
		})
	}
	if (name=="skier") {
		let code = 0x1F3FB
		for (let x of skin_names) {
			let name2 = name+": "+x
			map.set(name2, {
				codes: codes2.concat(["0x"+code.toString(16).toUpperCase()]),
				name: name2,
				version: -1,
				file: '26f7-'+code.toString(16),
			})
			code++
		}
	}
	if (name.startsWith("person in suit levitating")) {
		if (!name.includes(":"))
			file += "-fe0f"
		suit_hack1.push({
			codes: codes2.concat(["0x200D","0x2642","0xFE0F"]),
			name: name.replace("person", "man"),
			version: -1,
			file: file+"-200d-2642-fe0f",
		})
		suit_hack2.push({
			codes: codes2.concat(["0x200D","0x2640","0xFE0F"]),
			name: name.replace("person", "woman"),
			version: -1,
			file: file+"-200d-2640-fe0f"
		})
		// flush
		if (name=="person in suit levitating: dark skin tone") {
			for (let x of suit_hack1)
				map.set(x.name, x)
			for (let x of suit_hack2)
				map.set(x.name, x)
		}
	}
}

let override = {
	'1st place medal': 'first place medal',
	'2nd place medal': 'second place medal',
	'3rd place medal': 'third place medal',
	
	'keycap 10': 'keycap ten',
	
	'kiss': 'people kissing',
	
	'prince': 'man with crown',
	'princess': 'woman with crown',
	'merman': 'man merperson',
	'mermaid': 'woman merperson',
	'Santa Claus': 'man mx claus',
	'Mrs. Claus': 'woman mx claus',
	'old man': 'older man',
	'old woman': 'older woman',
}

let ig = {
	'woman with headscarf': true,
	'man dancing': true,
	'woman dancing': true,
}

let extnames = {
	'light skin tone': 'skin1',
	'medium-light skin tone': 'skin2',
	'medium skin tone': 'skin3',
	'medium-dark skin tone': 'skin4',
	'dark skin tone': 'skin5',
	
	'blond hair':'person with blond hair',
	'red hair':'person with red hair',
	'white hair':'person with white hair',
	'curly hair':'person with curly hair',
	'bald':'bald person',
	'beard':'person with beard',
}

function decode_gender(basename) {
	let gender
	basename = basename.replace(/\b(?:wo)?m[ae]n(?: and man)?(?= |$)/, (g)=>{
		if (g=='men') g = 'man, man'
		else if (g=='women') g = 'woman, woman'
		else if (g=='woman and man') g = 'woman, man'
		else {
			gender = g
			return "person"
		}
		gender = g
		return "people"
	})
	if (gender) {
		let base = map.get(basename)
		if (!base) {
			basename = basename.replace(/^person /, "")
			base = map.get(basename)
		}
		if (!base) {
			console.warn("can't find “"+name+"”")
			//throw new Error("can't find “"+basename+"”")
		}
	}
	return [basename, gender]
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

process.stdout.write("export default [\n")

for (let data of extras) {
	data.glyphName = gname(data.codes)
	process.stdout.write("\t"+JSON.stringify({
		ident: data.ident,
		codes: data.codes,
		file: data.file || null,
		glyphName: data.glyphName,
		vs16: data.vs16,
	})+",\n")
}

for (let [fullname, data] of map) {
//	if (data.version >= 15)
//		continue
//	if (/[🇦-🇿]/u.test(String.fromCodePoint(...data.codes)))
//		continue
	
	fullname = fullname
		.replace(/^flag: /, "flag_")
		.replace(/^keycap: /, "keycap ")
	
	let [name, ext] = fullname.split(': ')
	name = override[name] ?? name
	
	if (!ig[name]) {
		let [basename, gender] = decode_gender(name)
		if (gender) {
			name = basename
			if (ext)
				ext = gender + ", " + ext
			else
				ext = gender
		} else {
			if (ext)
				ext = ext.replace("person, person, ", "")
		}
	}
	
	if (ext) {
		ext = ext.split(", ").map(e=>{
			let f = extnames[e]
			if (f && f.includes(" ")) {
				name = f
				return null
			}
			return f ?? e
		})
		ext = ext.filter(e=>e)
		ext = ext.sort((a,b)=>{
			return (a.startsWith('skin') - b.startsWith('skin'))
		})
	}
	
	name = name.replace(/[^-,: A-Za-z_]/g, v=>{
		let rep = numbers[v]
		if (rep==undefined)
			throw new Error('dont know how '+v)
		return rep
	})
	
	name = name.toLowerCase().replace(/(?:[- ]+|^|(_))(.)/g, (m,s,a)=>(s||"")+a.toUpperCase())
	
	if (ext)
		fullname = [name,...ext].join("_")
	else
		fullname = name
	
	//console.log(fullname)
	
	if (data.file)
		if (!Fs.existsSync('twemoji/assets/svg/'+data.file+".svg"))
			console.warn('missing', fullname, data.file)
	
	let v16 = data.codes.length==1 && vs16[data.codes[0]] || undefined
	
	process.stdout.write("\t"+JSON.stringify({
		ident: fullname,
		codes: data.codes,
		vs16: v16,
		file: data.file,
		glyphName: gname(data.codes)
	})+",\n")
}

process.stdout.write("]\n")

// types:
// simple (single variant)
// skin color (e.g. hands)
// gender (some people emojis)
// gender, skin color (most people emojis)
// couple (i.e. gender, skin color except with more gender and skin color options)
