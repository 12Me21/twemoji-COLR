MAKEFLAGS += --no-builtin-rules
.SUFFIXES:

.PHONY: all

all: build/gsub.ttx build/colr.ttx build/cpal.ttx build/glyphs.json

build/colr.ttx build/cpal.ttx &: build/layers.mjs scripts/make-colr.js
	node scripts/make-colr.js

build/gsub.ttx: data/edata.mjs scripts/make-gsub.js
	node scripts/make-gsub.js

build/layers.mjs build/glyphs.json &: data/edata.mjs scripts/layerize.js
	node scripts/layerize.js
