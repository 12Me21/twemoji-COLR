import Fs from 'fs'

class One {
	constructor(name) {
		this.name = name
		this.text = Fs.readFileSync(dir+"/"+name, 'utf-8')
		this.text = this.text.replace(/(<path) ([^>]*") (fill="[^">]+")/g, (m,a,b,c)=>{
			return a + " " + c + " " + b
		})
		this.i = 0
	}
	scan() {
		return this.text.charAt(this.i++)
	}
	readString() {
		let start = this.i
		let end = this.text.indexOf('"', this.i)
		if (end==-1)
			throw new Error('unclosed string in file '+this.name)
		this.i = end+1
		let str = this.text.slice(start, end)
		return str
	}
}

function same(list) {
	let c0 = list[0]
	let differ = list.some((c,i)=>i && c!=c0)
	return !differ
}

let dir = process.argv[2]
let files = Fs.readdirSync(dir)
files = files.map(f=>new One(f))

for (let i=0; ; i++) {
	let cs = files.map(f=>f.scan())
	let c = cs[0]
	for (let j=1; j<files.length; j++) {
		if (cs[j] != c) {
			console.warn(cs)
			throw new Error('file contents mismatch: '+files[0].name+' and '+files[j].name)
		}
	}
	if (!c)
		break
	
	if (c=='"') {
		let ss = files.map(f=>f.readString())
		if (same(ss)) {
			process.stdout.write('"'+ss[0]+'"')
		} else {
			process.stdout.write('"{'+ss.join("|")+'}"')
		}
	} else
		process.stdout.write(c)
}

