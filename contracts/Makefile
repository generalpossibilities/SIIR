SOLD ?= sold
TVM_CLI ?= tvm-cli

TVCS := CompanySIIR SIIRFactory SIIRMarketplace

build: clean
	@for c in $(TVCS); do $(SOLD) --tvm-version gosh $$c.sol; done

clean:
	rm -f *.tvc *.abi.json *.code *.debug.json

.PHONY: build clean
