import Fs from 'fs'
import {lines} from './util.js'

let map = new Map()

for await (let line of lines('data/emoji-test.txt')) {
	let match = /^(.*?); *?(fully-qualified|component) *?# (.*?) E(.*?) (.*?)$/.exec(line)
	if (!match) continue
	let [, codes, qual, str, version, name] = match
	codes = codes.match(/\w+/g).map(x=>"0x"+x)
	version = +version
	
	map.set(name, {codes, name})
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
	
	console.log(fullname)
	
	let ex = Fs.accessSync('v1/build/normalized/'+fullname+".svg")
	
}

process.exit(0)
