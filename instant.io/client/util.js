var logElem = exports.logElem = document.querySelector(".log")
var speed = document.querySelector(".speed")
var logHeading = document.querySelector("#logHeading")

exports.log = function log (item) {
  logHeading.style.display = "block"
  if (typeof item === "string") {
    var p = document.createElement("p")
    p.innerHTML = item
    logElem.appendChild(p)
    return p
  } else {
    logElem.appendChild(item)
    exports.lineBreak()
    return item
  }
}

exports.lineBreak = function lineBreak () {
  logElem.appendChild(document.createElement("br"))
}

// replace the last P in the log
exports.updateSpeed = function updateSpeed (str) {
  speed.innerHTML = str
}

exports.warning = function warning (err) {
  console.error(err.stack || err.message || err)
  exports.log(err.message || err)
}

exports.error = function error (err) {
  console.error(err.stack || err.message || err)
  var p = exports.log(err.message || err)
  p.style.color = "red"
  p.style.fontWeight = "bold"
}