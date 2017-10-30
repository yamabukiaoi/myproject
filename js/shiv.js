NodeList.prototype.forEach = NodeList.prototype.forEach || function (cb){
	for(var i = 0, len = this.length; i < len; i++){
		cb(this[i]);
	}
}