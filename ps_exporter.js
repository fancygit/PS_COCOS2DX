var doc = app.activeDocument;
var doc_name = doc.name;

//	模版文件的路径
//var tpl_save_path = "E:/PS_Export/template/";
var tpl_save_path = "~/Tools/PS_COCOS2DX/template/";

//	输出文件的路径
//var dest_file = "E:/yoyo/ps导出/"+doc_name.replace('psd', 'h');
//var dest_file = "/Users/dotboy/Work/ps导出/"+doc_name.replace('psd', 'h');
var dest_file = "~/Projects/YOYO/YOYO/UI/"+doc_name.replace('psd', 'h');

//	导出图片的路径
//var save_path = "E:/yoyo/ps导出/";   
//var save_path = "/Users/dotboy/Work/ps导出/";
var save_path = "~/Projects/YOYO/YOYO/images/";

function readTpl(name){
	var filename = tpl_save_path+name;
	var file = new File(filename);
	file.open('r');
	var tplContent = file.read();
	file.close();
	return tplContent;
}

var header = readTpl('header.tpl');
var footer = readTpl('footer.tpl');
var Layer= readTpl('Layer.tpl');

header = substitute(header, new object);

function proc_group(layers, parentLayer){
	for(var i=layers.length-1; i>=0; i--){
		var layer = layers[i]; 

		//	忽略不可见层
		if( ! layer.visible ) {
			continue;
		}

		if( layer instanceof ArtLayer){
			//	背景层
			if( layer.isBackgroundLayer)
			{
				continue;
			}
			//alert(layer.parent.name);
			proc_layer(layer, parentLayer);
		}
		else{
			//	遍历组
			var b = layer.bounds;
			var parsed_info = new object();

			parsed_info.x = parseInt(b[0])/2;
			parsed_info.y = parseInt(b[1])/2 - 64;
			parsed_info.w = parseInt(b[2] - b[0])/2;
			parsed_info.h = parseInt(b[3] - b[1])/2;

			var classname = getClassName(layer.name);
			parsed_info.name = getInstanceName(layer.name);
			var source_string = getSourceString(classname);
			var code = substitute(source_string, parsed_info);
			header += code;
			b=null;
			proc_group(layer.layers, layer);
		}
	}
}

function proc_layer(art_layer, parentLayer){
	//	解析名称
	var name = art_layer.name;
	var parsed_info = new object();
	var b = art_layer.bounds;
	var pb = parentLayer.bounds;
	if( parentLayer != 'root')
	{
		var pb = parentLayer.bounds;
		parsed_info.w = parseInt(b[2] - b[0])/2;
		parsed_info.h = parseInt(b[3] - b[1])/2;
		b[0] = parseInt(b[0]) - parseInt(pb[0]);
		b[1] = parseInt(b[1]) - parseInt(pb[1]);
		parsed_info.x = parseInt(b[0])/2;
		parsed_info.y = parseInt(b[1])/2;
	//	b[2] = parseInt(b[2]) - parseInt(pb[2]);
	//	b[3] = parseInt(b[3]) - parseInt(pb[3]);
		var parentName = parentLayer.name;
		parsed_info.parent = getInstanceName(parentName);
	}
	else
	{
		parsed_info.x = parseInt(b[0])/2;
		parsed_info.y = parseInt(b[1])/2;
		parsed_info.w = parseInt(b[2] - b[0])/2;
		parsed_info.h = parseInt(b[3] - b[1])/2;
	}
	//	retina屏

	//	是Controller时需要减64
	if( parentLayer == 'root')
	{
		if( -1 != doc_name.indexOf("Controller") && doc_name != "StoryViewController.psd")
		{
			parsed_info.y = parsed_info.y -64;
		}
	}
	parsed_info.classname = getClassName(name);
	parsed_info.name = getInstanceName(name);
	var attr = getAttr(name);
	
	if( null != attr){
		for(var key in attr){
			parsed_info[key] = attr[key];
		}
	}

	//	看是否存在设置定位点
	if( 7 == parsed_info.ac )
	{
		parsed_info.acx=0;
		parsed_info.acy=1;
		parsed_info.py = 'parentView.bounds.size.height';
		parsed_info.px = 0;
	}

	if( parsed_info.f == 1)
	{
		//全屏模式，放在底部
		parsed_info.y = 'parentView.bounds.size.height - 500 + '+parsed_info.y;
	}

	if( parsed_info.a != undefined)
	{
		parsed_info.update  = parsed_info.name+'.alpha='+parsed_info.a+';';
	}

	if( LayerKind.TEXT == art_layer.kind)
	{
		//	颜色
		parsed_info.r = art_layer.textItem.color.rgb.red/255;
		parsed_info.g = art_layer.textItem.color.rgb.green/255;
		parsed_info.b = art_layer.textItem.color.rgb.blue/255;
		parsed_info.text= art_layer.textItem.contents.replace(/\r|\n/ig, "\\n");
		parsed_info.fontsize = parseInt(art_layer.textItem.size)/2;
		var index = parsed_info.text.indexOf('\\n');
		if( -1 == index)
		{
			parsed_info.w = parsed_info.text.length * parsed_info.fontsize;
			if( parsed_info.h < parsed_info.fontsize)
			{
				parsed_info.h = parsed_info.fontsize;
			}
		}
		else
		{
			var oneline = parsed_info.text.substr(0, index);
			parsed_info.w = oneline.length * parsed_info.fontsize;
		}
		parsed_info.h+=1*parsed_info.l;
	}
	
	if( LayerKind.TEXT == art_layer.kind && null == parsed_info.classname){
		//	内容
		parsed_info.content = art_layer.textItem.contents.replace(/\r|\n/ig, "\\n");
		parsed_info.font = art_layer.textItem.font;
		parsed_info.fontsize = parseInt(art_layer.textItem.size)/2;
		//	颜色
		parsed_info.r = art_layer.textItem.color.rgb.red/255;
		parsed_info.g = art_layer.textItem.color.rgb.green/255;
		parsed_info.b = art_layer.textItem.color.rgb.blue/255;
		//	文本
		var code = substitute(UILabel, parsed_info);
		header += code;
		
		return;
	}
	
	var source_string = getSourceString(parsed_info.classname);
	var code = substitute(source_string, parsed_info);
	header += code;
	
	if( undefined != parsed_info.nm ){
		art_layer.copy();
		var newDoc = app.documents.add(parsed_info.w*2, parsed_info.h*2, 72.0, "tmp", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
		newDoc.paste();
		image_name = parsed_info.nm;
		if( undefined == image_name){
			image_name = parsed_info.normal;
		}
		if( undefined != image_name){
			save_png(newDoc, image_name);
		}
		newDoc.close(SaveOptions.DONOTSAVECHANGES);
	}
}

//	保存
function save_png(doc, fileName){
    var saveOptions = new PNGSaveOptions();
    saveOptions.interlaced = true;
	//fileName = fileName.replace(/\./,'@2x.');
	fileName += '@2x.png';
    doc.saveAs(new File(save_path+fileName), saveOptions, true, Extension.LOWERCASE);
}
//	C++对象
function object(){
	this.parent = 'this';			//初始
	this.x = 0;
	this.y = 0;
	this.w = 0;
	this.h = 0;
	this.l = 1;
	this.name = '';
	this.ct = '//';
	this.cs = '//';
	this.classname = '';
	//this.ifName= 'LoginViewController';
	this.ifName=doc_name.substring(0,doc_name.lastIndexOf('.'));
	this.cgName=this.ifName+'Category';
	this.view= '//';
	this.controller= '';
}

//	获取类型名
function getClassName(string){
	var re = /\<(.*)\>/;
	var result = re.exec(string);
	if( null != result){
		return result[1];
	}
	return null;
}

//	获取实例名
function getInstanceName(string){
	var re = /\((.*)\)/;
	var result = re.exec(string);
	if( null != result ){
		return result[1];
	}
	return null;
}

//	获取属性
function getAttr(string){
	var re = /(\{.*\})/;
	var result = re.exec(string);
	if( null != result ){
		var code = "(function(){return "+ result[1] + ";}())";
		var attr = eval(code);
		return attr;
	}
	return null;
}

//	获取源字符串
function getSourceString(string){
	var code = "(function(){return " +string+";}())";
	var ret = eval(code);
	return ret;
}

function substitute(str, obj){
	if(!(Object.prototype.toString.call(str) === '[object String]')){
		return '';
	}

	if(!(Object.prototype.toString.call(obj) === '[object Object]' && 'isPrototypeOf' in obj)){
		return str;
	}

	if( -1 == doc_name.indexOf("Controller") )
	{
		obj.controller = '//';
		obj.view = '';
	}

	return str.replace(/\<([^<>]+)\>/g, function(match, key){
		var value = obj[key];
		return ( value !== undefined) ? ''+value :'';
	});
}

//	遍历所有的层
proc_group(doc.layers,'root');

header += footer;
var file = new File(dest_file);
file.encoding="UTF-8";
file.lineFeed="windows";
file.open("w");
file.write('');
file.write(header);
file.close();


