import edata from '../data/edata.mjs'
import Fs from 'fs'

let orig = new Set(Fs.readdirSync('twemoji/assets/svg/'))

let bases = {__proto__:null}

for (let em of edata) {
	let [base, ...flags] = em.ident.split("_")
	if (flags.length && !bases[base]) {
		Fs.mkdirSync("original/"+base, {recursive:true})
		bases[base] = true
	}
}

for (let em of edata) {
	//if (!orig.has(em.file+".svg")) {
	//	console.warn("MISSING:",em.ident)
	//}
	let [base, ...flags] = em.ident.split("_")
	
	let path2
	let path = "../twemoji/assets/svg/"+em.file+".svg"
	
	if (bases[base]) {
		flags = flags.join("_") || "null"
		path2 = base+"/"+flags
		path = "../" + path
	} else {
		path2 = em.ident
	}
	path2 = "original/"+path2+".svg"	
	
	try {
		Fs.unlinkSync(path2)
	} catch(e) {
		
	}
	if (/[🇦-🇿]/u.test(String.fromCodePoint(...em.codes)))
		continue
	Fs.symlinkSync(path, path2)
}

if (orig.size && 0) {
	console.warn("didn't link some:")
	for (let x of orig) {
		//if (/1f46[89](-1f3f[b-f])?-200d-1f384/.test(x))
		//	continue
		console.log(x, String.fromCodePoint(...x.match(/[0-9a-f]+/ig).map(x=>"0x"+x)))
		console.warn(x)
	}
}
