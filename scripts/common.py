VIEWBOX = 36 # viewbox of twemoji svgs
SCALE = 24 # upscale factor for svg units

def gname(cp):
	if (cp>=0x10000):
		return "u%X" % cp
	return "uni%04X" % cp

def lname(codes):
	return "u"+"_".join("%04X" % c for c in codes)
