breakpoint-upload
==
## 使用html5开发的断点续传组件
--
### 特点：
原生javascript编写，不依赖任何类库。基于[HTML5 File API](http://www.w3.org/TR/FileAPI/ "HTML5 File API")，兼容至IE10+。

### API：

	var up = upload(option);
	up.upload();   //上传
	up.pause();    //暂停
	up.remove();   //删除

	//option:
	types;         //@String 文件上传类型限制，用|分割，* 为默认值不限制
	uploader;      //@String 提交到后端处理的文件地址, 必选项
	fileName;      //@String 后端接受到文件键值
	multifile;     //@boole 是否开启多文件上传 默认为true
	listItem;      //@String 上传列表展示的项目有'name|progress|type|size|state|remove'， 默认'name|state'
	method;        //@String 请求方式
	formData;      //@Object 提交到后端的附加参数 格式为json
	fileMax;       //@Number 单个文件的大小限制 单位kb 默认2MB
	fileSplitSize; //@Number 断点分割的文件块大小 单位bytes 默认1MB
	dragElement;   //@Object 拖拽上传dom元素 可选
	selectBtn;     //@Object 选择文件的button, 必选项
	listParent;    //@Object 用于展现项目列表元素父级element 必选项
	onFileChange;  //@Function 获取file列表
	onUploadSucc;  //@Function 每个文件上传成功回调
	onUploadErr;   //@Function 每个文件上传失败回调

详见 `upload.js`
