import Fs from 'fs'

class One {
	constructor(name) {
		this.name = name
		this.text = Fs.readFileSync(dir+"/"+name, 'utf-8')
		this.text = this.text.replace(/(<[a-zA-Z]+ )[^>]*?([/]?>)/g, (m,b,a)=>{
			let attrs = m.match(/[-a-zA-Z]+="[^">]*"/g)
			if (!attrs.some(x=>x.startsWith('fill')))
				attrs.push('fill="inherit"')
			attrs.sort()
			return b+attrs.join(" ")+a
		})
		this.i = 0
	}
	scan() {
		let c = this.text.charAt(this.i++)
		if (c!="\n")
			return c
		return this.scan()
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

let out = ""

for (let i=0; ; i++) {
	let cs = files.map(f=>f.scan())
	let c = cs[0]
	for (let j=1; j<files.length; j++) {
		if (cs[j] != c) {
			console.warn(cs)
			console.log(out)
			throw new Error('file contents mismatch: '+files[0].name+' and '+files[j].name)
			//out += files[0].text.slice(files[0].i)
			//c = undefined <ellipse fill="#BE1931" cx="22" cy="28.07" rx="9.214" ry="3.439"/>
		}
	}
	if (!c)
		break
	
	if (c=='"') {
		let ss = files.map(f=>f.readString())
		if (same(ss)) {
			out += '"'+ss[0]+'"'
		} else {
			if (ss[0].length > 10)
				ss = ss.map((s,i)=>i!=3 && s==ss[3] ? "@3" : s)
			out += '"{'+ss.join("|")+'}"'
		}
	} else
		out += c
}

//console.log(out)
Fs.writeFileSync(dir.replace(/[/]?$/,".svg"), out)
