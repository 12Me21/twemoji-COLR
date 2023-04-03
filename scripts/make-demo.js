import edata from '../data/edata.mjs'

let basemap = {}
let baselist = []
let flagmap = {}
let flagmap2 = {}

for (let em of edata) {
	let [base, ...flags] = em.ident.split("_")
	if (flags.length==0) {
		basemap[base] = {}
		baselist.push(em)
	}
}
for (let em of edata) {
	let [base, ...flags] = em.ident.split("_")
	if (flags.length!=0) {
		flags = flags.join("_").match(/(woman_woman|man_man|woman_man|skin._skin.|girl_boy|girl_girl|boy_boy|[^_]+)/g)
		
		flags = flags.map(f=>{
			if (f=="man_man")
				f = "man"
			if (f=="woman_woman")
				f = "woman"
			if (f=="woman_man")
				f = "mixed"
			return f
		})
		flags = flags.filter(x=>{
			if (x=="blondHair" || x=="redHair" || x=="bald" || x=="whiteHair" || x=="beard" || x=="curlyHair") {
				base = base + "With" + x[0].toUpperCase()+x.slice(1)
				return false
			}
			return true
		})
		
		let b = basemap[base]
		if (!b) {
			console.warn('cant find base for', base)
			continue
		}
		
		for (let f of flags) {
			flagmap[f] = true
		}
		em.ident = [base, ...flags].join("_")
		
		b[flags] = em.codes
	}
}

console.log(basemap)

let optionsets = {
	gender: ["neutral", "male", "female", "mixed"],
	skin: ["neutral", "1", "2", "3", "4", "5"],
	skin2: ["1", "2", "3", "4", "5"],
}
