function fmt(num) {
	return String(num/1e5)//.replace(/^[^-]/,'+$&')).join("")
}

class Point {
	constructor(x, y) {
		this.x = x
		this.y = y
	}
	fmt(rel) {
		let {x,y} = this
		if (rel) {
			x -= rel.x
			y -= rel.y
		}
		return fmt(x)+","+fmt(y)
	}
	Add(p) {
		return new Point(this.x+p.x, this.y+p.y)
	}
	Subtract(p) {
		return new Point(this.x-p.x, this.y-p.y)
	}
	Copy() {
		return new Point(this.x, this.y)
	}
}

class Seg {
	reverse() {
	}
}

class SegL extends Seg {
}
SegL.prototype.letter = "l"

class SegC extends Seg {
	constructor(c1, c2) {
		super()
		this.c1 = c1
		this.c2 = c2
	}
	reverse() {
		let temp = this.c1
		this.c1 = this.c2
		this.c2 = temp
	}
}
SegC.prototype.letter = "c"

class SegQ extends Seg {
	constructor(c) {
		super()
		this.c = c
	}
}
SegQ.prototype.letter = "q"

class SegA extends Seg {
	constructor(radius,angle,large,sweep) {
		super()
		this.radius = radius
		this.angle = angle
		this.large = large
		this.sweep = sweep
	}
	reverse() {
		this.sweep = !this.sweep
	}
}
SegA.prototype.letter = "a"

let rx_num = /[\s,]*([-+]?\d*(?:[.]\d+(?!\d)|\d(?![\d.]))(?:[Ee][-+]?\d+(?!\d))?)/

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
	T: rx_num2,
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
				contour.push(new SegL())
			//contour.push(['M']) // gap (unclosed contour)
			contours.push(contour)
			contour = null
		}
	}
	
	while (1) {
		if (i==str.length)
			break
		let cmd = eat(rx_cmd)
		if (!cmd) {
			if (i == str.search(/\s+$/))
				break
			throw new Error('unknown thing in path: '+str.slice(i-3, i+3+1))
		}
		cmd = str.charAt(i-1)
		let rel
		if (cmd>='a') {
			rel = true
			cmd = cmd.toUpperCase()
		}
		if (cmd=='Z') {
			autoclose()
			px = sx
			py = sy
			continue
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
				sx = nx
				sy = ny
			} else if (cmd=='H'||cmd=='V'||cmd=='L') {
				contour.push(new SegL())
			} else if (cmd=='A') {
				contour.push(new SegA(new Point(pnum(args[1]),pnum(args[2])),pnum(args[3]),args[4]!=0,args[5]!=0))
			} else if (cmd=='C') {
				contour.push(new SegC(
					new Point(px+pnum(args[1]),py+pnum(args[2])),
					new Point(px+pnum(args[3]),py+pnum(args[4])),
				))
			} else if (cmd=='Q') {
				let c = new Point(px+pnum(args[1]),py+pnum(args[2]))
				contour.push(new SegQ(c))
			} else if (cmd=='S') {
				let last = contour[contour.length-1]
				let lastc = contour[contour.length-2]
				let {x,y} = last
				if (lastc instanceof SegC) {
					x += x-lastc.c2.x
					y += y-lastc.c2.y
				}
				contour.push(new SegC(new Point(x,y),new Point(px+pnum(args[1]),py+pnum(args[2]))))
			} else if (cmd=='T') {
				let last = contour[contour.length-1]
				let lastc = contour[contour.length-2]
				if (lastc instanceof SegQ) {
					last = last.Add(last).Subtract(lastc.c)
				} else {
					last = last.Copy()
				}
				contour.push(new SegQ(last))
			}
			px = nx
			py = ny
			contour.push(new Point(nx,ny))
		} while (args = eat(rx_arg))
	}
	autoclose()
	return contours
}

function rev1(c) {
	c.reverse()
	c.unshift(c.pop())
	for (let i=1; i<c.length; i+=2)
		c[i].reverse()
	return rev1
}

function to_rrect(c) {
	let s
	let corners = {
		
	}
	let rads = []
	for (s=1; s<c.length; s+=2) {
		if (c[s] instanceof SegC) {
			let p1 = get(c, s-1)
			let p2 = get(c, s+1)
			let d = new Point(p2.x-p1.x, p2.y-p1.y)
			// found corner
			if (1 || Math.abs(Math.abs(d.x)-Math.abs(d.y)) <= 1000) {
				rads.push(new Point(Math.abs(d.x),Math.abs(d.y)))
				console.warn("corner", d)
				if (d.x < 0) {
					if (d.y < 0) {
						corners.bottomleft = new Point(p2.x,p1.y)
					} else {
						corners.bottomright = new Point(p1.x,p2.y)
					}
				} else {
					if (d.y < 0) {
						corners.topleft = new Point(p1.x,p2.y)
					} else {
						corners.topright = new Point(p2.x,p1.y)
					}
				}
			}
		}
	}
	//console.log("corners", corners, rads)
	let rx = 0, ry=0
	for (let r of rads) {
		rx += r.x
		ry += r.y
	}
	rx /= rads.length
	ry /= rads.length
	for (let r of rads) {
		if (dist([rx,ry], r) >= 400)
			throw new Error('bad corners')
	}
	let x = corners.topleft.x
	let y = corners.topleft.y
	let w = corners.bottomright.x - x
	let h = corners.bottomright.y - y
	console.warn("corners", corners, rads)
	if (corners.topleft.x != corners.bottomleft.x || corners.topright.x != corners.bottomright.x || corners.topleft.y != corners.topright.y || corners.bottomleft.y != corners.bottomright.y) {
		throw new Error('not rectangle')
	}
	if (rx*2 == w && ry*2 == h)
		return `<ellipse cx="${fmt(x+w/2)}" cy="${fmt(y+h/2)}" rx="${fmt(w/2)}" ry="${fmt(h/2)}"`
	if (rx==ry)
		return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt((rx+ry)/2)}"`
	else
		return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(rx)}" ry="${fmt(ry)}"`
}

function next(c, i) {
	return c[(i+1) % c.length]
}

function check(c) {
	for (let i=1; i<c.length; i+=2) {
		let seg = c
		let pp = c[i-1]
		let np = next(c, i)
		if (seg instanceof SegC) {
			let [,x1,y1,x2,y2] = cmd
			let o1 = orientation(pp,[x1,y1],np)
			let o2 = orientation(pp,[x2,y2],np)
			if (o1==0 && o2==0)
				console.warn('degenerate cubic bezier')
		}
		if (seg instanceof SegQ) {
			let [,x1,y1] = cmd
			let o1 = orientation(pp,[x1,y1],np)
			if (o1==0)
				console.warn('degenerate quadratic bezier')
		}
		if (pp.x==np.x && pp.y==np.y) {
			console.warn('consecutive coincident points around '+seg)
		} else if (seg instanceof SegL && next(c, i+1) instanceof SegL) {
			let np2 = next(c, i+2)
			let o1 = orientation(pp,np,np2)
			if (o1==0)
				console.warn('consecutive collinear line segments')
		}
		
		if (half_arc_at(c, i-1))
			;
	}
}

function get(c, i) {
	let l = c.length
	return c[(i % l + l) % l]
}

function dist(p1, p2) {
	return Math.hypot(p2.x-p1.x, p2.y-p1.y)
}

function half_arc_at(c, i) {
	let p0 = get(c, i-2)
	let p1 = get(c, i)
	let p2 = get(c, i+2)
	let d1 = [p0.x-p1.x,p0.y-p1.y]
	let d2 = [p2.x-p1.x,p2.y-p1.y]
	// eg: d1 is [68,235], d2 is [235,-70] or [-235,70]
	// ideal distance 2's
	let id2a = [d1.y,-d1.x]
	let id2b = [-d1.y,d1.x]
	//console.log(p0,p1,p2,d1, d2,'|',id2a,id2b)
	let ea = dist(id2a,d2)
	if (ea < 10000) {
		console.warn('half arc?', ea, dist(p0, p2))
	} else {
		let eb = dist(id2a,d2)
		if (eb < 10000) {
			console.warn('half arc?', eb, dist(p0, p2))
		}
	}
}

function unparse_rel(contours) {
	let out = ""
	for (let c of contours) {
		//console.warn('m', c.length)
		let prev = c[0]
		out += "M "+prev.fmt()+" "
		for (let i=1; i<c.length; i+=2) {
			let seg = c[i]
			//let [cmd, ...args] = c[i]
			/*if (cmd=='L' && i==c.length-1) {
				out += "Z"
				break
				}*/
			let short
			if (seg instanceof SegC) {
				
				let pp = c[i-1]
				let pc = c[i-2]
				let dx = seg.c1.x-pp.x
				let dy = seg.c1.y-pp.y
				
				if (pc instanceof SegC) {
					let ex = pp.x - dx - pc.c2.x
					let ey = pp.y - dy - pc.c2.y
					// todo: we should average the err between the prev and nex controlpoints
					console.warn('S try', ex, ey)
					if (ex*ex + ey*ey <= 100*100 *0) {
						//if (pp[0]-dx == pc[3] && pp[1]-dy == pc[4]) {
						short = true
					}
				} else {
					if (dx==0 && dy==0) {
						short = true
					}
				}
			} else if (seg instanceof SegQ) {
				let pp = c[i-1]
				let pc = c[i-2]
				let dx = seg.c.x-pp.x
				let dy = seg.c.y-pp.y
				
				if (pc instanceof SegQ) {
					let ex = pp.x - dx - pc.c.x
					let ey = pp.y - dy - pc.c.y
					// todo: we should average the err between the prev and nex controlpoints
					if (ex*ex + ey*ey <= 100000*100000*0) {
						//if (pp[0]-dx == pc[3] && pp[1]-dy == pc[4]) {
						short = true
					}
				} else {
					if (dx==0 && dy==0) {
						short = true
					}
				}
			}
			let pos = get(c, i+1)
			if (seg instanceof SegL) {
				if (pos.x==prev.x)
					out += "v " + fmt(pos.y-prev.y) + " "
				else if (pos.y==prev.y)
					out += "h " + fmt(pos.x-prev.x) + " "
				else {
					out += "l " + pos.fmt(prev) + " "
				}
			} else {
				if (seg instanceof SegA) {
					out += "a " + seg.radius.fmt() + " " + fmt(seg.angle) + " " + (seg.large ? "1" : "0") + (seg.sweep ? "1" : "0") + " "
				} else if (seg instanceof SegC) {
					if (short)
						out += "s " + seg.c2.fmt(prev) + " "
					else
						out += "c " + seg.c1.fmt(prev) + " " + seg.c2.fmt(prev) + " "
				} else if (seg instanceof SegQ) {
					if (short)
						out += "t "
					else
						out += "q " + seg.c.fmt(prev) + " "
				}
				out += pos.fmt(prev) + " "
			}
			prev = pos
		}
		out += "Z"
	}
	return out
}

function unparse(contours) {
	let out = ""
	for (let c of contours) {
		out += "M "+c[0]+" "
		for (let i=1; i<c.length; i+=2) {
			let [cmd, ...args] = c[i]
			if (cmd=='L' && i==c.length-1) {
				out += "Z"
				break
			}
			let pos = get(c, i+1)
			out += cmd + " "
			out += args + " "
			out += pos + " "
		}
	}
	return out
}

function orientation(a, b, c) {
	return (a.x*b.y + b.x*c.y + c.x*a.y) - (a.y*b.x + b.y*c.x + c.y*a.x)
}

// nnhh this is supposed to make it so that we don't interrupt smooth (missing out on the chance for a 's' command but nnh..
function pick_good_start(c) {
	//console.warn('spin?', c)
	if (!c.some(seg=>seg instanceof SegL))
		return
	while (!(c[1] instanceof SegL)) {
		//console.warn('spin!')
		c.push(c.shift())
		c.push(c.shift())
	}
}

function find_top(seg) {
	let best
	for (let i=0; i<seg.length; i+=2) {
		if (!best || seg[i].y > seg[best].y)
			best = i
	}
	let a = get(seg, best-2)
	let b = get(seg, best)
	let c = get(seg, best+2)
	let o = orientation(a,b,c)
	console.warn('top orientation', o)
	return o
}

function or(seg) {
	let sl = seg.length-1
	for (let i=0; i<sl; i+=2) {
		let a = get(seg, i)
		let b = get(seg, i+2)
		let c = get(seg, i+4)
		let o = orientation(a,b,c)
		//console.warn(o)
	}
}

let xml = process.argv[2]

/*let cc= parse(xml)
for (let c of cc) {
	if (find_top(c) < 0) {
		console.warn('counter-clockwise')
		//rev1(c)
	} else
		console.warn('clockwise')
}
console.log(unparse_rel(cc))*/

xml = xml.replace(/<path +([^>]*? )?d="([^">]*)" ?([^>]*)>/g, (m,b="",d,a)=>{
	let cc = parse(d)
	//let s = unparse(cc)
	//console.warn(cc)
	
	let out = ""
	console.warn('hey?')
	
	//rev1(cc[0])
	for (let c of cc) {
		
		//pick_good_start(c)
		if (find_top(c) < 0)
			rev1(c)
		or(c)
		//check(c)
		out += '<path '+b+"d=\""+unparse_rel([c]) + "\" " + a + ">"
		//out += to_rrect(c)+" "+a+">"
	}
	return out//out+" "+a
})
process.stdout.write(xml+"\n")//*/
//let s = unparse_rel(cc)
//console.log(s)
// todo: check if console.log is slowing down startup
//
//M20.896,18.375 c0.318,1.396,2.009,4.729 2.009,4.729 c0,0,-1.639,1.477 -2.987,1.437 l-1.955,-2.841 l-1.735,2.446 c0,0,-1.713,-1.274 -2.931,-1.485 c0,0,1.666,-3.182 2.023,-3.856 c0.357,-0.674,1.057,-1.547 1.057,-1.547 c0,0,4.271,0.028 4.519,1.117 Z

//M100 100 L 200 200 500 500 500 500 L 600 50 z - warnings
/*
test s command generation:
M12.45 21.329s-2.459 4.086-1.78 5.652c.409.945 1.123 2.064 2.389 2.271.423.069.623.898.501 1.505-.139.686-.621 1.646-.886 2.132-.265.487-.777.481-1.411 1.041-.442.39-.597 1.075.153 1.082l3.545.029c.664.006 1.093-.398 1.24-1.067.204-.928.76-4.461.551-5.146-.15-.491-.667-.886-.995-1.835-.243-.703.343-1.803.343-1.803l-3.65-3.861zm-5.748-5.571s.824-.146 1.272-.061c.448.086 1.705 1.019 2.085 1.16.38.141 1.299-.075 1.299-.075s1.065 1.436.995 1.581c-.07.145-1.617.47-1.981.579-.363.109-1.755-2.081-2.146-2.327s-.98.359-1.373.341c-.392-.018-.282-.298-.005-.374 0 0-.467.157-.483-.019-.016-.176.388-.281.388-.281s-.409.146-.475-.026c-.064-.172.063-.38.424-.498z **/
