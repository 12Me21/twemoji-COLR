import edata from '../data/edata2.mjs'
import Fs from 'fs'

let orig = new Set(Fs.readdirSync('twemoji/assets/svg/'))

let bases = {__proto__:null}

function link(target, name) {
	//console.warn('link', target, name)
	Fs.unlinkSync(name)
	return Fs.symlinkSync(target, name)
}
function mkdir(path) {
	//console.warn('mdir', path)
	return Fs.mkdirSync(path, {recursive:true})
}

for (let em of edata) {
	let path2 = "original/"+em.ident
	if (em.variants) {
		for (let v in em.variants) {
			let path3 = path2+"/"+v
			mkdir(path3)
			let list = em.variants[v]
			for (let [i,l] of list.entries()) {
				if (!l)
					continue
				let [codes, file] = l
				let path = "../../../twemoji/assets/svg/"+file+".svg"
				link(path, path3+"/"+i+".svg")
			}
		}
	} else {
		let file = em.codes[1]
		let path = "../twemoji/assets/svg/"+file+".svg"
		link(path, path2+".svg")
	}
}

/*if (orig.size && 0) {
	console.warn("didn't link some:")
	for (let x of orig) {
		//if (/1f46[89](-1f3f[b-f])?-200d-1f384/.test(x))
		//	continue
		console.log(x, String.fromCodePoint(...x.match(/[0-9a-f]+/ig).map(x=>"0x"+x)))
		console.warn(x)
	}
}
*/
