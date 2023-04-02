import edata from '../data/edata.mjs'
import Fs from 'fs'

let orig = new Set(Fs.readdirSync('twemoji/assets/svg/'))

for (let em of edata) {
	if (!orig.has(em.file+".svg")) {
		console.warn("MISSING:",em.ident)
	}
	//let path = "twemoji/assets/svg/"+em.file+".svg"
	//let path2 = "svg/original/"+em.ident+".svg"
	//Fs.symlinkSync(path, path2)
}

if (orig.size&&0) {
	console.warn("didn't link some:")
	for (let x of orig) {
		//if (/1f46[89](-1f3f[b-f])?-200d-1f384/.test(x))
		//	continue
		console.log(x, String.fromCodePoint(...x.match(/[0-9a-f]+/ig).map(x=>"0x"+x)))
		console.warn(x)
	}
}
