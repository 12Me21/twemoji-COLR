import edata from '../data/edata.mjs'

let basemap = {
	Tag: {ident:'TagLetter', variants: {}},
	RegionalIndicator: {ident:'RegionalIndicator', variants: {}},
	Flag: {ident:'Flag', variants: {}},
	Ascii: {ident:'Ascii', variants: {}},
}
let baselist = []
let flagmap = {}
let flagmap2 = {}

function codes(em) {
	return [em.codes, em.file]
}

for (let em of edata) {
	let [base, ...flags] = em.ident.split("_")
	if (em.codes.length==1 && em.codes[0] < 0x40) {
		flags = [base.toLowerCase()]
		base = "Ascii"
		em.ident = base+"_"+flags
	}
	if (flags.length==0) {
		if (basemap[base])
			throw new Error('duplicate '+em.ident)
		basemap[base] = {ident:base, codes:codes(em)}
		if (base=="PeopleHoldingHands" || base=="CoupleWithHeart" || base=="Kiss"||base=="Handshake") {
			basemap[base].couple = true
		}
		if (base=="Family") {
			basemap[base].family = true
			basemap[base].variants = {}
		}
		
		baselist.push(em)
	}
}

for (let em of edata) {
	let [base, ...flags] = em.ident.split("_")
	
	let b = basemap[base]
	if (!b) {
		console.warn('cant find base for', base)
		continue
	}
	
	if (b.family) { // the best way to group these might be by # of children/parents? since that's what the glyph structure will be based on
		b.variants[flags.join("_") || "neutral" ] = codes(em)
		continue
	}
	
	if (flags.length!=0) {
		if (b.codes) {
			b.variants = {
				neutral: [b.codes],
			}
			delete b.codes
		}
		
		flags = flags.join("_").match(/(woman_woman|man_man|woman_man|skin._skin.|[^_]+)/g)
		
		let gender = "neutral", skin = "0"
		let fake = false
		
		flags = flags.map(f=>{
			if (f=="man_man" || f=="man")
				f = gender = "male"
			else if (f=="woman_woman" || f=="woman")
				f = gender = "female"
			else if (f=="woman_man")
				f = gender = "mixed"
			else if (f.startsWith("skin"))
				skin = f.replace(/\D+/g,"")
			else {
				gender = f
				fake = true
			}
			return f
		})
		if (b.couple && skin.length==1)
			skin = skin.repeat(2)
		
		if (b.couple) {
			if (skin=="00")
				skin = 0
			else
				skin = 1 + (skin[0]-1)*5 + (skin[1]-1)
		}
		
		if (skin>0)
			b.skin = true
		
		if (fake) {
			b.variants[gender] = codes(em)
			b.special = true
		} else {
			let v = b.variants[gender] ??= []
			v[+skin] = codes(em)
			if (gender!="neutral")
				b.gender = true
		}
		
		//if (em.codes[0]=="0x1F46D" && em.codes.length==1)
		//	console.warn(gender, skin, v[skin])
	}
}

console.warn(Object.keys(basemap).length)

console.log("export default [")
console.log("\t"+Object.values(basemap).map(x=>JSON.stringify(x)).join(",\n\t"))
console.log("]")

//console.log(JSON.stringify(, null, "  "))
