var doc = app.activeDocument;
var doc_name = doc.name;

//	模版文件的路径
var tpl_save_path = "~/Tools/PS_COCOS2DX/template/";
//	输出文件的路径
//var dest_file = "~/Tools/PS_COCOS2DX/output/"+doc_name.replace(/\..*/, '.h');
var dest_file = "~/Projects/ios/FlowerFormer/Classes/PSUI/"+doc_name.replace(/\..*/, '.h');
//	导出图片的路径
var save_path = "~/Projects/ios/FlowerFormer/Resources/images/";
var export_png = 1;

/**
 * @brief 读取模板文件
 */
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
var Layer = readTpl('Layer.tpl');
var LayerColor = readTpl('LayerColor.tpl');
var UIButton = readTpl('UIButton.tpl');
var Sprite = readTpl('Sprite.tpl');
var Label = readTpl('Label.tpl');
var Menu = readTpl('Menu.tpl');
var ControlSwitch = readTpl('Switch.tpl');

output = "";
var head_info = new object();

/**
 *	处理组
 */
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
			var bounds = layer.bounds;
			var parsed_info = new object();

			parsed_info.w = parseInt(bounds[2]-bounds[0]);
			parsed_info.h = parseInt(bounds[3]-bounds[1]);
			parsed_info.leftx = parseInt(bounds[0]);
			parsed_info.topy  = parseInt(bounds[1]);

			//	classname是指实例对象的类名,而非导出的整体的类名
			//	导出的类名与文件名一致
			var classname = getClassName(layer.name);
			parsed_info.name = getInstanceName(layer.name);
			//	获取源字串
			var source_string = getSourceString(classname);
			var attr = getAttr(layer.name);
			if( null != attr){
				for(var key in attr){
					parsed_info[key] = attr[key];
				}
			}
			var code = substitute(source_string, parsed_info);
			output += code;
			head_info.def += '\t'+classname+'\t*'+parsed_info.name+';\n';

			proc_group(layer.layers, layer);
		}
	}
}

/**
 * 	处理坐标
 *  anchorPoint
 * 	1 2 3
 *  4 5 6 
 *  7 8 9
 */
function proc_position(sel_bounds, parent_bounds, parsed_info)
{
	var screen_height = 1136;
	parsed_info.w = parseInt(sel_bounds[2]-sel_bounds[0]);
	parsed_info.h = parseInt(sel_bounds[3]-sel_bounds[1]);
	parsed_info.leftx = parseInt(sel_bounds[0]);
	parsed_info.topy  = parseInt(sel_bounds[1]);

	var classname = parsed_info.classname;
	parsed_info.anchorPoint=5;
	if( 'Layer' == classname)
	{
		parsed_info.anchorPoint=7;
	}

	var x,y,w,h;
	switch(parsed_info.anchorPoint)
	{
		case 5:
		x=parsed_info.leftx+parsed_info.w/2;
		y=parsed_info.topy+parsed_info.h/2;
		break;
		case 7:
		x=parsed_info.leftx;
		y=parsed_info.topy+parsed_info.h;
		break;
		default:
		break;
	}
	//相对于父层的leftx topy

	parsed_info.x = x;
	parsed_info.y = screen_height - y;

}

/**
 * 处理层
 * ps的坐标系是从上到下，从左到右
 * bounds 的坐标是左上角的坐标和右下角的坐标
 * Layer默认是左下角
 * Sprite默认是中心点
 * Button也是默认中心点
 */
function proc_layer(art_layer, parentLayer){
	//	解析名称
	var name = art_layer.name;
	var parsed_info = new object();

	//	解析类名
	parsed_info.classname = getClassName(name);
	//	解析变量名
	parsed_info.name = getInstanceName(name);
	var bounds  = art_layer.bounds;
	var parent_bounds = parentLayer.bounds;
	proc_position(bounds , parent_bounds, parsed_info);

	if( !!parent_bounds )
	{
		parsed_info.parent = getInstanceName(parentLayer.name);
	}

	//  解析属性内容
	var attr = getAttr(name);
	if( null != attr){
		for(var key in attr){
			parsed_info[key] = attr[key];
		}
	}

	//	透明
	if( parsed_info.a != undefined)
	{
		parsed_info.update  = parsed_info.name+'.alpha='+parsed_info.a+';';
	}

	//	文字层
	if( LayerKind.TEXT == art_layer.kind)
	{
		if( !!parsed_info.fnt)
		{
			switch(parsed_info.fnt)
			{
				case 'num':
				parsed_info.fnt='hb_number';
				break;

				default:
				break;
			}
		}

		if( !!parsed_info.tag )
		{
			parsed_info.c_tag = '';
		}

		//	颜色
		/*
		parsed_info.r = art_layer.textItem.color.rgb.red/255;
		parsed_info.g = art_layer.textItem.color.rgb.green/255;
		parsed_info.b = art_layer.textItem.color.rgb.blue/255;
		*/
		parsed_info.text= art_layer.textItem.contents.replace(/\r|\n/ig, "\\n");
		parsed_info.fontsize = parseInt(art_layer.textItem.size)/2;
		//	处理多行文本
		/*
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
		*/
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
		var code = substitute(Label, parsed_info);
		output += code;
		
		if( '//' == parsed_info.c_d )
		{
			head_info.def += '\t'+'Label'+'\t*'+parsed_info.name+';\n';
		}
		return;
	}
	
	var source_string = getSourceString(parsed_info.classname);
	var code = substitute(source_string, parsed_info);
	output += code;

	//	判断是否需要自定义变量
	if( '//' == parsed_info.c_d )
	{
		if(parsed_info.classname == "UIButton")
		{
			head_info.def += '\t'+"Button"+'\t*'+parsed_info.name+';\n';
		}
		else if(!!parsed_info.classname)
		{
			head_info.def += '\t'+parsed_info.classname+'\t*'+parsed_info.name+';\n';
		}
	}
	
	if( 1 == export_png )
	{
		if( undefined != parsed_info.tn ){
			art_layer.copy();
			var newDoc = app.documents.add(parsed_info.w*2, parsed_info.h*2, 72.0, "tmp", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
			newDoc.paste();
			image_name = parsed_info.tn;
			if( undefined == image_name){
				image_name = parsed_info.normal;
			}
			if( undefined != image_name){
				save_png(newDoc, image_name);
			}
			newDoc.close(SaveOptions.DONOTSAVECHANGES);
		}

		if( undefined != parsed_info.th ){
			// 取消了自动导出图片功能
			art_layer.copy();
			var newDoc = app.documents.add(parsed_info.w*2, parsed_info.h*2, 72.0, "tmp", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
			newDoc.paste();
			image_name = parsed_info.th;
			if( undefined == image_name){
				image_name = parsed_info.normal;
			}
			if( undefined != image_name){
				save_png(newDoc, image_name);
			}
			newDoc.close(SaveOptions.DONOTSAVECHANGES);
		}
	}
}

//	保存
function save_png(doc, fileName){
    var saveOptions = new PNGSaveOptions();
    saveOptions.interlaced = true;
	//fileName = fileName.replace(/\./,'@2x.');
	fileName += '.png';
    doc.saveAs(new File(save_path+fileName), saveOptions, true, Extension.LOWERCASE);
}
/**	解析默认值
 *	<x>,<y>左下角坐标
 *	<w>,<h>宽度与高度
 *	<l>	字体,有几行
 *	<name> 变量
 *	<ct> c代表comment注释,表明模板中某行是否需要被注释 
 *	<c_tag> 注释掉设置tag的行
 *	<c_d> 注释掉设置定义的行
 *  <className> 类名与PSD文件同名
 *  <fileName> 文件名
 */
function object(){
	this.parent = 'this';			//初始
	this.x = 0;
	this.y = 0;
	this.w = 0;
	this.h = 0;
	this.l = 1;
	this.name = '';
	this.c_tag = '//';
	this.c_d = '//';
	this.ct = '//';
	this.cs = '//';
	this.fileName=doc_name.substring(0,doc_name.lastIndexOf('.'));
	this.className=doc_name.substring(0,doc_name.lastIndexOf('.'));
	this.def = "";
	//颜色
	this.r=0;
	this.g=0;
	this.b=0;
	this.a=0;
}

/** 获取类型名
 * <xxx> 尖括号中的字符串代表类型
 * 其值为template中定义的tpl类型
 */
function getClassName(string){
	var re = /\<(.*)\>/;
	var result = re.exec(string);
	if( null != result){
		return result[1];
	}
	return null;
}

/**	获取实例名
 *	(xxx)圆括号中的字符串代表变量名,可以为任意字符串
 */
function getInstanceName(string){
	var re = /\((.*)\)/;
	var result = re.exec(string);
	if( null != result ){
		return result[1];
	}
	return null;
}

/**	获取属性
 *	{xxx}大括号中是一些属性值
 *  用来配置<xxx>中对应的类型
 */

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
header = substitute(header, head_info);

output = header + output + footer;
var file = new File(dest_file);
file.encoding="UTF-8";
file.lineFeed="windows";
file.open("w");
file.write('');
file.write(output);
file.close();


