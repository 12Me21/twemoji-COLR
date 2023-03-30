import {readXml} from './xml.js'
import Fs from 'fs'

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

let fillColors = []
let fillColor = "black"
function open(name, attrs) {
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
	if (name=="path") {
		console.warn('path', fill)
	}
	//console.warn('opened', name)
	fillColors.push(fillColor)
	fillColor = fill
}
function close(name) {
	fillColor = fillColors.pop()
	//console.warn('closed', name)
}


let files = Fs.readdirSync('twemoji/assets/svg')
for (let f of files) {
	fillColors = []
	fillColor = "black"
	readXml('twemoji/assets/svg/'+f, open, close)
}
