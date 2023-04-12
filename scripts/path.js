let rx_num = /[\s,]*([-+]?\d*[.]?\d+(?:[Ee][-+]?\d+)?)/

let rx_x = new RegExp(rx_num.source+"(){0}", 'y')
let rx_y = new RegExp("(){0}"+rx_num.source, 'y')
let rx_num2 = new RegExp(rx_num.source.repeat(2), 'y')
let rx_num4 = new RegExp(rx_num.source.repeat(4), 'y')
let rx_num6 = new RegExp(rx_num.source.repeat(6), 'y')
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

function pnum(ns) {
	return Number(ns+"e+5")
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
		
	let contours = [], contour = null
	
	let px=0, py=0 // current pen pos
	let sx=0, sy=0 // contour start
	
	function autoclose() {
		if (contour) {
			if (px==sx && py==sy)
				contour.pop()
			else
				contour.push(['L'])
			//contour.push(['M']) // gap (unclosed contour)
			contours.push(contour)
		}
	}
	
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
				if (px==sx && py==sy)
					contour.pop()
				else
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
				if (cmd!='V')
					px = 0
				if (cmd!='H')
					py = 0
			}
			let nx = px + pnum(args[args.length-2]??'0')
			let ny = py + pnum(args[args.length-1]??'0')
			
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
				contour.push(['C',px+pnum(args[1]),py+pnum(args[2]),px+pnum(args[3]),py+pnum(args[4])])
			} else if (cmd=='Q') {
				contour.push(['Q',px+pnum(args[1]),py+pnum(args[2])])
			} else if (cmd=='S') {
				let last = contour[contour.length-1]
				let lastc = contour[contour.length-2]
				let [x,y] = last
				if (lastc[0]=="C") {
					x += x-lastc[3]
					y += y-lastc[4]
				}
				contour.push(['C',x,y,px+pnum(args[1]),py+pnum(args[2])])
			} else if (cmd=='T') {
				let last = contour[contour.length-1]
				let lastc = contour[contour.length-2]
				let [x,y] = last
				if (lastc[0]=="Q") {
					x += x-lastc[1]
					y += y-lastc[2]
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
	return list.map(x=>String(x/1e5)).join(",")//.replace(/^[^-]/,'+$&')).join("")
}

function next(c, i) {
	return c[(i+1) % c.length]
}

function check(c) {
	for (let i=1; i<c.length; i+=2) {
		let cmd = c[i]
		let pp = c[i-1]
		let np = next(c, i)
		if (cmd[0]=='C') {
			let [,x1,y1,x2,y2] = cmd
			let o1 = orientation(pp,[x1,y1],np)
			let o2 = orientation(pp,[x2,y2],np)
			if (o1==0 && o2==0)
				console.warn('degenerate cubic bezier')
		}
		if (cmd[0]=='Q') {
			let [,x1,y1] = cmd
			let o1 = orientation(pp,[x1,y1],np)
			if (o1==0)
				console.warn('degenerate quadratic bezier')
		}
		if (pp[0]==np[0] && pp[1]==np[1]) {
			console.warn('consecutive coincident points around '+cmd)
		} else if (cmd[0]=='L' && next(c, i+1)[0]=='L') {
			let np2 = next(c, i+2)
			let o1 = orientation(pp,np,np2)
			if (o1==0)
				console.warn('consecutive collinear line segments')
		}
	}
}

function unparse_rel(contours) {
	let out = ""
	for (let c of contours) {
		out += "\nM "+fmt(c[0])+" "
		let [sx,sy] = c[0]
		for (let i=1; i<c.length; i+=2) {
			let [cmd, ...args] = c[i]
			/*if (cmd=='L' && i==c.length-1) {
				out += "Z"
				break
			}*/
			if (cmd=='C') {
				let pp = c[i-1]
				let pc = c[i-2]
				let dx = args[0]-pp[0]
				let dy = args[1]-pp[1]
				
				if (pc && pc[0]=='C') {
					if (pp[0]-dx == pc[1] && pp[1]-dy == pc[2]) {
						cmd = "S"
						args = args.slice(2)
					}
				} else {
					if (dx==0 && dy==0) {
						cmd = "S"
						args = args.slice(2)
					}
				}
			}
			let pos = c[(i+1) % c.length]
			let [nx,ny] = pos
			if (cmd=='L') {
				if (nx==sx)
					out += "\nv " + fmt([pos[1]-sy]) + " "
				if (ny==sy)
					out += "\nh " + fmt([pos[0]-sx]) + " "
			} else {
				out += "\n"+cmd.toLowerCase() + " "
				if (cmd=='A') {
					out += fmt(args) // todo: custom formatting for A
				} else {
					for (let j=0;j<args.length;j+=2) {
						args[j+0] -= sx
						args[j+1] -= sy // hnm maybe args should be like ['C',[x,y],[x,y]]...
					}
					
					out += fmt(args)
				}
				if (args.length)
					out += " "
				out += fmt([pos[0]-sx,pos[1]-sy]) + " "
			}
			0,[sx,sy] = [nx,ny]
		}
		out += "\nZ"
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

function orientation(a, b, c) {
	return (a[0]*b[1] + b[0]*c[1] + c[0]*a[1]) - (a[1]*b[0] + b[1]*c[0] + c[1]*a[0])
}

function or(seg) {
	let sl = seg.length-1
	for (let i=0; i<sl; i+=2) {
		let a = seg[i % seg.length]
		let b = seg[(i+2) % seg.length]
		let c = seg[(i+4) % seg.length]
		let o = orientation(a,b,c)
		console.warn(o)
	}
}

let cc = parse(process.argv[2])
//let s = unparse(cc)
console.warn(cc)
//rev1(cc[0])
//or(cc[0])
check(cc[0])
let s = unparse_rel(cc)
console.log(s)
// todo: check if console.log is slowing down startup
//
//M20.896,18.375 c0.318,1.396,2.009,4.729 2.009,4.729 c0,0,-1.639,1.477 -2.987,1.437 l-1.955,-2.841 l-1.735,2.446 c0,0,-1.713,-1.274 -2.931,-1.485 c0,0,1.666,-3.182 2.023,-3.856 c0.357,-0.674,1.057,-1.547 1.057,-1.547 c0,0,4.271,0.028 4.519,1.117 Z

//M100 100 L 200 200 500 500 500 500 L 600 50 z - warnings
