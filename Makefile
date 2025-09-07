# Makefile
.PHONY: install compile test clean deploy

install:
	npm install

compile:
	npx hardhat compile

test:
	npx hardhat test

clean:
	npx hardhat clean

# Example: pass your network via env var or target
deploy:
	npx hardhat run scripts/deploy-mynewcontract.js --network localhost