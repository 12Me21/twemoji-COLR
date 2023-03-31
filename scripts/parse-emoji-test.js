import Fs from 'fs'
import {lines} from './util.js'

let map = new Map()

let override_filename = {
	'1f441-fe0f-200d-1f5e8-fe0f': '1f441-200d-1f5e8',
	'263a-fe0f': '263a',
	'2639-fe0f': '2639',
	'2620-fe0f': '2620',
	'2763-fe0f': '2763',
	'1fae8': false,
}

let extras = [
	{ident: 'ZeroWidthJoiner', codes: ["0x200D"]},
	{ident: 'VariationSixteen',codes: ['0xFE0F']},
	{ident: 'Keycap', codes: ["0x20E3"]},
	{ident: 'NumberSign', codes: ["0x23"]},
	{codes: ["0x2A"], ident: 'Asterisk'},
	{codes: ["0x30"], ident: 'Zero'},
	{codes: ["0x31"], ident: 'One'},
	{codes: ["0x32"], ident: 'Two'},
	{codes: ["0x33"], ident: 'Three'},
	{codes: ["0x34"], ident: 'Four'},
	{codes: ["0x35"], ident: 'Five'},
	{codes: ["0x36"], ident: 'Six'},
	{codes: ["0x37"], ident: 'Seven'},
	{codes: ["0x38"], ident: 'Eight'},
	{codes: ["0x39"], ident: 'Nine'},
]

for (let i=0;i<36;i++) {
	let letter = i.toString(36)
	extras.push({
		ident: 'Tag_'+letter,
		codes: ["0x"+(0xE0000+letter.codePointAt()).toString(16).toUpperCase()],
	})
}
extras.push({
	ident: 'Tag_cancel',
	codes: ["0xE007F"],
})

let vs16 = {}

// read/parse lines from file
for await (let line of lines('data/emoji-test.txt')) {
	let match = /^(.*?); *?(fully-qualified|component) *?# (.*?) E(.*?) (.*?)$/.exec(line)
	if (!match) continue
	let [, codes, qual, str, version, name] = match
	codes = codes.match(/\w+/g).map(x=>"0x"+x)
	
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
		let rep = {
			'*':'asterisk','&':'and','#':'number sign',
			0:'zero',1:'one',2:'two',3:'three',4:'four',
			5:'five',6:'six',7:'seven',8:'eight',9:'nine',
			ñ:'n',Å:'A',é:'e',ô:'o',ç:'c',é:'e',ã:'a',é:'e',í:'i',
			'.':"",'(':"",')':"",'’':"",'“':"",'”':"",'!':"",
		}[v]
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
	})+",\n")
}
