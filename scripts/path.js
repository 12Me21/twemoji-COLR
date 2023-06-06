// todo: does SVG allow doing e.g. "M 10 10 m 2,-2" as equivalent to M 12,8 ?  (i know it /works/ but like.. )

// idea: some kind of base "Geometry" class that Point and Seg and Contour inherit from, (or perhaps just an 'interface', to define like, .transform() and .interpolate etc.)

// also we can store arbitrary shapes as contours by storing them as segment types (and then the previous point determines the location

let print = console.warn
print() 

Number.prototype.fmt = function() { return fmt(this) }

function fmt(num) {
	//return String(num/1e5)//.replace(/^[^-]/,'+$&')).join("")
	return String(+(num/1e5).toFixed(5))
}
function pnum(ns) {
	let n = Number(ns+"e5")
	if (n != (n|0)) {//if (isNaN(n))
		// this weird special case is because, for some reason the older svgs use 10e-4 instead of 0.001 sometimes (and no other e notation values)
		if (ns=='10e-4') return pnum('0.001')
		if (ns=='-10e-4') return pnum('-0.001')
		throw new Error('invalid number: '+ns)
	}
	return n
}
function F([str0, ...strs], ...values) {
	return values.reduce((a,x,i)=>{
		if ('number'==typeof x)
			x = fmt(x)
		else
			x = String(x)
		return a + x + strs[i]
	}, str0)
}

let dr// = 100
function round(x, n=dr) {
	if (!n)
		return Math.round(x) // nhhh
	return Math.round(x/n)*n
}

/*function DEG_SIN(deg) {
	let sign = Math.sign(deg)
	if (sign==-1)
		deg = -deg
	if (deg>90)
	if (deg==45)
		return Math.SQRT1_2 * sign
	if (deg==90)
		return 1 * sign
	if (deg==30)
		return 0.5 * sign
	if (deg==60)
		return Math.sqrt(0.75) * sign
	
	// (0,45)
	if (deg<45)
		return Math.sin(Math.PI*2*deg/360) * sign
	// (45,90)
	if (deg<90)
		return Math.cos(Math.PI*2*(90-deg)/360) * sign
	// (90,135)
	return Math.cos(Math.PI*2*(deg-90)/360) * sign
}*/

class Matrix {
	static Scale(xx, yy=xx) {
		return {__proto__:Matrix.prototype, xx, yy}
	}
	static Translate(x, y=x) {
		return {__proto__:Matrix.prototype, x, y}
	}
	static Rotate(a) {
		let a0 = a
		let flipsin, flipcos
		if (a < 0)
			a = -a, flipsin = true
		a = a % 360
		if (a >= 180)
			a -= 180, flipsin = flipcos = true
		
		let cos, sin
		if (a==45) {
			cos = sin = Math.SQRT1_2
		} else if (a==90) {
			sin = 1
			cos = 0
		} else if (a==135) {
			cos = sin = Math.SQRT1_2
			flipcos = !flipcos
		} else if (a==120) {
			cos = 0.5
			sin = Math.sqrt(0.75)
			flipcos = !flipcos
		} else if (a==150) {
			cos = Math.sqrt(0.75)
			sin = 0.5
			flipcos = !flipcos
		} else if (a==0) {
			sin = 0
			cos = 1
		} else if (a==30) {
			cos = Math.sqrt(0.75)
			sin = 0.5
		} else if (a==60) {
			cos = 0.5
			sin = Math.sqrt(0.75)
		} else {
			let r = Math.PI*2*a/360
			cos = Math.cos(r)
			sin = Math.sin(r)
		}
		if (flipcos)
			cos = -cos
		return {
			__proto__:Matrix.prototype,
			xx: cos,	yy: cos,
			yx: flipsin ? sin : -sin, xy: flipsin ? -sin : sin,
			angle: a0,
		}
	}
}
Matrix.prototype.xx = 1
Matrix.prototype.yy = 1
Matrix.prototype.xy = 0
Matrix.prototype.yx = 0
Matrix.prototype.x = 0
Matrix.prototype.y = 0
Matrix.prototype.angle = null

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
	[Symbol.toPrimitive](type) {
		return fmt(this.x)+","+fmt(this.y)
	}
	Add(p) {
		return new Point(this.x+p.x, this.y+p.y)
	}
	add(p) {
		this.x += p.x
		this.y += p.y
	}
	Divide(s) {
		return new Point(this.x/s, this.y/s)
	}
	Middle(p) {
		return new Point((this.x+p.x)/2, (this.y+p.y)/2)
	}
	Subtract(p) {
		return new Point(this.x-p.x, this.y-p.y)
	}
	Copy() {
		return new Point(this.x, this.y)
	}
	Multiply1(s) {
		return new Point(this.x*s, this.y*s)
	}
	static Parse(x, y, pos) {
		return new this(pos.x+pnum(x), pos.y+pnum(y))
	}
	transform(matrix) {
		let x = this.x
		this.x = matrix.xx*x + matrix.yx*this.y + matrix.x
		this.y = matrix.yy*this.y + matrix.xy*x + matrix.y
	}
	round(n) {
		this.x = round(this.x, n)
		this.y = round(this.y, n)
	}
	equal(p) {
		return this.x==p.x && this.y==p.y
	}
	hypot() {
		return Math.hypot(this.x, this.y)
	}
	atan() {
		return Math.atan2(this.y, this.x)*(180/Math.PI)
	}
	dist(p) {
		return Math.hypot(p.x-this.x, p.y-this.y)
	}
}

// todo: contour class, has flag for if it's a hole

class Seg {
	reverse() {
	}
}

class SegL extends Seg {
	transform(matrix) {
	}
	round() {
	}
	Middle() {
		return new SegL()
	}
}
SegL.prototype.letter = "l"

// special, for contours ended by Z with a gap
class SegZ extends SegL {
}

class SegGap extends Seg {
	transform(matrix) {
	}
	round() {
	}
	Middle() {
		return new SegGap()
	}
}

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
	static Parse(pos, args) {
		return new this(
			Point.Parse(args[1], args[2], pos),
			Point.Parse(args[3], args[4], pos),
		)
	}
	static ParseShorthand(pos, args, contour) {
		let ppos = contour[contour.length-1]
		let pseg = contour[contour.length-2]
		let c1
		if (pseg instanceof SegC)
			c1 = ppos.Subtract(pseg.c2).Add(ppos)
		else
			c1 = ppos.Copy()
		let c2 = Point.Parse(args[1], args[2], pos)
		return new this(c1, c2)
	}
	transform(matrix) {
		this.c1.transform(matrix)
		this.c2.transform(matrix)
	}
	round() {
		this.c1.round()
		this.c2.round()
	}
	Middle(seg) {
		return new SegC(this.c1.Middle(seg.c1), this.c2.Middle(seg.c2))
	}
}
SegC.prototype.letter = "c"

class SegQ extends Seg {
	constructor(c) {
		super()
		this.c = c
	}
	static Parse(pos, args) {
		let c = Point.Parse(args[1], args[2], pos)
		return new this(c)
	}
	static ParseShorthand(pos, args, contour) {
		let ppos = contour[contour.length-1]
		let pseg = contour[contour.length-2]
		let c
		if (pseg instanceof SegQ)
			c = ppos.Subtract(pseg.c).Add(ppos)
		else
			c = ppos.Copy()
		return new this(c)
	}
	transform(matrix) {
		this.c.transform(matrix)
	}
	round() {
		this.c.round()
	}
}
SegQ.prototype.letter = "q"

class SegA extends Seg {
	constructor(radius,angle=0,large=false,sweep=true) {
		super()
		this.radius = radius
		this.angle = angle
		this.large = large
		this.sweep = sweep
	}
	reverse() {
		this.sweep = !this.sweep
	}
	round() {
		this.angle = round(this.angle)
		this.radius.round()
	}
	// todo: transform??
	transform(matrix) {
		// HACK
		
		if (matrix.angle!=null) {
			this.angle += pnum(String(matrix.angle)) // hhh?
			return
		}
		let {xx,yy} = matrix
		let {x,y} = this.radius
		let flip
		if (matrix.xy || matrix.yx) {
			if (xx || yy)
				throw new Error('cant skew arc')
			//simple flips
			0,[xx,yy] = [matrix.yx,matrix.xy]
			0,[x,y] = [y,x]
			flip = true
		}
		if (xx!=1 || yy!=1 || flip) {
			if (this.angle==0 || x==y) {
				this.radius.x = x * xx
				this.radius.y = y * yy
			} else {
				throw new Error('cant scale arc')
			}
		}
		if (flip) {
			this.sweep = !this.sweep
			this.radius.x *= -1
			this.radius.y *= -1
		}
	}
}
SegA.prototype.letter = "a"

class Contour extends Array {
	constructor(x) {
		if (x)
			super(...x) // careful..
		else
			super()
	}
	static [Symbol.species] = function (...heck) { return new Contour(heck) }
	get(i) {
		let len = this.length
		return this[(i % len + len) % len]
	}
}

let rx_num = /[\s,]*([-+]?\d*(?:[.]\d+(?!\d)|\d(?![\d.]))(?:[Ee][-+]?\d+(?!\d))?)/

let rx_x = new RegExp(rx_num.source+"(){0}", 'y')
let rx_y = new RegExp("(){0}"+rx_num.source, 'y')
let rx_num2 = new RegExp(rx_num.source.repeat(2), 'y')
let rx_num4 = new RegExp(rx_num.source.repeat(4), 'y')
let rx_num6 = new RegExp(rx_num.source.repeat(6), 'y')
let rx_arc = new RegExp(rx_num.source.repeat(3)+/[\s,]*([01])[\s,]*([01])/.source+rx_num.source.repeat(2), 'y')
let rx_cmd = new RegExp(/\s*[MmLlHhVvCcSsQqTtAaZz]/,'y')

let argtypes = {
	M: rx_num2, L: rx_num2,	H: rx_x, V: rx_y, 
	C: rx_num6, S: rx_num4, Q: rx_num4, T: rx_num2, A: rx_arc,
}

function parse(str, nogap) {
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
	
	let pos = new Point(0, 0) // current pen pos
	let start = new Point(0, 0) // contour start
	
	function autoclose(z) {
		z ||= nogap
		if (contour) {
			if (pos.x==start.x && pos.y==start.y) {
				if (z && contour.length)
					contour.pop()
				else {
					print('❎ unclosed path')
					contour.push(new SegGap())
				}
			} else {
				//if (dist(pos,start) < 0.01e5)
				
				if (z) {
					print('path end misalign?', start.Subtract(pos).fmt())
					contour.push(new SegZ())
				} else {
					print('❎ unclosed path')
					contour.push(new SegGap())
				}
			}
			//contour.push(['M']) // gap (unclosed contour)
			if (!contour.length)
				print('null contour in:', str)
			else
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
			autoclose(true)
			pos = start.Copy()
			continue
		}
		let rx_arg = argtypes[cmd]
		
		let args = eat(rx_arg)
		if (!args)
			throw new Error('not enough args'+str.slice(i-1, i+20))
		do {
			if (!rel) {
				if (cmd!='V')
					pos.x = 0
				if (cmd!='H')
					pos.y = 0
			}
			let next = pos.Add({
				x: pnum(args[args.length-2]??'0'),
				y: pnum(args[args.length-1]??'0'),
			})
			
			if (cmd=='M') {
				autoclose(false)
				contour = new Contour()
				start = next.Copy()
				cmd="L"
			} else {
				if (cmd=='H'||cmd=='V'||cmd=='L')
					contour.push(new SegL())
				else if (cmd=='A')
					contour.push(new SegA(
						new Point(pnum(args[1]), pnum(args[2])),
						pnum(args[3]),
						args[4]!=0, args[5]!=0,
					))
				else if (cmd=='C')
					contour.push(SegC.Parse(pos, args))
				else if (cmd=='Q')
					contour.push(SegQ.Parse(pos, args))
				else if (cmd=='S')
					contour.push(SegC.ParseShorthand(pos, args, contour))
				else if (cmd=='T')
					contour.push(SegQ.ParseShorthand(pos, args, contour))
			}			
			pos = next.Copy()
			contour.push(pos.Copy())
		} while (args = eat(rx_arg))
	}
	autoclose(false)
	return contours
}

function rev1(c) {
	print(" ! reversing")
	c.reverse()
	c.unshift(c.pop())
	for (let i=1; i<c.length; i+=2)
		c[i].reverse()
	return rev1
}

function to_rrect(c) {
	let corners = {}
	
	if (c.length==8 && c.every((x,i)=>i%2==0 || x instanceof SegL)) {
		for (let s=0; s<c.length; s+=2) {
			let p1 = c.get(s-2)
			let p2 = c.get(s+2)
			let d = new Point(p2.x-p1.x, p2.y-p1.y)
			let nw
			if (d.x < 0) {
				if (d.y < 0)
					nw = corners.bottomleft = new Point(p2.x,p1.y)
				else
					nw = corners.bottomright = new Point(p1.x,p2.y)
			} else {
				if (d.y < 0)
					nw = corners.topleft = new Point(p1.x,p2.y)
				else
					nw = corners.topright = new Point(p2.x,p1.y)
			}
			if (!nw.equal(c[s]))
				throw new Error('misplaced corner in normal rect')
		}
		if (Object.keys(corners).length!=4)
			throw new Error('couldnt find all corners?')
		let elem = new Element('rect')
		let x = corners.topleft.x
		let y = corners.topleft.y
		let w = corners.bottomright.x - x
		let h = corners.bottomright.y - y
		elem.attrs.width = fmt(w)
		elem.attrs.height = fmt(h)
		elem.attrs.x = fmt(x)
		elem.attrs.y = fmt(y)
		return elem
	}
	
	let s
	
	let rads = []
	for (s=1; s<c.length; s+=2) {
		if (c[s] instanceof SegA) {
			let p1 = c.get(s-1)
			let p2 = c.get(s+1)
			let d = new Point(p2.x-p1.x, p2.y-p1.y)
			let r = c[s].radius
			if (Math.abs(Math.abs(d.x)-r.x) <= 0.001e5 && Math.abs(Math.abs(d.y)-r.y) <= 0.001e5) {
			// found corner
				rads.push(new Point(Math.abs(d.x),Math.abs(d.y)))
				//console.warn("corner", d)
				if (d.x < 0) {
					if (d.y < 0)
						corners.bottomleft = new Point(p2.x,p1.y)
					else
						corners.bottomright = new Point(p1.x,p2.y)
				} else {
					if (d.y < 0)
						corners.topleft = new Point(p1.x,p2.y)
					else
						corners.topright = new Point(p2.x,p1.y)
				}
			}
		} else if (c[s] instanceof SegL) {
		} else {
			throw new Error('not rrect, contained segment other than A/L')
		}
	}
	//print("corners", corners, rads)
	let rx = 0, ry=0
	for (let r of rads) {
		rx += r.x
		ry += r.y
	}
	rx /= rads.length
	ry /= rads.length
	let rr = new Point(rx,ry)
	for (let r of rads) {
		if (dist(rr, r) >= 400)
			throw new Error('bad corners')
	}
	let x = corners.topleft.x
	let y = corners.topleft.y
	let w = corners.bottomright.x - x
	let h = corners.bottomright.y - y
	//console.warn("corners", corners, rads)
	if (corners.topleft.x != corners.bottomleft.x || corners.topright.x != corners.bottomright.x || corners.topleft.y != corners.topright.y || corners.bottomleft.y != corners.bottomright.y) {
		throw new Error('not rectangle')
	}
	/*if (1) {
		let x2 = corners.bottomright.x
		let y2 = corners.bottomright.y
		let cx = (x+x2)/2
		let cy = (y+y2)/2
		let fx = round(x,0.125e5)
		let fy = round(y,0.125e5)
		let fx2 = round(x2,0.125e5)
		let fy2 = round(y2,0.125e5)
		let fx1 = round(cx,0.125e5)
		let fy1 = round(cy,0.125e5)
		
		let r = (rx+ry)/2
		
		if (Math.abs(fx1-cx)<0.003e5) {
			print('snapped cx ', fx1)
			cx = fx1
			x = cx-r
			x2 = cx+r
		}
		else if (Math.abs(fx-x)<0.003e5) {
			print('snapped left ', fx)
			x = fx
			x2 = x + r*2
		}
		else if (Math.abs(fx2-x2)<0.003e5) {
			print('snapped right ', fx2)
			x2 = fx2
			x = x2 - r*2
		}
		if (Math.abs(fy1-cy)<0.003e5) {
			print('snapped cy ', fy1)
			cy = fy1
			y = cy-r
			y2 = cy+r
		}
		else if (Math.abs(fy-y)<0.003e5) {
			print('snapped top ', fy)
			y = fy
			y2 = y + r*2
		}
		else if (Math.abs(fy2-y2)<0.003e5) {
			print('snapped bottom ', fy2)
			y2 = fy2
			y = y2 - r*2
		}
		return F`<circle r="${r}" cx="${(x+x2)/2}" cy="${(y+y2)/2}"`
		}*/
	let elem
	if (rx*2 == w && ry*2 == h) {
		if (w==h)
			elem = new Element('circle'), elem.attrs.r = fmt((w+h)/4)
		else
			elem = new Element('ellipse'), elem.attrs.rx = fmt(w/2), elem.attrs.ry = fmt(h/2)
		elem.attrs.cx = fmt(x+w/2)
		elem.attrs.cy = fmt(y+h/2)
		return elem
	} else {
		elem = new Element('rect')
		elem.attrs.width = fmt(w)
		elem.attrs.height = fmt(h)
		if (rx==ry)
			elem.attrs.rx = fmt((rx+ry)/2)
		else
			elem.attrs.rx = fmt(rx), elem.attrs.ry = fmt(ry)
		elem.attrs.x = fmt(x)
		elem.attrs.y = fmt(y)
	}
	return elem
}

function solve_rrect_stroke(c) {
	for (let i=1; i<c.length; i+=2) {
		let seg = c.get(i)
		if (seg instanceof SegL) {
			let i2 = i+3*2
			let seg2 = c.get(i2)
			if (!(seg2 instanceof SegL)) // try +4 in case we have an extra
				seg2 = c.get(i2 += 2)
			if (seg2 instanceof SegL) {
				console.warn('line',c.get(i-1),c.get(i-1))
				let a = c.get(i-1)
				let b = c.get(i2+1)
				let e1 = a.Middle(b)
				let d1 = dist(a,b)
				a = c.get(i+1)
				b = c.get(i2-1)
				let e2 = a.Middle(b)
				let d2 = dist(a,b)
				return [e1, e2, d1,d2]
			}
		}
	}
	return null
}

function check(c) {
	for (let i=1; i<c.length; i+=2) {
		let seg = c
		let pp = c[i-1]
		let np = c.get(i+1)
		if (seg instanceof SegC) {
			let o1 = orientation(pp,seg.c1,np)
			let o2 = orientation(pp,seg.c2,np)
			if (o1==0 && o2==0)
				console.warn('degenerate cubic bezier')
		}
		if (seg instanceof SegQ) {
			let o1 = orientation(pp,seg.c,np)
			if (o1==0)
				console.warn('degenerate quadratic bezier')
		}
		if (pp.x==np.x && pp.y==np.y) {
			console.warn('consecutive coincident points around '+seg)
		} else if (seg instanceof SegL && c.get(i+2) instanceof SegL) {
			let np2 = c.get(i+3)
			let o1 = orientation(pp,np,np2)
			if (o1==0)
				console.warn('consecutive collinear line segments')
		}
		
		if (half_arc_at(c, i-1)) {
			if (i==1) {
				rotate(c, 2)
				i += 2
			}
			;
			let diameter = dist(c.get(i-3), np)
			c.splice(i-2, 3, new SegA(new Point(diameter/2, diameter/2), 0, 0, 1))
			i -= 2
		}
	}
}

function dist(p1, p2) {
	return Math.hypot(p2.x-p1.x, p2.y-p1.y)
}

function half_arc_at(c, i) {
	let seg0 = c.get(i-1)
	let seg1 = c.get(i+1)
	
	if (!(seg0 instanceof SegC && seg1 instanceof SegC))
		return
	
	let p0 = c.get(i-2)
	let p1 = c.get(i)
	let p2 = c.get(i+2)
	let d1 = new Point(p0.x-p1.x,p0.y-p1.y)
	let d2 = new Point(p2.x-p1.x,p2.y-p1.y)
	// eg: d1 is [68,235], d2 is [235,-70] or [-235,70]
	// ideal distance 2's
	let id2a = new Point(d1.y,-d1.x)
	let id2b = new Point(-d1.y,d1.x)
	//console.warn(p0,p1,p2,d1, d2,'|',id2a,id2b)
	let ea = dist(id2a,d2)
	if (ea < 10000) {
		console.warn('half arc?', i, ea, dist(p0, p2))
		return true
	} else {
		let eb = dist(id2a,d2)
		if (eb < 10000) {
			console.warn('half arc?', i, eb, dist(p0, p2))
			return true
		}
	}
}

function transform(c, matrix) {
	print(' ! transform', matrix)
	// todo: what if matrix was just stored like [scale, skew, translate]. i.e. {xx,yy}, {yx,xy}, {wx,wy}. as 3 Points
	for (let x of c) {
		x.transform(matrix)
	}
}

function round_contour(c, matrix) {
	for (let x of c)
		x.round()
}

function rotate_to_gap(c) {
	let gap = c.findIndex(x=>x instanceof SegGap)
	if (gap==c.length-1)
		return false
	if (gap>=0) {
		rotate(c, -(gap+1))
		print("ROTATED BY",-(gap+1),"DUE TO GAP")
		return true
	}
}

function unparse_rel(contours) {
	let out = ""
	outer: for (let c of contours) {
		rotate_to_gap(c)
		
		//console.warn('m', c.length)
		let prev = c[0]
		if (out)
			out += " "
		out += "M "+prev
		for (let i=1; i<c.length; i+=2) {
			let seg = c[i]
			let short
			if (seg instanceof SegC) {
				let pp = c.get(i-1)
				let pc = c[i-2] // do NOT use get()here, we need this to NOT wrap around
				let d = seg.c1.Subtract(pp)
				
				if (pc instanceof SegC) {
					let e = pp.Subtract(d).Subtract(pc.c2)
					// todo: we should average the err between the prev and nex controlpoints
					//console.warn("S try. current point:", pp, "prev command:", pc, "command:", seg)
					
					if (e.hypot() <= 0.001e5*10) {
						console.warn('S try', String(e))
						//balance_cubic(c, i)
					}
					if (e.hypot() <= 0.01e5 * 0) {
						//console.warn('s ok')
						//print('S try', ex,ey)
						short = true
					}
				} else {
					if (d.x==0 && d.y==0)
						short = true
				}
			} else if (seg instanceof SegQ) {
				let pp = c.get(i-1)
				let pc = c[i-2]
				let d = seg.c.Subtract(pp)
				
				if (pc instanceof SegQ) {
					let e = pp.Subtract(d).Subtract(pc.c)
					// todo: we should average the err between the prev and nex controlpoints
					if (e.hypot() <= 100000*0)
						short = true
				} else {
					if (d.x==0 && d.y==0)
						short = true
				}
			}
			let pos = c.get(i+1)
			if (seg instanceof SegGap) {
				if (i==c.length-1)
					continue outer
				print(c)
				throw new Error('gap in middle of contour')
			} else if (seg instanceof SegL) {
				if (prev && pos.x==prev.x)
					out += F` v${pos.y-prev.y}`
				else if (prev && pos.y==prev.y)
					out += F` h${pos.x-prev.x}`
				else {
					out += F` l ${pos.fmt(prev)}`
				}
			} else {
				if (seg instanceof SegA) {
					out += F` a ${seg.radius} ${seg.angle} ${seg.large?"1":"0"}${seg.sweep?"1":"0"}`
				} else if (seg instanceof SegC) {
					if (short)
						out += ` s ${seg.c2.fmt(prev)}`
					else
						out += ` c ${seg.c1.fmt(prev)} ${seg.c2.fmt(prev)}`
				} else if (seg instanceof SegQ) {
					if (short)
						out += " t"
					else
						out += ` q ${seg.c.fmt(prev)}`
				}
				out += " " + pos.fmt(prev)
			}
			prev = pos
		}
		out += " Z"
	}
	return out
}

function unparse_abs(contours) {
	let out = ""
	outer: for (let c of contours) {
		rotate_to_gap(c)
		
		//console.warn('m', c.length)
		let prev = c[0]
		out += " M\n"+prev.fmt()
		for (let i=1; i<c.length; i+=2) {
			let seg = c[i]
			//let [cmd, ...args] = c[i]
			/*if (cmd=='L' && i==c.length-1) {
				out += "Z"
				break
				}*/
			if (seg instanceof SegC)
				out += "\n C "+seg.c1.fmt()+" "+seg.c2.fmt()
			else if (seg instanceof SegQ)
				out += "\n Q "+seg.c.fmt()
			else if (seg instanceof SegL)
				out += "\n L"
			else if (seg instanceof SegA)
				out += "\n A " + seg.radius.fmt() + " " + fmt(seg.angle) + " " + (seg.large ? "1" : "0") + (seg.sweep ? "1" : "0")
			else if (seg instanceof SegGap) {
				if (i==c.length-1) {
					out += "\n"
					continue outer
				}
				print(c)
				throw new Error('gap in middle of contour')
			} else {
				console.error(seg)
				throw new Error('what the heck is this segment? '+String(seg))
			}
			let pos = c.get(i+1)
			out += "\n"+pos.fmt()
			prev = pos
		}
		out += "\n Z"
	}
	return out
}

function orientation(a, b, c) {
	return ((b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x))/1e5
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

function extrema(con, axis, sign) {
	let best=null, by
	for (let i=0; i<con.length; i+=2) {
		let y = con[i][axis]*sign
		if (best==null || y > by)
			best = i, by = y
	}
	return best
}

function contour_orientation(con) {
	let top = extrema(con, "y", -1)
	
	let a = con.get(top-2)
	let b = con.get(top)
	let c = con.get(top+2)
	
	if (a==c) {
		console.warn("bad angle!")
		let seg0 = con.get(top-1)
		let seg1 = con.get(top+1)
		if (seg0 instanceof SegC) {
			if (!seg0.c2.equal(b))
				a = seg0.c2
			else if (!seg0.c1.equal(b))
				a = seg0.c1
		}
		if (seg1 instanceof SegC) {
			if (!seg0.c1.equal(b))
				c = seg0.c1
			else if (!seg0.c2.equal(b))
				c = seg0.c2
		}
	}
	let o = orientation(a,b,c)
	if (o==0) {
		console.warn('bad angle! one last try..')
		o = orientation(a,b,con.get(top+4))
	}
	return o
}

function or(seg) {
	let sl = seg.length-1
	for (let i=0; i<sl; i+=2) {
		let a = seg.get(i)
		let b = seg.get(i+2)
		let c = seg.get(i+4)
		let o = orientation(a,b,c)
		//console.warn(o)
	}
}

function toHex() {
	
}

/*function balance_cubic(c, i) {
	let s1 = c.get(i-1)
	let s2 = c.get(i+1)
	let p = c.get(i)
	let center = new Point(0, 0)
	console.log(s1,s2,p)
	center.add(s1.c2)
	center.add(p)
	center.add(s2.c1)
	center = center.Divide(3)
	center.round(0.001e5)
	
	let vec1 = center.Subtract(s1.c2)
	let vec2 = s2.c1.Subtract(center)
	vec1.add(vec2)
	let vec = vec1.Divide(2)
	vec.round(0.001e5)
	c[i] = center
	s1.c2 = center.Subtract(vec)
	s2.c1 = center.Add(vec)
}*/

function rotate(list, amount) {
	amount %= list.length
	amount += list.length
	amount %= list.length
	let s=0, i=0
	for (let n=0; n<list.length; n++) {
		i+=amount
		i%=list.length
		if (i==s)
			i = ++s
		else
			0,[list[s],list[i]] = [list[i],list[s]]
	}
}

// idea: store contour as linked list? each point links to a prev/next point as well as a prev/next segment ? nnhh

function findscale(c1, c2) {
	let scales = []
	function compare(p1, p2) {
		let x2 = (p2.x)
		let x1 = (p1.x)
		let y2 = (p2.y)
		let y1 = (p1.y)
		let size = Math.hypot(x1,x2)
		//if (size > 1000000)
		print(x2/x1,y2/y1)
		scales.push([size, new Point(x2/x1,y2/y1)])
	}
	for (let i=0; i<c1.length; i++) {
		let u1 = c1[i]
		let u2 = c2[i]
		
		if (u1 instanceof Point)
			compare(u1, u2)
		if (u1.c instanceof Point)
			compare(u1.c, u2.c)
		if (u1.c1 instanceof Point)
			compare(u1.c1, u2.c1)
		if (u1.c2 instanceof Point)
			compare(u1.c2, u2.c2)
	}
	let ax=0,ay=0,axc=0,ayc=0
	for (let [,p] of scales) {
		if (!isNaN(p.x))
			ax += p.x, axc++
		if (!isNaN(p.y))
			ay += p.y, ayc++
	}
	return [ax/axc, ay/ayc]
}

function rotate_until(c, fn) {
	for (let i=0; i<c.length; i+=2) {
		if (fn(c))
			return true
		rotate(c, 2)
	}
	console.warn("couldn't choose starting point")
}
/* SunriseOverMountains, FaceWithHeadBandage */
function merge_lines(c) {
	for (let i=0;i<c.length;i+=2) {
		if (c.get(i-1) instanceof SegL && c.get(i+1) instanceof SegL) {
			let det = orientation(c.get(i-2), c.get(i), c.get(i+2))
			console.warn('det ', det)
			if (Math.abs(det) < 100000) {
				c.splice(i, 2)
				i-=2
			}
		}
	}
}

function replace_corner_arcs(c) {
	for (let i=1; i<c.length; i++) {
		let seg = c[i]
		if (seg instanceof SegC) {
			let p1 = c.get(i-1)
			let p2 = c.get(i+1)
			let d = p2.Subtract(p1)
			let c1d = seg.c1.Subtract(p1)
			let c2d = seg.c2.Subtract(p2)
			let f1,f2
			if (c1d.x==0 && c2d.y==0) {
				f1 = c1d.y / d.y
				f2 = -c2d.x / d.x
			} else if (c1d.y==0 && c2d.x==0) {
				f1 = c1d.x / d.x
				f2 = -c2d.y / d.y
			} else {
				continue
			}
			let err = Math.hypot(f1-0.5523, f2-0.5523)
			if (err > 0.005)
				continue
			
			let or = orientation(p1, seg.c1.Middle(seg.c2), p2)
			console.warn('corner?', err.toFixed(7), +(or>=0))
			
			
			c[i] = new SegA(new Point(Math.abs(d.x), Math.abs(d.y)), 0, false, or>=0) // todo: correct sweep
		}
	}
}

function short_to_arcs(c, rad) {
	let rr = false
	for (let i=1; i<c.length; i+=2) {
		let seg = c.get(i)
		let short = seg instanceof SegC && dist(c.get(i-1), c.get(i+1)) <= rad*1.5//2.1
		if (short) {
			print('spliced arc', rr, i)
			if (!rr) {
				c[i] = new SegA(new Point(rad, rad), 0, false, true)
				rr = true
			} else {
				c.splice(i-1, 2)
				i-=2
			}
		} else {
			rr = false
		}
	}
	if (c[1] instanceof SegA) {
		if (c.get(-1) instanceof SegA) {
			c.splice(0, 2)
		}
	}
}

/* ellipsefinder */
function see_ellipse(c) {
	let avg = new Point(0,0)
	
	for (let i=0; i<c.length; i+=2) {
		avg = avg.Add(c[i])
	}
	avg = avg.Divide(c.length/2)
	
	let rads = []
	let aang=0
	for (let i=0; i<4; i+=2) {
		let p1 = c[i]
		let p2 = c.get(i+4)
		let d = p2.Subtract(p1)
		let ang = Math.atan2(d.x, d.y)*360/(Math.PI*2)
		if (i>0) {
			ang += 90
		}
		ang += 360
		ang %= 180
		if (ang > 90)
			ang = ang - 180
		
		let diam = Math.hypot(d.x, d.y)
		rads.push(diam/2)
		aang += ang
		//print('angle, diameter', ang, diam)
	}
	aang /= 2
	
	if (aang > 45) {
		rads.reverse()
		aang -= 90
	} else if (aang <= -45) {
		rads.reverse()
		aang += 90
	}
	if (aang)
		print(`<ellipse rx="${fmt(rads[1])}" ry="${fmt(rads[0])}" transform="translate(${avg.fmt()}) rotate(${-aang})"/>`)
	else
		print(`<ellipse rx="${fmt(rads[1])}" ry="${fmt(rads[0])}" transform="translate(${avg.fmt()})"/>`)
}
	//*/




function find_caps(c, radius) {
	let cap_ends = []
	for (let i=0; i<c.length; i+=2) {
		let p1 = c.get(i)
		let j
		for (j=1; j<=3; j++) {
			let i2 = i+j*2
			let p2 = c.get(i2)
			let d = p1.dist(p2)
//			console.log('checking', i, i2, d)
			if (Math.abs(d-radius*2)<0.01e5)
				break
		}
		if (j<=3) {
			cap_ends.push([i,i+j*2])
		}
	}
	return cap_ends
}

//let do_unflip = process.argv[3]=='unflip'
//if (do_unflip)
//	print("UNFLIPPING!")

function ringcopy(c, start, end) {
	let out = new c.constructor()
	end %= c.length
	start %= c.length
	for (let i=start; i!=end; i = (i+1)%c.length)
		out.push(c[i])
	return out
}

class Element {
	childs = []
	attrs = {__proto__:null}
	name = null
	empty = false
	parentNode = null
	constructor(name) {
		this.name = name
	}
	toString() {
		let out = "<"+this.name
		for (let an in this.attrs)
			out += ` ${an}="${this.attrs[an]}"`
		if (this.empty)
			out += "/>"
		else
			out += ">"+this.childs.join("")+"</"+this.name+">"
		return out
	}
	replaceChild(nw, old) {
		let i = this.childs.indexOf(old)
		if (i<0) throw new Error('not child of')
		old.parentNode = null
		this.childs[i] = nw
		if (nw instanceof Element)
			nw.parentNode = this
	}
	removeChild(old) {
		let i = this.childs.indexOf(old)
		if (i<0) throw new Error('not child of')
		old.parentNode = null
		this.childs.splice(i, 1)
	}
	appendChild(child) {
		if (child.parentNode)
			child.parentNode.removeChild(child)
		this.childs.push(child)
		child.parentNode = this
	}
}
class Root extends Element {
	constructor() {
		super("$ROOT")
	}
	toString() {
		return this.childs.join("")
	}
}

/*
let sz = make_star(14.21444e5-1.66666e5, 11.92836e5-2e5, 12)
round_contour(sz)
console.log(unparse_rel([sz]))
//*/

let first = true

let OPT = {__proto__:null}
let [ , , xml, ...args] = process.argv
let commands = []
while (args.length) {
	let cmd = args.shift()
	if (cmd=='rot') {
		let amt = +args.shift()
		commands.push(c=>{rotate(c,amt*2)})
	}
	else if (cmd=='rrect-stroke') {
		commands.push((c,tag)=>{
			let s = solve_rrect_stroke(c)
			if (s) {
				console.warn(s[0].Middle(s[1]).fmt(), s[0].dist(s[1]).fmt())
				let dist = (s[2]+s[3])/2
				let path = new Contour([s[0], new SegL(), s[1], new SegGap()])
				let elem = new Element('path')
				elem.attrs.d = unparse_rel([path])
				console.warn('width: '+dist.fmt())
				/*elem.attrs['stroke-width'] = dist.fmt()
				elem.attrs['stroke-linecap'] = 'round'
				elem.attrs.fill = "none"				
				elem.attrs.stroke = ""*/
				elem.empty = true
				//console.warn(elem.toString())
				tag.parentNode.replaceChild(elem,tag)
			}
		})
	}
	else if (cmd=='unflip') {
		OPT.unflip = true
	}
	else if (cmd=='abs') {
		OPT.abs = true
	}
	else if (cmd=='rev') {
		commands.push(c=>{rev1(c)})
	}
	else if (cmd=='see-ellipse') {
		commands.push(c=>{see_ellipse(c)})
	}
	else if (cmd=='unflip3') {
		OPT.unflip = 3
	} else if (cmd=='unflip2') {
		OPT.unflip = 2
	} else if (cmd=='rrect') {
		commands.push((c,tag)=>{
			replace_corner_arcs(c)
			let elem
			try {
				elem = to_rrect(c)
			} catch(e) {
				return
			}
			elem.empty = true
			if (tag.attrs.fill)
				elem.attrs.fill = tag.attrs.fill
			console.warn(elem.toString())
			tag.parentNode.replaceChild(elem,tag)
		})
	} else if (cmd=='corner-arcs') {
		commands.push(c=>{replace_corner_arcs(c)})
	} else {
		throw new Error('unknown command: '+cmd)
	}
}

let output = x=>process.stdout.write(x)

let defstyle = {
	__proto__:null,
	'fill-opacity':'1',
	'fill-rule':'nonzero',
	'stroke':'none',
}

let root = parse_xml(xml, tag=>{
	if (tag.name!='clipPath' && tag.parentNode?.name!='defs')
		delete tag.attrs.id
	if (tag.attrs.style) {
		let styles = tag.attrs.style.split(";")
		for (let s of styles) {
			if (!s) continue
			let [,p,v] = /^\s*(.*?)\s*:\s*(.*?)\s*$/.exec(s)
			if (defstyle[p]!=v)
				tag.attrs[p] = v
		}
		delete tag.attrs.style
	}
	
	if (OPT.unflip) {
		if (tag.name=='svg') {
			for (let an in tag.attrs)
				delete tag.attrs[an]
			tag.attrs.xmlns="http://www.w3.org/2000/svg"
			tag.attrs.viewBox="0 0 36 36"
		}
		if (tag.name=='metadata') {
			tag.parentNode.removeChild(tag)
			return
		}
	}
	
	let fc = true && !OPT.unflip
	
/*	if (tag.name=='circle') {
		let p = new Point(pnum(tag.attrs.cx), pnum(tag.attrs.cy))
		p.transform({xx:1,yy:1,xy:0,yx:0,x:-0.75e5,y:-36e5})
		p.transform(Matrix.Rotate(45))
		tag.attrs.cx = p.x.fmt()
		tag.attrs.cy = p.y.fmt()
	}*/
	
	if (tag.name=='path') {
		let d = tag.attrs.d
		let cc = parse(d, !fc)
		d = ""
		if (OPT.unflip) {
			let x=0,y=0
			let tfa = OPT.unflip==3 ? tag.attrs : tag.parentNode.attrs
			if (tfa.transform) {
				0,[,x,y] = tfa.transform.match(/^translate[(]\s*([^),\s]*)[,\s]+([^),\s]*)\s*[)]$/)
				x = pnum(x)
				y = pnum(y)
			} else {
				if (OPT.unflip==3) {
					y = 37e5
					x = -1e5
				}
			}
			if (OPT.unflip==3) {
				x+=1e5
				y-=1e5
			}
			if (OPT.unflip==true) {
				x-=1e5
				y-=1e5
			}
			
			if (OPT.unflip!=3)
				y = -y
			
			cc.reverse()
			for (let c of cc) {
				if (OPT.unflip!=3)
					transform(c, {xx:1,yy:-1,xy:0,yx:0,x:0,y:36e5}); 
				if (x||y)
					transform(c, Matrix.Translate(x,y))
				d += unparse_rel([c])
			}
			delete tfa.transform
		} else {
			first = 1
			/*
			let c3 = new Contour()
			let [c1,c2] = cc
			for (let i=0; i<c1.length; i+=2) {
				c3[i] = c1[i].Middle(c2[i])
				c3[i+1] = c1[i+1].Middle(c2[i+1])
			}
			cc.push(c3)//*/
			for (let c of cc) {
				for (let i=0; i<c.length-2; i+=2) {
					if (c[i].equal(c[i+2])) {
						console.warn("🔩 zero length segment: ", c[i+1])
						c.splice(i, 2)
						i-=2
					}
				}
				if (!c.some(x=>x instanceof SegGap)) {
					let orient = contour_orientation(c)
					print('PATH!','len '+c.length+', 🔃 '+orient)
					
					//console.warn(orient, unparse_rel([c]))
					
					if (first ? (orient < 0) : (orient > 0)) {
						print('REVERSING PATH to', (orient < 0) ? 'clockwise' : 'counterclockwise'); rev1(c)
					}
				}
				//transform(c, Matrix.Scale(1, 1/1.1463))
				
				/*//measure angles
				for (let i=0;i<c.length;i+=2) {
					for (let j=0;j<c.length;j+=2) {
						if (i>=j) continue
						let diff = c.get(i).Subtract(c.get(j))
						console.warn(diff.fmt())
						continue
						let a = diff.atan()
						if (a<0)
							a += 360
						a = a % 90
						if (a>45)
							a = 90-a
						console.warn(a)
					}
				}//*/
				//*
				/*
				transform(c, {xx:1,yy:1,xy:0,yx:0,x:-36e5+0.00028e5,y:0e5})
				transform(c, Matrix.Rotate(-45))
				
				for (let i=0;i<c.length;i+=2) {
					let p = c[i]
					let x = (p.x+100e5) % 1e5
					let y = (p.y+100e5) % 1e5
					console.log(x.fmt(), y.fmt())
				}
				
				//transform(c, Matrix.Translate(0e5, -0.95765e5))
				//*/
				
				//transform(c, {xx:-1,yy:1,xy:0,yx:0,x:0,y:0})
				//transform(c, Matrix.Translate(36e5,0))
				//transform(c, Matrix.Rotate(-90))
				//short_to_arcs(c, 0.187e5)
				//check(c)
				
				/*let lens = []
				let center = new Point(17.875e5,13.875e5)
				for (let i=0; i<c.length; i+=2) {
					let p = c[i] 
					let diff = p.Subtract(center)
					let dist = diff.hypot()
					let angle = diff.atan()
					lens.push([dist,angle])
				}
				lens.sort((a,b)=>(a[0]-b[0]))
				console.warn(lens.join("\n"))*/
				
				/*
chips
let h = c[4].Subtract(c[0])
				let v = c[6].Subtract(c[2])
				let an = ((v.atan()+360)%360 + (h.atan()+90+360)%360)/2
				let sc = (h.hypot()/6e5 + v.hypot()/8e5)/2
				an += 90
				if (an>180)
					an = an-360
				console.warn(`<use href="#chip1" transform="translate(${c[4].Middle(c[0]).fmt()}) scale(${sc}) rotate(${an})"/>`)*/
				
				/*rotate(c, 2)
				c.splice(1, 3, new SegA(new Point(1e5,1e5)))
				c.splice(-3, 3, new SegL())*/
				//merge_lines(c)
				//transform(c, Matrix.Scale(-1,1))
				//transform(c, Matrix.Translate(36e5,0))
				//round_contour(c)
				
				//check(c)
				
				for (let cmd of commands)
					cmd(c, tag)
				
				//c = new Contour([c[0].Middle(c[2]), new SegGap])
				//round_contour(c)
				if (OPT.abs)
					d += unparse_abs([c])
				else
					d += unparse_rel([c])
				// TODO! we need to round the absolute coordinates BEFORE converting to relative, not after!!
				
				first = 0
			}//*/
		}
		tag.attrs.d = d
	}
})

if (OPT.unflip) {
	function cleanup(node) {
		/*if (node.name=='g' && Object.keys(node.attrs).length==0 && node.childs.filter(x=>x instanceof Element).length==1) {
			node.parentNode.replaceChild(node.childs.find(x=>x instanceof Element), node)
			}*/
		for (let c of node.childs) {
			if (c instanceof Element)
				cleanup(c)
		}
	}
	cleanup(root.childs[0])
}
{
	let out = String(root)
	if (OPT.unflip)
		out = out.replaceAll('><','>\n<')
	process.stdout.write(out)
	process.stdout.write('\n')
}

process.exit(0)

function parse_xml(xml, step) {
	let REGEX = /(<!--)|(<[?])|<([/])?([-a-zA-Z0-9_:]+)([^>]*?)([/])?>|</g
	let match
	let last = 0
	let comment
	let root = new Root()
	let stack = [], current = root
	function skip(term) {
		let end = xml.indexOf(term, REGEX.lastIndex)
		REGEX.lastIndex = end<0 ? xml.length : end+term.length
	}
	
	while (match = REGEX.exec(xml)) {
		// comment
		if (match[1]) {
			skip('-->')
			continue
		}
		if (match[2]) {
			skip('?>')
			continue
		}
		let text = xml.substring(last, match.index)
		if (text)
			current.childs.push(text)
		last = REGEX.lastIndex
		let [all, , , close, name, attrs, empty] = match
		if (!name)
			throw new Error('invalid tag: '+all)
		if (close) {
			if (attrs || empty) throw new Error('bad closing tag: '+all)
			if (current.name != name)
				throw new Error('wrong closing tag: got '+name+", expected "+current.name)
			current = stack.pop()
			continue
		}
		
		let tag = new Element(name)
		
		attrs = attrs.split(/("[^]*?"|'[^]*?')/g)
		if (attrs.pop().trim())
			throw new Error('stuff after attrs: '+all)
		for (let i=0; i<attrs.length-1; i+=2) {
			let key = /\s+([^=\s"']+)\s*=\s*/.exec(attrs[i])
			if (!key)
				throw new Error('invalid attribute: '+attrs[i])
			let value = attrs[i+1].slice(1,-1)
			tag.attrs[key[1]] = value
		}
		current.childs.push(tag)
		tag.parentNode = current
		if (empty)
			tag.empty = true
		else {
			stack.push(current)
			current = tag
		}
		step?.(tag)
	}
	{
		let text = xml.substring(last)
		if (text)
			current.childs.push(text)
	}
	if (current!=root)
		throw new Error('unclosed tags.')
	return root
}

function make_star(id, od, num) {
	let con = new Contour()
	
	function pa(dist, an, ad) {
		let angle = an*2*Math.PI/ad
		return new Point(Math.cos(angle)*dist, Math.sin(angle)*dist)
	}
	
	for (let i=0; i<num; i++) {
		let po = pa(od, i, num)
		let pi = pa(id, i+0.5, num)
		con.push(po, new SegL(), pi, new SegL())
	}
	return con
}

//<g transform="matrix(1 0 0 1  → <path d="M 
/* )">
	*<path d="M →  m */
/*
idea: each shape (set of paths, ellipses, rects, etc.) is stored in an object. this is equivalent to a <g> element. (except no styles on the children)
it has fields like
.fill
.shapes
.strokeWidth
etc.
then, it inherits from a parent element.
so for example,
this:
<g fill="red">
<circle fill="blue"/>
<rect width="2" height="3"/>
</g>
would be stored as:

g = {fill:"red"}
circle = {style:{__proto__:g, fill:blue}, shapes:[type:"circle"]}
rect = {style:{__proto__:g}, shapes:[{type:"rect",width:2,height:3}]}
p
svg = [circle, rect]

actually, think ill make style inherit rather than the entire thing
i guess it doesnt even need to really inherit, it can just copy, in reality, but eh..

*/

//circlize Foggy emoji ..

// \.499[0-9]*\|\.500[0-9]* → .5
// \([0-9]*\)\.99[89][0-9]* → \,(1+ (string-to-number \1))
// \.00[01][0-9]* → 

// favicon: old microscope emoji

 cors
