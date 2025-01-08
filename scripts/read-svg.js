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
	if (!c || c == 'none')
		return null
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
		} else if (c = named[c]) {
			break check
		}
		throw new TypeError('unknown color name: '+c)
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
		if ('fill' in attrs) {
			fill = expandColor(attrs.fill, opacity)
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
			if (attrs.viewBox!="0 0 36 36")
				throw new Error("bad svg size: "+attrs.viewBox+"  in "+filename)
		} else if (name=="defs") {
			inDefs = true
			console.warn("found <defs> in "+filename)
		} else {
			throw new Error('unknown shape: <'+name+"> in "+filename)
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
