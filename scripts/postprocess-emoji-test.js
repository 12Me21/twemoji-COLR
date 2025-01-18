import edata from '../build/edata.json' with {type:'json'}

// colons:
// keycap: <symbol>
// flag: <country>
// <person emoji name>: <list of modifiers>
// - skin tone?, hair variant?
// <couple emoji name>: <list of modifiers> (handshake, kiss, couple with heart, people holding hands)
// - skin tone (when both match)
// - skin tone 1, skin tone 2
// - gender 1, gender 2, skin tone 1, skin tone 2
// family: <list of modifiers>
// - (adult|man|woman|child|boy|girl)+

// types:
// simple
// person (has skin tone and/or gender modifiers)
// couple (skin tone and/or gender per-half)
// family (garbage)

let byname = new Map()

let basename_override = {
	'kiss': 'people kissing',
	
	'prince': 'man with crown',
	'princess': 'woman with crown',
	'merman': 'man merperson',
	'mermaid': 'woman merperson',
	'Santa Claus': 'man mx claus',
	'Mrs. Claus': 'woman mx claus',
	'old man': 'older man',
	'old woman': 'older woman',
	'boy': 'man child',
	'girl': 'woman child',
}

let ignore_gender = {
	'woman with headscarf': true,
	'man dancing': true,
	'woman dancing': true,
}

let base_attributes = {
	'blond hair': true,
	'red hair': true,
	'white hair': true,
	'curly hair': true,
	'bald': true,
	'beard': true,
}

function process(fullname) {
	fullname = fullname
		.replace(/^flag: /, "flag_")
		.replace(/^keycap: /, "keycap ")
	
	let [name, ext] = fullname.split(': ')
	name = basename_override[name] ?? name
	
	ext = ext ? ext.split(", ") : []
	
	ext = ext.filter(x=>{
		if (base_attributes[x]) {
			if (name=="man"||name=="woman"||name=="person") {
				name = name + " with " + x
				return false
			}
		}
		return true
	})
	
	return [name, ext]
}

// wait what if we just decode based on the character rather than the name....

let gender_map = {
	"🧑": 0,
	"👨": 1,
	"👩": 2,
	//"undefined": 0,
	//"": 0,
	"‍♂️": 1,
	"‍♀️": 2,
}

let skin_map = {
	//"": 0,
	//"undefined": 0,
	"🏻": 1,
	"🏼": 2,
	"🏽": 3,
	"🏾": 4,
	"🏿": 5,
}

let hardcoded_gender_sets = [
	["🫄", "🫃", "🤰"],
	["🧑‍🎄", "🎅", "🤶"],
	["🫅", "🤴", "👸"],
	["🧒", "👦", "👧"],
	["🧓", "👴", "👵"],
]

let bybase = {__proto__:null}

let tests = [
	// component
	[/^(?<base>[🏻-🏿]|♂️|♀️)$/u, groups=>{
		let base = groups.base
		return {base, ext: {}}
	}],
	// family
	[/^(?<family>(?<parent1>[🧑👨👩])(?:‍(?<parent2>[🧑👨👩]))?‍(?<child1>[🧒👦👧])(?:‍(?<child2>[🧒👦👧]))?)$/u, groups=>{
		let base = "👪"
		return {base, family: groups.family}
	}],
	// adult/man/woman + zwj + object (profession)
	[/^(?<gender>[🧑👨👩])(?<skin>[🏻-🏿])?(?<base>[^🏻-🏿🧑👨👩♂♀]*)(?<direction>‍➡️)?$/u, groups=>{
		let base = "🧑"+groups.base + (groups.direction||"")
		let gender = gender_map[groups.gender]
		let skin = skin_map[groups.skin]
		return {base, ext: {gender, skin}}
	}],
	// something with skin/gender data
	[/^(?<base>[^🏻-🏿🧑👨👩♂♀]*?)(?<skin>[️🏻-🏿])?(?<gender>‍♂️|‍♀️)?(?<direction>‍➡️)?$/u, groups=>{
		let base = groups.base + (groups.direction||"")
		let gender = gender_map[groups.gender]
		let skin = skin_map[groups.skin]
		for (let x of hardcoded_gender_sets) {
			if (base==x[1]) {
				gender = 1
				base = x[0]
				break
			}
			if (base==x[2]) {
				gender = 2
				base = x[0]
				break
			}
		}
		return {base, ext: {gender, skin}}
	}],
	// couple
	[/^(?<gender1>[🧑👨👩])(?<skin1>[🏻-🏿])?(?<base>[^🏻-🏿🧑👨👩♂♀]*)(?<gender2>[🧑👨👩])(?<skin2>[🏻-🏿])?$/u, groups=>{
		let base = "🧑"+groups.base+"🧑"
		let gender1 = gender_map[groups.gender1]
		let skin1 = skin_map[groups.skin1]
		let gender2 = gender_map[groups.gender2]
		let skin2 = skin_map[groups.skin2]
		return {base, exts: [{gender:gender1,skin:skin1}, {gender:gender2,skin:skin2}]}
	}],
	// handshake
	[/^🫱(?<skin1>[🏻-🏿])‍🫲(?<skin2>[🏻-🏿])$/u, groups=>{
		let base = "🤝"
		let skin1 = skin_map[groups.skin1]
		let skin2 = skin_map[groups.skin2]
		return {base, exts: [{gender:undefined,skin:skin1}, {gender:undefined,skin:skin2}]}
	}],
]

function decode_emoji(emoji) {
	for (let test of tests) {
		let m = test[0].exec(emoji)
		if (m) {
			return test[1](m.groups)
		}
	}
	return null
}

let edata2 = edata.filter(x=>x.emoji)
let all = []
for (let data of edata2) {
	let d = decode_emoji(data.emoji)
	if (!d)
		console.error(data.emoji, "no?")
	//d.data = data
	d.emoji = data.emoji
	let list = (bybase[d.base] ??= [])
	list.push(d)
	all.push(d)
}
for (let base in bybase) {
	let list = bybase[base]
	// populate
	let family = list.some(x=>x.family)
	if (family)
		continue
	let couple = list.some(x=>x.exts)
	if (couple) {
		list.forEach(x=>{
			if (x.ext) {
				x.exts = [x.ext, x.ext]
				delete x.ext
			}
		})
		continue
	}
	for (let attr of ['gender', 'skin']) {
		if (list.some(x=>x.ext[attr]!=undefined)) {
			//has = true
			list.forEach(x=>{x.ext[attr]??=0})
		} else {
			list.forEach(x=>{delete x.ext[attr]})
		}
	}
}

for (let d of all) {
//	if (d.ext && Object.keys(d.ext).length)
//		d.data.variant = [d.base, d.ext]
}
console.log("window.EDATA = [\n\t"+Object.entries(bybase).map(([k,v])=>JSON.stringify(v)).join(",\n\t")+"\n]")
