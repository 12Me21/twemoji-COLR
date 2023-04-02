export default class ProgressBar {
	constructor(n, title=null) {
		this.w2 = n
		this.ws = -1
		this.x = performance.now()
		this.lit = false
	}
	start() {
		process.stderr.write("\n\x1B[A💣\\"+"_".repeat(97)+"\x1B7")
		this.lit = true
	}
	step(w1) {
		if (!this.lit)
			throw new Error('fuse')
		let ws2 = Math.round(w1/this.w2*100)
		let diff = ws2-this.ws
		if (diff>0) {
			process.stderr.write("\x1B8"+"\b".repeat(diff)+"\x1B7🔥\n")
			this.ws = ws2
		}
	}
	end() {
		this.lit = false
		process.stderr.write('\x1B8💥 ')
		let x2 = performance.now()
		console.warn(((x2-this.x)/1000).toFixed(1)+" sec")
	}
}
