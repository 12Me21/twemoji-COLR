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
		
		let cx=0,cy=0
		let qx=0,qy=0
		
		let args = eat(rx_arg)
		if (!args)
			throw new Error('not enough args'+str.slice(i-1, i+20))
		do {
			if (!rel) {
				px = 0
				py = 0
			}
			let nx = px + +(args[args.length-2]??'0')
			let ny = px + +(args[args.length-1]??'0')
			
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
			contour.push([nx,ny])
		} while (args = eat(rx_arg))
	}
	autoclose()
	return contours
}

console.log(parse(process.argv[2]))
