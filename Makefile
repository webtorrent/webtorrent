.PHONY : default
default:
	browserify --debug index.js > chrome/bundle.js
	/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --load-and-launch-app=chrome
