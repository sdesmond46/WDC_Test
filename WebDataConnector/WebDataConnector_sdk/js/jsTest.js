var enumerateAll = function(obj, indent) {
	var start = "";
	for(var i in obj) {
		var type = typeof obj[i];
		start += indent + i + " - " + type + "\n";

		if (type == "object") {
			start += enumerateAll(obj[i], indent + "  ");
		}
	}

	return start;
}