.PHONY : default
default:
	./node_modules/.bin/browserify --debug index.js > chrome/bundle.js
	# /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --load-and-launch-app=chrome
	/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --load-and-launch-app=chrome
