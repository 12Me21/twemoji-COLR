import Fs from 'fs'

let main = /[/]?[-.:\w]+(?=[\s/>])/y
let end = /\s*>/y
let end2 = /\s*[/]?>/y
let attr = /\s*([-.:\w]+)=(["'])/y

function Tag(){}
let proto = Tag.prototype

//'twemoji/assets/svg/1f328.svg

export function readXml(path, open, close) {
	let stack = []
	let current = {$$:[]}
	
	let xml = Fs.readFileSync(path, 'ascii')
	
	let i = 0
	while (1) {
		i = xml.indexOf("<", i)
		if (i==-1)
			break
		
		main.lastIndex = i+1
		let match = main.exec(xml)
		if (!match)
			throw new Error('xml syntax error, bad char after ‘<’')
		i = main.lastIndex
		
		let name = match[0]
		
		if (name.startsWith("/")) {
			name = name.slice(1)
			
			end.lastIndex = i
			if (!end.test(xml))
				throw new Error(`bad close tag`)
			i = end.lastIndex
			
			if (current.name != name)
				throw new Error(`unclosed <${current.name}>, got </`+name)
			
			close(current.name)
			
			current = stack.pop()
		} else {
			let nw = {__proto__:proto,name}
			stack.push(current)
			current.$$.push(nw)
			current = nw
			
			let attrs = {__proto__:null}
			
			while (1) {
				attr.lastIndex = i
				let match = xml.match(attr)
				if (!match)
					break
				let [, name, quote] = match
				i = xml.indexOf(quote, attr.lastIndex)
				if (i<0)
					throw new Error('unclosed attribute value')
				let value = xml.slice(attr.lastIndex-1, i+1)
				i++
				attrs[name] = value.slice(1,-1)
			}
			
			end2.lastIndex = i
			let e = xml.match(end2)
			if (!e) {
				console.warn(xml.slice(i))
				throw new Error("missing >")
			}
			
			current.$$ = []
			
			open(current.name, attrs)
			
			if (e[0].endsWith("/>")) {
				close(current.name)
				current = stack.pop()
			}
			i = end2.lastIndex
		}
	}
}
