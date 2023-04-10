let rx_num = /[\s,]*([-+]?\d*[.]?\d+(?:[Ee][-+]?\d+)?)/

let rx_x = new RegExp(rx_num.source+"(){0}", 'y')
let rx_y = new RegExp("(){0}"+rx_num.source, 'y')
let rx_num2 = new RegExp(rx_num.source.repeat(2), 'y')
let rx_num4 = new RegExp(rx_num.source.repeat(4), 'y')
let rx_num6 = new RegExp(rx_num.source.repeat(4), 'y')
let rx_arc = new RegExp(rx_num.source.repeat(3)+/[\s,]*([01])[\s,]*([01])/.source+rx_num.source.repeat(2), 'y')
let rx_cmd = new RegExp(/\s*[MmLlHhVvCcSsQqTtAaZz]/,'y')

let argtypes = {
	M: rx_num2,
	L: rx_num2,
	H: rx_x,
	V: rx_y,
	C: rx_num6,
	S: rx_num4,
	Q: rx_num4,
	T: rx_num4,
	A: rx_arc,
}
function parse(str) {
	let m
	let i = 0
	function eat(rx) {
		rx.lastIndex = i
		let m = rx.exec(str)
		if (m) {
			i = rx.lastIndex
			return m
		}
	}
	
	function autoclose() {
		if (contour) {
			contour.push(['M']) // gap (unclosed contour)
			contours.push(contour)
		}
	}
	
	let contours = [], contour = null
	
	let px=0, py=0 // current pen pos
	let sx=0, sy=0 // contour start
	while (1) {
		if (i==str.length)
			break
		let cmd = eat(rx_cmd)
		if (!cmd)
			throw new Error('unknown thing in path: '+str.slice(i-3, i+3+1))
		cmd = str.charAt(i-1)
		let rel
		if (cmd>='a') {
			rel = true
			cmd = cmd.toUpperCase()
		}
		if (cmd=='Z') {
			if (contour) {
				contour.push(['L'])
				contours.push(contour)
				contour = null
				px = sx
				py = sy
			}
			continue
			//
		}
		let rx_arg = argtypes[cmd]
		
		let args = eat(rx_arg)
		if (!args)
			throw new Error('not enough args'+str.slice(i-1, i+20))
		do {
			if (!rel) {
				px = 0
				py = 0
			}
			let nx = px + +((args[args.length-2]??'0')+'e5')
			let ny = py + +((args[args.length-1]??'0')+'e5')
			
			if (cmd=='M') {
				autoclose()
				contour = []
				sx=nx
				sy=ny
				cmd = 'L'
			} else if (cmd=='H'||cmd=='V'||cmd=='L') {
				contour.push(['L'])
			} else if (cmd=='A') {
				contour.push(['A',args[1],args[2],args[3],args[4],args[5]])
			} else if (cmd=='C') {
				contour.push(['C',px+args[1],px+args[2],px+args[3],px+args[4]])
			} else if (cmd=='Q') {
				contour.push(['Q',px+args[1],px+args[2]])
			} else if (cmd=='S') {
				let x=nx,y=ny
				if (contour[contour.length-2][0]=='C') {
					let last = contour[contour.length-1]
					x += nx-last[0]
					y += ny-last[1]
				}
				contour.push(['C',x,y,px+args[1],px+args[2]])
			} else if (cmd=='T') {
				let last = contour[contour.length-1]
				let x=nx,y=ny
				if (contour[contour.length-2][0]=='Q') {
					let last = contour[contour.length-1]
					x += nx-last[0]
					y += ny-last[1]
				}
				contour.push(['Q',x,y])
			}
			px = nx
			py = ny
			contour.push([nx,ny])
		} while (args = eat(rx_arg))
	}
	autoclose()
	return contours
}

function rev1(c) {
	c.reverse()
	c.unshift(c.pop())
	for (let i=1; i<c.length; i+=2) {
		let seg = c[i]
		if (seg[0]=='C')
			c[i] = ['C',seg[3],seg[4],seg[1],seg[2]]
		if (seg[0]=='A')
			seg[0][5] = +!seg[0][5]
	}
	return rev1
}

function fmt(list) {
	return list.map(x=>x/1e5)
}

function unparse_rel(contours) {
	let out = ""
	for (let c of contours) {
		out += "\nM "+fmt(c[0])+" "
		let [sx,sy] = c[0]
		for (let i=1; i<c.length; i+=2) {
			let [cmd, ...args] = c[i]
			if (cmd=='L' && i==c.length-1) {
				out += "Z"
				break
			}
			let pos = c[(i+1) % c.length]
			let [nx,ny] = pos
			pos[0] -= sx
			pos[1] -= sy
			out += cmd.toLowerCase() + " "
			if (cmd=='A') {
				out += fmt(args) + " " // todo: custom formatting for A
			} else {
				for (let j=0;j<args.length;j+=2) {
					args[j+0] -= sx
					args[j+1] -= sy // hnm maybe args should be like ['C',[x,y],[x,y]]...
				}
				out += fmt(args) + " "
			}
			out += fmt(pos) + " "
			0,[sx,sy] = [nx,ny]
		}
	}
	return out
}

function unparse(contours) {
	let out = ""
	for (let c of contours) {
		out += "\nM "+c[0]+" "
		for (let i=1; i<c.length; i+=2) {
			let [cmd, ...args] = c[i]
			if (cmd=='L' && i==c.length-1) {
				out += "Z"
				break
			}
			let pos = c[(i+1) % c.length]
			out += cmd + " "
			out += args + " "
			out += pos + " "
		}
	}
	return out
}

let cc = parse(process.argv[2])
let s = unparse(cc)
console.log(cc,s)
rev1(cc[0])
s = unparse_rel(cc)
console.log(s)
