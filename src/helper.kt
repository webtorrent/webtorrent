package kotorrent

external val require:dynamic = definedExternally
external val process:dynamic = definedExternally
fun new(type: dynamic, vararg args: dynamic): dynamic {
    val argsArray = (listOf(null) + args).toTypedArray()
    return js("new (Function.prototype.bind.apply(type, argsArray))")
}
val printjo = {jo:dynamic->val msg=kotlin.js.JSON.stringify(jo);println(msg)}
val kob = {
/*
wrapper to create a dynamic object
*/
  val o:dynamic=object{}
  o
} 
val version_azureus = { version:String ->
    version.replace(Regex("""\d*."""), { val x = "${it.value}".toFloat() % 100; "0$x".takeLast(2)}).take(4)
}
fun get_version_azureus(version:String):String {
    return version.replace(Regex("""\d*."""), { val x = "${it.value}".toFloat() % 100; "0$x".takeLast(2)}).take(4)
}

val jstype = {t:Any->js("typeof t")}
