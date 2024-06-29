// fix for createWritable() not being available in Safari
// https://caniuse.com/mdn-api_filesystemfilehandle_createwritable
// https://bugs.webkit.org/show_bug.cgi?id=254726
import 'native-file-system-adapter/src/FileSystemFileHandle.js'
