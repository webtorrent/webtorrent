.PHONY : default
default:
	DEBUG=true ./node_modules/.bin/browserify --debug -t envify index.js > chrome/bundle.js
	# /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --load-and-launch-app=chrome
	/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --load-and-launch-app=chrome
