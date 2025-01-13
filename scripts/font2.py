VIEWBOX = 36 # viewbox of twemoji svgs
WATERLINE = 6 # how far up the baseline should be (in svg units)
MARGIN = 1 # left/right bearing, in svg units
EMOJI_SCALE = 1.125 # in `em` units. i.e. at a font size of 16px, emojis will be 18px

SCALE = 24 # upscale factor for svg units

EM = round((VIEWBOX / EMOJI_SCALE) * SCALE)
DESCENT = round(0.2 * EM) # doesnt really matter for display itself, but we do this to match other fonts
WIDTH = round((MARGIN+VIEWBOX+MARGIN) * SCALE)

f = fontforge.open("build/layers.sfd")

f.copyright = '(c) my balls'
f.design_size = 16
f.fontname = "TwemojiMozilla"
f.familyname = "Twemoji Mozilla"
f.fullname = "Twemoji Mozilla"
f.os2_vendor = "12;;"

f.upos = -108 # idk ?? nothing uses this anyway
f.uwidth = 2 * SCALE

f.os2_winascent_add = False
f.os2_windescent_add = False
f.os2_typoascent_add = False
f.os2_typodescent_add = False
f.hhea_ascent_add = False
f.hhea_descent_add = False

f.os2_winascent = (VIEWBOX-WATERLINE)*SCALE + SCALE
f.os2_windescent = (WATERLINE)*SCALE + SCALE
f.os2_typoascent = f.os2_winascent #round(712/768*EM) # idr how i calculated these, but i did. UPDATE: i got them from the hhea ascent/descent values in my copy of Roboto.
f.os2_typodescent = -f.os2_windescent # round(-188/768*EM)
f.os2_typolinegap = 0
f.hhea_ascent = f.os2_typoascent
f.hhea_descent = f.os2_typodescent
f.hhea_linegap = 0

# this causes issues with fallback for me, for now
#f.os2_panose = (5, 2, 1, 0, 1, 2, 2, 2, 2, 2)
#f.os2_family_class = 3072

# now set the real metrics. (be careful so fontforge doesn't re-scale the entire font)
f.ascent = EM - DESCENT
f.descent = DESCENT
assert f.em == EM

print(f.em)
f.generate("build/glyphs.otf", flags=('opentype', 'round', 'no-hints', 'no-flex', 'short-post'))
