'use strict';
var SetUpMain = function ({character, background, data, onload}){
	console.time('time3');
	this.character = document.getElementById(character);
	this.background = document.getElementById(background);
	this.data = data;
	this.$save = [];
	this.$saveEquation = [];

	this.onload = onload;
	this.onload && (typeof this.onload === 'function') && this.onload();
	
	this.$compile = new Compile(this.background, this.$save, this);
	compiler(this);

	this.watchers = [];

	console.timeEnd('time3');
};

var Watcher = function ({object, todo, state}){
	object.watchers.push({
		object: object,
		state: state,
		todo: todo
	});
}

var compiler = function (obj){
	obj.$compile.defineProperty(obj.data, obj);
}

var Compile = function (background, $save, obj){
	this.compile(background, $save, obj);
}

Compile.prototype = {
	defineProperty: function (parent, obj){
		var self = this;
		if(!parent) parent = {};
		Object.keys(parent).forEach(function (key){
			var val = parent[key];
			Object.defineProperty(parent, key, {
				get: function (){
					return val;
				},
				set: function (newValue){
					if(val === newValue) return;
					var oldValue = JSON.parse(JSON.stringify(obj.data));
					val = newValue;
					self.compileText(oldValue, obj);
					listen();
				},
				configurable: false,
				enumerable: true
			});
			typeof val === 'object' && self.defineProperty(val, obj);
		});
		var listen = function (){
			for(var i = 0, len = obj.watchers.length; i < len; i++){
				obj.watchers[i].todo(obj, i);
			}
		}
	},
	compileText: function (oldValue, obj){
		//console.time('time2');
		var self = this;
		var reg = /{{[\w\.$_]+?}}/g;
		var reg1 = /\${[^@\`]+?}/g;
		var reg2 = /[0-9a-zA-Z\.\[\]_]+/g;
		obj.$save.forEach(function (arr){
			arr.name.forEach(function (v){
				if(eval('oldValue.' + v.slice(2, -2)) === eval('obj.data.' + v.slice(2, -2))) return;
				if(arr.type !== 'text'){
					arr.node.setAttribute(arr.type, self.getCompileResult(arr.value, reg, obj));
				} else {
					arr.node.nodeValue = self.getCompileResult(arr.value, reg, obj);
				}
			});
		});
		obj.$saveEquation.forEach(function (arr){
			arr.name.forEach(function (v){
				if(!isNaN(Number(v))) return;
				if(eval('oldValue.' + v) === eval('obj.data.' + v)) return;
				if(arr.type === 'text'){
					arr.node.nodeValue = arr.value.replace(reg1, function (v){
						return eval(self.getCompileResult2(v, reg2, obj).slice(2, -1));
					});
				}else{
					arr.node.setAttribute(arr.type, arr.value.replace(reg1, function (v){return eval(self.getCompileResult2(v, reg2, obj).slice(2, -1))}))
				}
			})
		})
		//console.timeEnd('time2');
	},
	compile: function (background, $save, obj){
		//console.time('time1');
		var nodes = background.childNodes;
		var reg = /{{[\w\.$_]+?}}/g;
		var reg1 = /\${[^@\`]+?}/g;
		var reg2 = /[0-9a-zA-Z\.\[\]_]+/g;
		var self = this;
		nodes.forEach(function (node){
			if(self.isText(node)){
				if(reg.test(node.data)){
					var result = self.getCompileResult(node.nodeValue, reg, obj);
					var template = {node, name: node.data.match(reg), value: node.nodeValue, type: 'text'}
					$save.push(template);
					reg.lastIndex = 0;
					node.nodeValue = result;
				}
				if(reg1.test(node.data)){
					var result = node.data.replace(reg1, function (v){
						return eval(self.getCompileResult2(v, reg2, obj).slice(2, -1));
					});
					var template = {node, name: [].concat.apply([], node.data.match(reg1).map(function (v){return v.match(reg2)})), value: node.nodeValue, type: 'text'}
					obj.$saveEquation.push(template);
					reg.lastIndex = 0;
					node.nodeValue = result;
				}
			}else{
				var virtualDom = self.createVirtualDom(node);
				self.createTemplate(virtualDom, $save, node, obj);
				self.compile(node, $save, obj);
			}
		})
		//console.timeEnd('time1');
	},
	isText: function (node){
		return node.nodeType === 3;
	},
	createVirtualDom: function (node){
		var dom = {};
		var property = ['class', 'style', 'title', 'name', 'ly-for', 'id'];
		property.forEach(function (v){
			if(node.nodeType === 8) return;
			dom[v] = node.getAttribute(v);
		});
		return dom;
	},
	createTemplate: function (virtualDom, $save, node, obj){
		var self = this;
		var reg = /{{[\w\.$_]+?}}/g;
		var reg1 = /\${[^@\`]+?}/g;
		var reg2 = /[0-9a-zA-Z\.\[\]_]+/g;
		for(var key in virtualDom){
			if(reg.test(virtualDom[key])){
				var template = {node, name: virtualDom[key].match(reg), value: virtualDom[key], type: key};
				$save.push(template);
				var result = self.getCompileResult(virtualDom[key], reg, obj);
				node.setAttribute(key, result);
				reg.lastIndex = 0;
			}
			if(reg1.test(virtualDom[key])){
				var template = {node, name: [].concat.apply([], virtualDom[key].match(reg1).map(function (v){return v.match(reg2)})), value: virtualDom[key], type: key};
				obj.$saveEquation.push(template);
				var result = virtualDom[key].replace(reg1, function (v){
					return eval(self.getCompileResult2(v, reg2, obj).slice(2, -1));
				});
				node.setAttribute(key, result);
				reg.lastIndex = 0;
			}
		}
	},
	getCompileResult: function (str, reg, obj){
		return str.replace(reg, function (v){
			return typeof eval('obj.data.' + v.slice(2, -2)) === 'object' ? JSON.stringify(eval('obj.data.' + v.slice(2, -2))) : eval('obj.data.' + v.slice(2, -2))
		})
	},
	getCompileResult2: function (str, reg, obj){
		var arr = str.match(reg);
		return str.replace(reg, function (v){
			return isNaN(Number(v)) ? eval('obj.data.' + v) : v
		})
	}
};

SetUpMain.prototype.setStatus = function ({name, _maxhp, _hp, _recoverSelf, _mp, _def, _str,	_int,	_luk,	_mdf,	_agi,	_vit,	_dex, _maxexp, _exp, _walkSpeed, _runSpeed, _attackSpeed}){
	this.data.character = {
		name: name === '' ? '勇士' : name,
		_maxhp: _maxhp === undefined ? this.data.character._maxhp : _maxhp,
		_hp: _hp === undefined ? this.data.character._hp : _hp,
		_recoverSelf: _recoverSelf === undefined ? this.data.character._recoverSelf : _recoverSelf,
		_mp: _mp === undefined ? this.data.character._mp : _mp,
		_def: _def === undefined ? this.data.character._def : _def,
		_str: _str === undefined ? this.data.character._str : _str,
		_int: _int === undefined ? this.data.character._int : _int,
		_luk: _luk === undefined ? this.data.character._luk : _luk,
		_mdf: _mdf === undefined ? this.data.character._mdf : _mdf,
		_agi: _agi === undefined ? this.data.character._agi : _agi,
		_vit: _vit === undefined ? this.data.character._vit : _vit,
		_dex: _dex === undefined ? this.data.character._dex : _dex,
		_maxexp: _maxexp === undefined ? this.data.character._maxexp : _maxexp,
		_exp: _exp === undefined ? this.data.character._exp : _exp,
		_walkSpeed: _walkSpeed === undefined ? this.data.character._walkSpeed : _walkSpeed,
		_runSpeed: _runSpeed === undefined ? this.data.character._runSpeed : _runSpeed,
		_attackSpeed: _attackSpeed === undefined ? this.data.character._attackSpeed : _attackSpeed
	}
}

SetUpMain.prototype.setPosition = function ({x, y}){
	this.data.position = {
		x: x === undefined ? this.data.position.x : x,
		y: y === undefined ? this.data.position.y : y
	}
}

SetUpMain.prototype.setOtherStatus = function ({iswalk, isrun}){
	this.data.status = {
		iswalk: iswalk === undefined ? this.data.status.iswalk : iswalk,
		isrun: isrun === undefined ? this.data.status.isrun : isrun
	}
}

SetUpMain.prototype.stopWalk = function (){
		clearInterval(this.walkTimer);
		this.walkTimer = null;
}

SetUpMain.prototype.setKeyCode = function (keyCode){
	switch(keyCode){
		case '37':
		this.data.keyCodes.left = true;
		break;
		case '38':
		this.data.keyCodes.up = true;
		break;
		case '39':
		this.data.keyCodes.right = true;
		break;
		case '40':
		this.data.keyCodes.down = true;
		break;
	}
}

SetUpMain.prototype.clearKeyCode = function (keyCode){
	switch(keyCode){
		case '37':
		this.data.keyCodes.left = false;
		break;
		case '38':
		this.data.keyCodes.up = false;
		break;
		case '39':
		this.data.keyCodes.right = false;
		break;
		case '40':
		this.data.keyCodes.down = false;
		break;
	}
}

SetUpMain.prototype.normalAttack = function (){
	console.log('normalAttack');
}

SetUpMain.prototype.heavyAttack = function (){
	console.log('heavyAttack');
}