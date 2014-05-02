/**
 + ---------------------------------------- +
 + 断点续传 v1.0
 + Author: stone
 + QQ: 6983684
 + Mail: dl197@126.com
 + ---------------------------------------- +
 + Date: 2014-03-10
 + ---------------------------------------- +
**/

(function(win){
var doc = win.document,

body = doc.body,
//获取elements
$ = function(str){
	return doc.querySelectorAll(str);
},
//文件size bytes转换为kb或者mb
format = function(s, k){
	return s> 1024 * 1024&&!k ? 
		(Math.round(s * 100 / (1024 * 1024)) / 100).toString() + 'MB' :
		(Math.round(s * 100 / 1024) / 100).toString() + 'KB';
},
//起名
hs = function(str){
	var hash = 1315423911, i, ch;
    for (i = str.length - 1; i >= 0; i--) {
        ch = str.charCodeAt(i);
        hash ^= ((hash << 5) + ch + (hash >> 2));
    }
    return  (hash & 0x7FFFFFFF);
},

isDOM = function(dom){
	return dom && (dom.nodeType === 1);
},

empty = function(){},

Upload = function(){
	this._init.apply(this, arguments)
};

Upload.prototype = {
	constructor: Upload,
	_elementState: (function(){
		var _$ = function(id, cls){
			var str = cls?'>.upload-'+cls:'';
			str = cls=='i'?' i':str;
			return $('#upload'+id+str)[0];
		}

		return {
			state: function(id, msg){
				var elem = _$(id, 'state');
				if(!elem)return this;
				elem.innerHTML = msg;
				return this;
			},
			progress: function(id, n){
				var elem = _$(id, 'i');
				if(!elem)return this;
				var n = Math.min(n, 100);
				elem.style.width = n + '%';
				return this;
			},
			size: function(id, size){
				var elem = _$(id, 'size i');
				if(!elem)return this;
				elem.textContent = format(size) + '/';
				return this;
			}
		};
	})(),
	_getFiles: function(files){
		var i = 0, len = files.length, f, html = '', names = [], msg = '';
		if(!this.multifile && len > 1){
			len = 1;
			alert('不支持多文件上传！');
		}
		for(;i<len; i++){
			f = files[i];
			var name = f.name, size = f.size, type = name.split('.').pop().toLowerCase(),
				id = hs(f.lastModifiedDate.getTime() + '' + size + type);

			if(!name.split('.')[1]){
				msg += name+' 文件夹不允许上传！\n';
				continue;
			}else if(this.types !== '*' && !this._checkItem(this.types, type)){
				msg += name+' 文件类型被限制！\n';
				continue;
			}
			if(parseInt(format(size,1)) > this.fileMax){
				msg += name+' 超出大小限制！\n';
				continue;
			}
			if(this._fileObject[id]){
				msg += name+' 已存在！\n';
				continue;
			}

			
			html += this.tpl.replace('$id$', id)
				.replace('$name$', name)
				.replace('$progress$', '<strong><i></i></strong>')
				.replace('$type$', type)
				.replace('$size$', '<i></i>' + (size > 1024 * 1024 ? format(size) : format(size,true)))
				.replace('$state$', '检测中..')
				.replace('$remove$', '<a href="javascript:;" data-id="'+ id +'" class="upload-remove">删除</a>');

			names.push(id+'.'+type);
			//存储二进制数据对象
			this._fileObject[id] = {
				file: f,
				start: 0,
				pause: true
			};
		}

		msg!==''&&alert(msg);
		this.onFileChange(files);
		
		if(html !== ''){
			this.listParent.innerHTML += html;
			//发送Ajax获取文件size
			var xhr_check = new XMLHttpRequest(), _this = this, 
				success = function(results){
					for(var key in results){
						var id = key.split('.')[0], o = _this._elementState,
							f = _this._fileObject[id];
						if(!results[key]){//没有上传过
							o.state(id, '等待上传').size(id, 0);
						}else{
							var n = parseInt(results[key] / f.file.size * 100);
							o.progress(id, n);
							if(n == 100){//已传完
								o.state(
									id, 
									'<a target="_blank" href="uploads/'+ key +'">已上传过</a>'
								).size(id, f.file.size);
								_this._fileObject[id] = null;
								delete _this._fileObject[id];
							}else{//未传完
								o.state(id, '等待续传').size(id, results[key]);
								f.start = results[key];
							}
							
						}
					}
				};

			xhr_check.open('get', this.uploader+'?names='+names.join('|'), true);
			xhr_check.onreadystatechange = function(e){
				if(this.readyState == 4){
					if(this.status == 200){
						try{
							var json = JSON.parse(this.responseText);
						}catch(e){
							_this.error('Ajax获取文件状态失败！');
							return;
						}
						
						json.success && json.results && success(json.results);
					}
				}
			}
			xhr_check.send();
		}
	},
	fileUpload: function(name, type, file, start){
		if(this._fileObject[name].pause)return;
		var xhr = new XMLHttpRequest(), start = start || this._fileObject[name].start, _this = this,
			fd = new FormData();
		//切分文件块，准备传输
		fd.append(this.fileName, file.slice(start, start + this.fileSplitSize));
		this.formData.fileName = name + '.' + type;
		for(var key in this.formData){
			this.formData.hasOwnProperty(key)&&fd.append(key, this.formData[key]);
		}
		
		xhr.open(this.method, this.uploader, true);
		xhr.setRequestHeader("X_Requested_With", 'XMLHttpRequest');
		xhr.upload.addEventListener("progress", function(e){
			var n = parseInt((e.loaded + start) / file.size * 100);
			_this._elementState.progress(name, n).size(name, e.loaded + start);
		}, false);

		xhr.onreadystatechange = function(e){
			if(this.readyState == 4){
				if(this.status == 200){
					try{
						var data = JSON.parse(this.responseText);
					}catch(e){
						_this.error('上传失败！');
						return;
					}
					
					if(data && data.success){
						//判断文件是否传输完毕
						if(start + _this.fileSplitSize >= file.size){
							//上传完毕 清除引用
							_this._fileObject[name] = null;
							delete _this._fileObject[name];
							_this._elementState.state(name, '上传成功').size(name, file.size);
							_this.onUploadSucc(name);
							console.log(name + '上传成功！');
						}else{
							//未传完 继续
							start += _this.fileSplitSize;
							_this._fileObject[name].start = start;
							_this.fileUpload(name, type, file, start);

						}
					}
				}else{
					_this.onUploadErr();
					_this._elementState.state(name, '上传失败');
					_this.error('上传失败！');
				}
			}
		}
		xhr.send(fd);
	},
	_checkItem: function(strs, str){
		var reg = new RegExp('(^|\\|)'+str+'(\\||$)', 'i');
		return reg.test(strs);
	},
	_init: function(opt){
		opt = opt || {};
		//@String 文件上传类型限制，用|分割 
		this.types = opt.types || '*';
		//@String 提交到后端处理的文件地址, 必选项
		this.uploader = opt.uploader;
		//@String 后端接受到文件键值
		this.fileName = opt.fileName || 'file';
		//@boole 是否开启多文件上传 默认开启
		this.multifile = opt.multifile || true;
		//上传列表项目
		this.listItem = opt.listItem || 'name|state';
		//@String 请求方式
		this.method = opt.method || 'post';
		//@Object 提交到后端的附加参数格式为json
		this.formData = opt.formData || {};
		//@Number 单个文件的大小限制 单位kb 默认2MB
		this.fileMax = opt.fileMax || 2048;
		//@Number 断点分割的文件块大小 单位bytes 默认1MB
		this.fileSplitSize = opt.fileSplitSize || 1024*1024;
		//拖拽上传dom元素
		this.dragElement = opt.dragElement;
		//@Object 选择文件的button, 必选项
		this.selectBtn = opt.selectBtn;
		//@Object 列表元素父级element 必选项
		this.listParent = opt.listParent;
		//@Function 获取file列表
		this.onFileChange = opt.onFileChange || empty;
		//@Function 每个文件上传成功回调
		this.onUploadSucc = opt.onUploadSucc || empty;
		//@Function 每个文件上传失败回调
		this.onUploadErr = opt.onUploadErr || empty;
		//当前的存储file对象数组
		this._fileObject = {};

		if(!isDOM(this.listParent)){
			this.error('listParent is not DOMElement！');
			return;
		}
		if(typeof window.requestAnimationFrame !== "function"){
			this.listParent.innerHTML += '<p>您的浏览器不支持html5断点续传，请使用IE10+,Firefox,Chrome</p>';
			return;
		}

		if(this.selectBtn && this.selectBtn.nodeType === 1){
			this.fileInput = doc.createElement('input');
			this.fileInput.type = 'file';
			this.fileInput.name = this.fileName+'[]';
			this.fileInput.multiple = this.multifile;
			this.fileInput.style.display = 'none';
			body.appendChild(this.fileInput);
		}
		//初始化执行函数
		this._setTpl();
		this._addEvent();
	},
	_setTpl: function(){
		var item = ['<div class="upload-list" id="upload$id$">'];
		var arr = this.listItem.split('|');
		for(var i=0; arr[i]; i++){
			if(arr[i] == 'remove'){
				item.push('<span>$'+arr[i]+'$</span>');
				continue;
			}
			item.push('<span class="upload-'+ arr[i] +'">$'+arr[i]+'$</span>');
		}
		this.tpl = item.join('') + '</div>';
	},
	pause: function(id){
		if(id * 1 === id){//单个暂停
			this._fileObject[id]&&(this._fileObject[id].pause = true);
		}else{//全部暂停
			for(var key in this._fileObject){
				this._fileObject[key].pause = true;
			}
		}
	},
	upload: function(id){
		if(id * 1 == id){//单个开始上传
			if(this._fileObject[id]){
				var o = this._fileObject[id];
				o.pause = false;
				this.fileUpload(key, o.file.name.split('.').pop().toLowerCase(), o.file);
			}
		}else{//全部开始上传
			var o;
			for(var key in this._fileObject){
				o = this._fileObject[key];
				if(o.pause == false && o.start > 0){
					continue;
				}
				//关闭所有暂停
				o.pause = false;
				this.fileUpload(key, o.file.name.split('.').pop().toLowerCase(), o.file);
			}
		}

	},
	remove: function(id){
		var item;
		if(id * 1 == id){
			item = $('#upload'+id)[0];
			if(item){
				this._fileObject[key]&&(this._fileObject[id] = true);
				this._fileObject[id] = null;
				delete this._fileObject[id];
				item.parentNode.removeChild(item);
			}
		}else{
			for(var key in this._fileObject){
				item = $('#upload'+key)[0];
				if(item){
					this._fileObject[key]&&(this._fileObject[key] = true);
					this._fileObject[key] = null;
					delete this._fileObject[key];
					item.parentNode.removeChild(item);
				}
			}
		}
	},
	_addEvent: function(){
		var _this = this;

		_this.listParent.addEventListener('click', function(e){
			var target = e.target;
			if(target && target.className == 'upload-remove'){
				//删除单个文件
				var id = target.getAttribute('data-id');
				id * 1 == id && _this.remove(id);
			}

		}, false);
		//拖放选择文件
		if(isDOM(_this.dragElement)){
			_this.dragElement.addEventListener('dragover', function(e){
				e.preventDefault();
				this.className = 'into';
			}, false);
			_this.dragElement.addEventListener('drop', function(e){
				e.preventDefault();
				this.className = '';
				_this._getFiles(e.dataTransfer.files);
			}, false);
		}

		//文件选择控件
		if(isDOM(_this.selectBtn)){
			_this.fileInput.addEventListener('change', function(e){
				_this._getFiles(e.target.files);
			}, false);
			_this.selectBtn.addEventListener('click', function(e){
				_this.fileInput.click();
			}, false);
		}

	},
	error: function(str){
		throw new Error(str);
	}
};

win.upload = function(opt){
	return new Upload(opt);
}
		
})(window);
