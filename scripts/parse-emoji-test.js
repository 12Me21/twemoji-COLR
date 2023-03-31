import Fs from 'fs'
import {lines} from './util.js'

let map = new Map()

let numbers = {
	__proto__: 'Zero One Two Three Four Five Six Seven Eight Nine Ten'.split(" "),
	'*':'asterisk','&':'and','#':'number sign',
	ñ:'n',Å:'A',é:'e',ô:'o',ç:'c',é:'e',ã:'a',é:'e',í:'i',
	'.':"",'(':"",')':"",'’':"",'“':"",'”':"",'!':"",
}

let extras = [
	{ident: 'ZeroWidthJoiner', codes: ["0x200D"]},
	{ident: 'VariationSixteen',codes: ['0xFE0F']},
	
	{ident: 'Keycap', codes: ["0x20E3"]},
	{ident: 'NumberSign', codes: ["0x23"]},
	{ident: 'Asterisk', codes: ["0x2A"]},
]

for (let i=0;i<10;i++) {
	extras.push({
		ident: numbers[i],
		codes: ["0x"+(0x30+i).toString(16).toUpperCase()],
		vs16: true,
	})
}

for (let i=0;i<36;i++) {
	let letter = i.toString(36)
	let name = i<10 ? numbers[i] : letter
	extras.push({
		ident: 'Tag_'+name,
		codes: ["0x"+(0xE0000+letter.codePointAt()).toString(16).toUpperCase()],
	})
}
extras.push({
	ident: 'Tag_Cancel',
	codes: ["0xE007F"],
})

for (let i=0;i<26;i++) {
	let letter = (i+10).toString(36)
	extras.push({
		ident: 'RegionalIndicator_'+letter,
		codes: ["0x"+(0x1F1E6+i).toString(16).toUpperCase()],
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
				vs16[prev] ??= true
				return false
			} else
				vs16[prev] = false
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
	
	'blond hair':'blondHair',
	'red hair':'redHair',
	'white hair':'whiteHair',
	'curly hair':'curlyHair',
	'bald':'bald',
	'beard':'beard',
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

function gname(n, short) {
	let u = (+n).toString(16).toUpperCase().padStart(4, "0")
	if (short)
		return u
	if (u.length>4)
		return "u"+u
	else
		return "uni"+u
}

process.stdout.write("export default [\n")

for (let data of extras) {
	data.glyphName = data.codes.map(x=>gname(x)).join("_")
	process.stdout.write("\t"+JSON.stringify({
		ident: data.ident,
		codes: data.codes,
		file: null,
		glyphName: data.codes.map((x,i)=>gname(x,i)).join("_")
	})+",\n")

}

for (let [fullname, data] of map) {
	if (data.version >= 15)
		continue
	
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
			return extnames[e] ?? e
		})
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
		fullname = name+"_"+ext.join("_")
	else
		fullname = name
	
	//console.log(fullname)
	
	if (data.file)
		if (!Fs.existsSync('twemoji/assets/svg/'+data.file+".svg"))
			console.warn('missing', fullname)
	
	let v16 = data.codes.length==1 && vs16[data.codes[0]]
	
	process.stdout.write("\t"+JSON.stringify({
		ident: fullname,
		codes: data.codes,
		vs16: v16,
		file: data.file,
		glyphName: data.codes.map((x,i)=>gname(x,i)).join("_")
	})+",\n")
}

process.stdout.write("]\n")
