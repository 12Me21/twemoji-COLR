import {readXml} from './xml.js'
//import Fs from 'fs'

const named = {
	red: '#FF0000',
	green: '#008000',
	blue: '#0000FF',
	black: '#000000',
	navy: '#000080',
	white: '#FFFFFF',
	azure: '#F0FFFF',
	lavender: '#E6E6FA',
}

const fix_colors = {
	"#9D0522":"#A0041E",
	"#BB1A34":"#BE1931",
	"#BE2032":"#BE1931",
	"#BD2032":"#BE1931",
	"#DD2F45":"#DD2E44",
	"#DA2F47":"#DD2E44",
	"#E75A70":"#EA596E",
	"#F2ABBA":"#F4ABBA",
	"#F19020":"#F4900C",
	"#F18F26":"#F4900C",
	"#FCAB40":"#FFAC33",
	"#FAAA35":"#FFAC33",
	"#FDCB58":"#FFCC4D",
	"#FFCB4C":"#FFCC4D",
	"#FFD882":"#FFD983",
	"#FDD888":"#FFD983",
	"#FEE7B8":"#FFE8B6",
	"#3F7123":"#3E721D",
	"#3E701E":"#3E721D",
	"#5D9040":"#5C913B",
	"#5C903F":"#5C913B",
	"#5C913A":"#5C913B",
	"#78B159":"#77B255",
	"#77B155":"#77B255",
	"#A7D28B":"#A6D388",
	"#A6D488":"#A6D388",
	"#C6E4B5":"#C6E5B3",
	"#226798":"#226699",
	"#2A6797":"#226699",
	"#3A87C2":"#3B88C3",
	"#4289C1":"#3B88C3",
	"#5DADEC":"#55ACEE",
	"#8CCAF7":"#88C9F9",
	"#BDDDF4":"#BBDDF5",
	"#553986":"#553788",
	"#7450A0":"#744EAA",
	"#7450A8":"#744EAA",
	"#9268CA":"#9266CC",
	"#AA8ED6":"#AA8DD8",
	"#CBB8E9":"#CBB7EA",
	"#642116":"#662113",
	"#8A4633":"#8A4B38",
	"#BF6952":"#C1694F",
	"#BF6952":"#C1694F",
	"#D79E84":"#D99E82",
	"#DA9F83":"#D99E82",
	"#DA9E82":"#D99E82",
	"#292E32":"#292F33",
	"#67757F":"#66757F",
	"#99AAB5":"#9AAAB4",
	"#AEBBC1":"#AAB8C2",
	"#CDD6DD":"#CCD6DD",
	"#CCD6DC":"#CCD6DD",
	"#CDD7DF":"#CCD6DD",
	"#E0E7EC":"#E1E8ED",
	"#929497":"#939598",
	"#F1F1F1":"#F1F2F2",
	"#E9EFF3":"#E9F0F4", //stadium
	
	"#F4F7F9":"#F5F8FA",
	// new ones:
	"#FFA800":"#FFAC33", // dubious
	"#FC8A00":"#F4900C", // dubious
	"#DFE7ED":"#E1E8ED",
	"#282F33":"#292F33",
	"#CAD4DB":"#CCD6DD",
	// moose
	"#6C1A0D":"#662113",
	"#282F33":"#292F33",
	"#262B2B":"#272B2B",
	"#C86349":"#C1694F",
	// peapod
	"#4E932B":"#5C913B",
	"#9BD57F":"#A6D388",
	"#69B546":"#77B255",
	// jar
	"#F19020":"#F4900C",
	"#F9CA55":"#FFCC4D",
	// wireless
	"#2B87C7":"#3B88C3",
	// old, not sure:
	"#4B545D":"#485359", // the 'incorrect' one is more common, but the emojis it appears in tend to have other wrong colors
	
	"#1C6399":"#226699", // XRay and others (dubious whether this was intended, but its very close so ehh)
	
	// Rainbow - the orange and purple are really far off.
	// due to color-space conversion, probably.
	"#EB2027":"#ED1C24",
	//"#F19020":"#F4900C",
	"#FFCB4C":"#FFCC4D",
	"#5C903F":"#5C913B",
	"#226798":"#226699",
	//"#8767AC":"#9266CC",
	
	// Chains
	"#C6D5DB":"#CCD6DD", // probably
	
	//face clouds
	"#F3F7F9":"#F5F8FA",
	"#C9D5DD":"#CCD6DD",
	"#DEE7ED":"#E1E8ED",
	
	// rootvegetable:
	"#688F47": "#5C913B",
	"#AD2D36": "#BE1931",
	
	// trombone
	"#FFC34A": "#FFCC4D",
	"#FFEA94": "#FFE8B6",
	//harp
	"#E59438": "#F4900C",
	"#EFAE56": "#FFAC33",
	"#CDD5DB": "#CCD6DD",
	// shovel
	"#8A97A4": "#8899A6",
	"#69757E": "#66757F",
	// LeaflessTree
	"#5E2618": "#662113",
	
	// ok now theyre just using random colors
/*	// Orca
	"#C3CEE0": "#CCD6DD",
	"#8496AF": "#8899A6",
	// FightCloud
	"#FF7C33": "#F4900C",
	"#B5C3C9": "#AAB8C2",
	"#DFE8ED": "#E1E8ED",
	"#626365": "#66757F",
	"#8F80EB": "#9266CC",
	// Landslide
	"#B4B5B8": "#AAB8C2",
	"#869193", "#8899A6",*/
}

class Shape {
	transform = null
	constructor(attrs) {
		if (attrs.transform)
			this.transform = attrs.transform
	}
	toString() {
		let s = "<"+this.name
		if (this.transform)
			s += ` transform="${this.transform}"`
		return s
	}
}
class Path extends Shape {
	d = ""
	name = "path"
	constructor(attrs) {
		super(attrs)
		if (attrs.d) {
			this.d = attrs.d
		}
	}
	toString(other) {
		return super.toString() + ` d="${this.d}"` + "/>"
	}
}
class Ellipse extends Shape {
	cx = 0
	cy = 0
	rx = 0
	ry = 0
	name = "ellipse"
	constructor(attrs) {
		super(attrs)
		this.cx = Number(attrs.cx || 0)
		this.cy = Number(attrs.cy || 0)
		if ('r' in attrs)
			this.rx = this.ry = Number(attrs.r || 0)
		else {
			this.rx = Number(attrs.rx || 0)
			this.ry = Number(attrs.ry || 0)
		}
	}
	toString(other) {
		return super.toString() + ` cx="${this.cx}" cy="${this.cy}" rx="${this.rx}" ry="${this.ry}"` + "/>"
	}
}

function expandColor(c, opacity) {
	if (!c)
		return null
	if (c=='none')
		return "#00000000"
	if (c=='currentColor')
		return c
	check: {
		if (c.startsWith("#")) {
			switch (c.length) {
			case 4:
				c = c[0]+c[1]+c[1]+c[2]+c[2]+c[3]+c[3]
			case 7:
				break check
			case 9:
				if (opacity != 1)
					throw new TypeError('mixed opacity')
				return c
			}
		} else if (named[c]) {
			c = named[c]
			break check
		}
		throw new TypeError(`unknown color name: ‘${c}’`)
	}
	return c + Math.round(opacity*255).toString(16).padStart(2,'0')
}

export function process_svg(filename) {
	let paths = []
	let fillColors = []
	let fillColor = "#000000ff"
	let currentPath = null
	function addShape(shape, color) {
		if (!currentPath || currentPath[1]!=color) {
			paths.push(currentPath = [[], color])
		}
		currentPath[0].push(shape)
	}
	let inDefs = false
	function open(name, attrs) {
		if (inDefs)
			return
		let fill
		let opacity = Number(attrs.opacity ?? attrs['fill-opacity'] ?? 1.0)
		if ('stroke' in attrs && attrs.stroke!='none') {
			console.warn("STROKED PATHS ARE UNSUPPORTED")
		}
		if ('fill' in attrs) {
			fill = expandColor(attrs.fill, opacity)
			fill = fill.replace(/^#....../, x=>fix_colors[x]||x)
		} else {
			if (opacity != 1.0)
				fill = expandColor(fillColor.replace(/ff$/i, ""), opacity)
			else
				fill = fillColor
		}
		if (attrs.transform) {
			// fontforge bug: rotate origin must be negated
			attrs.transform = attrs.transform.replace(/\brotate\((.*?)\)/g, (m,p)=>{
				//[+-]? ([0-9]* ".")? [0-9]+ ([Ee] [+-]? [0-9]+)?
				// -?([0-9]*[.])?[0-9]+
				// [0-9]*[.]?[0-9]+
				let nums = p.match(/[^\s,]+/g)
				if (nums.length==3) {
					let [a,x,y] = nums
					if (name=="circle" || name=="ellipse") {
						let {cx=0, cy=0} = attrs
						if (Math.abs(cx-x) < 0.01 && Math.abs(cy-y) < 0.01) {
							x = +cx
							y = +cy
							console.warn("rounded center rotation:", x, y)
						} else {
							console.warn("non-central rotation:", filename, attrs)
						}
					}
					return `rotate(${a}, ${-x}, ${-y})`
				} else if (nums.length != 1)
					throw new Error('invalid rotate transform: '+attrs.transform)
				return m
			})
			// todo: ellipses use transform=rotate(angle,cx,cy), but sometimes this contains rounding errors
		}
		if (name=="path") {
			attrs.d += "Z" // fontforge bug?: doesn't auto-close the last path
			addShape(new Path(attrs), fill)
		} else if (name=="circle" || name=="ellipse") {
			addShape(new Ellipse(attrs), fill)
		} else if (name=="g") {
			if (attrs.transform)
				throw new Error('group transform not supported')
			//
		} else if (name=="svg") {
			if (attrs.viewBox!="0 0 36 36") {
				//console.warn(`WRONG SVG SIZE ‘${attrs.viewBox}’`)
				throw new Error(`WRONG SVG VIEWBOX ‘${attrs.viewBox}’`)
			}
		} else if (name=="defs") {
			inDefs = true
			console.warn("SPURIOUS <defs> ELEMENT")
		} else {
			throw new Error('unknown shape: <'+name+">")
		}
		//console.warn('opened', name)
		fillColors.push(fillColor)
		fillColor = fill
	}
	function close(name) {
		if (name=="defs" && inDefs) {
			inDefs = false
			return
		}
		fillColor = fillColors.pop()
		//console.warn('closed', name)
	}
	readXml(filename, open, close)
	return paths
}
