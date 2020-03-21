/*
 * Copyright 2018 datagear.tech. All Rights Reserved.
 */

/**
 * 表单组件。
 * 依赖:
 * jquery.js
 * jquery-ui.js
 * jquery.fileupload.js
 * datagear-meta.js
 * datagear-util.js
 * jquery.validate.js
 */
(function($, undefined)
{
	$.fn.extend(
	{
		isTableform : function()
		{
			return $(this).hasClass("table-form");
		}
	});
	
	$.widget("datagear.tableform",
	{
		options:
		{
			//必选，表
			table : undefined,
			
			//可选，是否渲染指定列，此设置优先级低于ignoreColumnNames
			renderColumn : function(column, columnIndex)
			{
				return true;
			},
			
			//可选，表单数据
			data : undefined,
			
			//可选，表单提交action
			action : "#",
			
			//可选，是否只读
			readonly : false,
			
			//可选，提交处理函数，返回false将阻止默认提交行为
			submit : function(){},
			
			//可选，重置处理函数，返回false将阻止默认重置行为
			reset : function(){},
			
			//"readonly=false"时必须
			selectColumnValue : function(column, columnValue){ throw new Error("TODO"); },
			
			//必选
			viewColumnValue: function(column, columnValue){ throw new Error("TODO"); },
			
			//"readonly=false"时必须，文件列值上传地址
			columnValueUploadUrl : "",
			
			//可选，文件列值上传时的文件参数名
			columnValueUploadParamName : "file",
			
			//"readonly=false"时必须，文件列值下载地址
			columnValueDownloadUrl : "",
			
			//"readonly=false"时必须，文件列值删除地址
			columnValueDeleteUrl : "",
			
			//可选，文件列值删除时的文件参数名
			columnValueDeleteParamName : "file",
			
			//可选，文件列值是否采用可展示值对象，而非基本文件名称值
			//详细信息对象格式参考：$.meta.toShowableValue
			fileColumnReturnShowableValue : true,
			
			//可选，使用文本域而非文本框的长度阀值
			asTextareaLength : 101,
			
			//可选，验证规则required, 是否按照添加操作的规则来执行required规则
			//添加操作时对于NotNull特性，如果又有AutoGenerated或者ValueGenerator特性，则不需要required
			validationRequiredAsAdd : false,
			
			//可选，表单提交时验证失败回调函数
			invalidHandler : function(event, validator){},
			
			//可选，日期格式
			dateFormat : "",
			
			//可选，SQL日期格式
			sqlDateFormat : "",
			
			//可选，SQL时间戳格式
			sqlTimestampFormat : "",
			
			//可选，SQL时间格式
			sqlTimeFormat : "",
			
			//可选，是否开启批量设置
			batchSet : false,
			
			//batchSet=true时必选，批量执行数目参数名
			batchCountParamName : "batchCount",
			
			//batchSet=true时必选，批量执行出错处理方式参数名
			batchHandleErrorModeParamName : "batchHandleErrorMode",
			
			//batchSet=true时必选，批量执行出错处理方式枚举
			batchHandleErrorModeEnum : ["IGNORE", "ABORT", "ROLLBACK"],
			
			//可选，文件列值默认展示标签值
			lobValuePlaceholders:
			{
				blobPlaceholder: "[BLOB]",
				clobPlaceholder: "[CLOB]",
				sqlXmlPlaceholder: "[SQLXML]"
			},
			
			//可选，标签
			labels :
			{
				add : "添加",
				edit : "编辑",
				del : "删除",
				view : "查看",
				select : "选择",
				submit : "保存",
				reset : "重置",
				uploadFile : "上传",
				downloadFile : "下载",
				batchSet :
				{
					batchSetSwitchTitle : "批量添加设置",
					batchCount : "批量添加数目",
					batchHandleErrorMode : "出错时",
					batchHandleErrorModeEnum : ["忽略", "中止", "撤销"]
				},
				validation :
				{
					"required" : "此项必填"
				}
			}
		},
		
		//form元素ID
		_formId : undefined,
		
		//列组件映射表“name:{}”
		_columnWidgets : undefined,
		
		_create: function()
		{
			if(!this.element.is("form"))
				throw new Error("The DOM must be <form>");
			
			this.element.addClass("form table-form");
			
			var options=this.options;
			var table=options.table;
			
			options.data =  $.meta.instance(table, options.data);
			
			this.element.attr("action", options.action);
			
			//处理form元素ID
			this._formId = this.element.attr("id");
			if(!this._formId)
			{
				this._formId = $.uid("form");
				this.element.attr("id", this._formId);
			}
			
			this._columnWidgets = {};
			
			var $formHead = $("<div class='form-head' />").appendTo(this.element);
			var $formContent = $("<div class='form-content' />").appendTo(this.element);
			var $formFoot = $("<div class='form-foot' />").appendTo(this.element);
			
			this._render($formHead, $formContent, $formFoot);
			
			var maxHeight = $(window).height();
			
			if($.isInDialog(this.element))
				maxHeight = maxHeight - maxHeight/4;
			else
			{
				maxHeight = maxHeight - $formHead.outerHeight();
				maxHeight = maxHeight - $formFoot.outerHeight();
				maxHeight = maxHeight - 10;
			}
			
			if(maxHeight < 50)
				maxHeight = 50;
			
			$formContent.css("max-height", maxHeight+"px").css("overflow", "auto");
		},
		
		_destroy: function()
		{
			if(!this.options.readonly)
			{
				var validator = this.element.validate();
				validator.destroy();
			}
			
			$(".form-foot", this.element).remove();
			$(".form-content", this.element).remove();
			$(".form-head", this.element).remove();
			
			this.element.removeClass("form table-form");
		},
		
		_setOption: function(key, value)
		{
			this._super(key, value);
		},
		
		/**
		 * 获取/设置表单对象。
		 */
		data : function(data)
		{
			var columns = this.options.table.columns;
			
			if(data == undefined)
			{
				data = $.extend({}, this.options.data);
				
				for(var i=0; i<columns.length; i++)
				{
					var column = columns[i];
					var columnName = column.name;
					
					if(this._isIgnoreColumnName(column, i))
						continue;
					
					var columnValue = this._columnWidgets[columnName].getValue();
					$.meta.columnValue(data, columnName, columnValue);
				}
				
				return data;
			}
			else
			{
				for(var i=0; i<columns.length; i++)
				{
					var column = columns[i];
					var columnName = column.name;
					
					if(this._isIgnoreColumnName(column, i))
						continue;
					
					var columnValue = $.meta.columnValue(data, columnName);
					this._columnWidgets[columnName].setValue(columnValue);
				}
			}
		},
		
		/**
		 * 获取/设置列值。
		 * 
		 * @param columnName
		 * @param columnValue
		 */
		columnValue : function(columnName, columnValue)
		{
			if(arguments.length == 1)
			{
				var re = this._columnWidgets[columnName].getValue();
				
				//这里不能直接返回undefined，jquery-ui会处理undefined而返回jquery-ui元素
				return (re == undefined ? null : re);
			}
			else
			{
				var column = $.meta.column(this.options.table, columnName);
				
				if(!this._isIgnoreColumnName(column, columnIndex))
					this._columnWidgets[columnName].setValue(columnValue);
			}
		},
		
		/**
		 * 获取除数据以外的参数对象，比如options.batchCountParamName、options.batchHandleErrorModeParamName参数。
		 */
		param : function()
		{
			var options = this.options;
			
			var batchCount = parseInt($("input[name='"+options.batchCountParamName+"']", this.element).val());
			var batchHandleErrorMode = $("select[name='"+options.batchHandleErrorModeParamName+"']", this.element).val();
			
			var param = {};
			
			if(!isNaN(batchCount) && batchCount >= 0)
			{
				param[options.batchCountParamName] = batchCount;
				param[options.batchHandleErrorModeParamName] = batchHandleErrorMode;
			}
			
			return param;
		},
		
		/**
		 * 是否是批量提交。
		 */
		isBatchSubmit : function()
		{
			var options = this.options;
			
			var batchCount = parseInt($("input[name='"+options.batchCountParamName+"']", this.element).val());
			
			return (batchCount >= 0);
		},
		
		/**
		 * 表单所处的对话框是否设置为钉住。
		 */
		isDialogPinned : function()
		{
			var myDialog = $.getInDialog(this.element);
			
			if(myDialog.length < 1)
				return false;
			
			return $.isDialogPinned(myDialog);
		},
		
		/**
		 * 禁止操作。
		 */
		disableOperation : function()
		{
			$(".form-foot input[type='submit']", this.element).button("disable");
			$(".form-foot input[type='reset']", this.element).button("disable");
		},
		
		/**
		 * 启用操作。
		 */
		enableOperation : function()
		{
			$(".form-foot input[type='submit']", this.element).button("enable");
			$(".form-foot input[type='reset']", this.element).button("enable");
		},
		
		/**
		 * 激活列。
		 * 如果是输入框，则设为焦点；如果是新对话框，则打开对话框。
		 */
		activeColumn : function(columnName)
		{
			if(this.options.readonly)
				return false;
			
			var columns = this.options.table.columns;
			
			for(var i=0; i<columns.length; i++)
			{
				var column = columns[i];
				
				var columnWidget = this._columnWidgets[column.name];
				
				if(columnWidget)
				{
					columnWidget.active();
					return true;
				}
			}
			
			return false;
		},
		
		/**
		 * 提交表单。
		 */
		submit : function()
		{
			this.element.submit();
		},
		
		/**
		 * 重置表单。
		 */
		reset : function()
		{
			var columns = this.options.table.columns;
			
			for(var i=0; i<columns.length; i++)
			{
				var column = columns[i];
				
				var columnWidget = this._columnWidgets[column.name];
				
				if(columnWidget)
					columnWidget.setValue(columnWidget.originalValue);
			}
		},
		
		/**
		 * 绘制。
		 */
		_render : function($formHead, $formContent, $formFoot)
		{
			this._renderFormHead($formHead);
			this._renderFormContent($formContent);
			this._renderFormFoot($formFoot);
		},
		
		/**
		 * 绘制表单页头。
		 */
		_renderFormHead : function($formHead)
		{
			
		},
		
		/**
		 * 绘制表单页内容。
		 */
		_renderFormContent : function($formContent)
		{
			var _this = this;
			
			var options = this.options;
			var table = options.table;
			var data = options.data;
			
			var columns = table.columns;
			for(var i=0; i<columns.length; i++)
			{
				var column = columns[i];
				var columnName = column.name;
				
				if(this._isIgnoreColumnName(column, i))
					continue;
				
				var itemdiv = $("<div class='form-item' />").appendTo($formContent);
				var labeldiv=$("<div class='form-item-label' />").appendTo(itemdiv);
				var valuediv=$("<div class='form-item-value' />").appendTo(itemdiv);
				
				$("<label />").html(columnName).attr("title", (column.comment || columnName)).appendTo(labeldiv);
				
				var columnValue = $.meta.columnValue(data, columnName);
				
				var columnWidget = (_this._columnWidgets[columnName] =
				{
					column : column,
					value : columnValue,
					originalValue : columnValue,
					getValue : function()
					{
						return this.value;
					},
					setValue : function(value)
					{
						this.value = value;
					},
					active : function(){}
				});
				
				var columnImportKey = $.meta.columnImportKey(table, column);
				
				if(columnImportKey)
					this._renderImportKeyColumnFormElement(column, columnValue, itemdiv, labeldiv, valuediv, columnWidget, columnImportKey);
				else if($.meta.isBinaryColumn(column))
					this._renderFileFormElement(column, columnValue, itemdiv, labeldiv, valuediv, columnWidget);
				else
					this._renderSimpleInputFormElement(column, columnValue, itemdiv, labeldiv, valuediv, columnWidget);
			}
		},
		
		/**
		 * 绘制表单页脚。
		 */
		_renderFormFoot : function($formFoot)
		{
			var _this = this;
			
			var options = this.options;
			
			if(options.readonly)
			{
				_this.element.submit(function(){ return false; });
			}
			else
			{
				var $formOperation = $("<div class='form-operation' />").appendTo($formFoot);
				
				if(options.batchSet)
				{
					$formOperation.addClass("form-operation-batch-set");
					
					var $batchSetPanel = $("<div class='batch-set-panel' />").appendTo($formOperation);
					
					$("<label />").html(options.labels.batchSet.batchCount).appendTo($batchSetPanel);
					$("<input type='text' name='"+options.batchCountParamName+"' class='batch-set-count ui-widget ui-widget-content ui-corner-all' />").appendTo($batchSetPanel);
					
					$("<label />").html(options.labels.batchSet.batchHandleErrorMode).appendTo($batchSetPanel);
					var $errorModeSelect = $("<select name='"+options.batchHandleErrorModeParamName+"' class='ui-widget ui-widget-content ui-corner-all' />").appendTo($batchSetPanel);
					for(var i=0; i<options.batchHandleErrorModeEnum.length; i++)
						$("<option />").attr("value", options.batchHandleErrorModeEnum[i])
							.html(options.labels.batchSet.batchHandleErrorModeEnum[i]).appendTo($errorModeSelect);
					
					var batchSetPanelWidth = $batchSetPanel.outerWidth();
					$batchSetPanel.css("left", (0-batchSetPanelWidth - 4.1*2)+"px").hide();
					
					var $batchSetSwitch = $("<span class='batch-set-switch ui-icon ui-icon-gear'></span>").attr("title", options.labels.batchSet.batchSetSwitchTitle).appendTo($formOperation);
					
					$batchSetSwitch.click(function()
					{
						$batchSetPanel.toggle();
					});
				}
				
				var submitbtn = $("<input type='submit' class='recommended' />").attr("value", _this.options.labels.submit).appendTo($formOperation).button();
				var resetbtn = $("<input type='reset' />").attr("value", _this.options.labels.reset).appendTo($formOperation).button();
				
				var validateOptions = _this._getValidateOptions();
				validateOptions.submitHandler = function(form, event)
				{
					var doSubmit = (_this.options.submit.call(_this.element, submitbtn) != false);
					
					if(doSubmit)
						form.submit();
				};
				validateOptions.invalidHandler = function(event, validator)
				{
					if(_this.options.invalidHandler)
						_this.options.invalidHandler.call(_this.element, event, validator);
				};
				
				_this.element.validate(validateOptions);
				
				resetbtn.click(function()
				{
					if(_this.options.reset.call(_this.element, resetbtn) != false)
					{
						_this.element.validate().resetForm();
						_this.reset();
					}
					
					return false;
				});
			}
		},
		
		/**
		 * 渲染简单且不是导入键的列。
		 */
		_renderSimpleInputFormElement : function(column, columnValue, itemdiv, labeldiv, valuediv, columnWidget)
		{
			var options = this.options;
			var columnName = column.name;
			
			var textElement;
			
			if(column.size && column.size > options.asTextareaLength && $.meta.isTextColumn(column))
			{
				valuediv.addClass("textarea-value");
				
				textElement = $("<textarea class='ui-widget ui-widget-content' />").attr("name", columnName)
					.text((columnValue == undefined || columnValue == null) ? "" : columnValue);
			}
			else
			{
				valuediv.addClass("text-value");
				
				textElement = $("<input type='text' class='ui-widget ui-widget-content' />").attr("name", columnName)
					.val((columnValue == undefined || columnValue == null) ? "" : columnValue);
			}
			
			if(options.readonly)
				textElement.attr("readonly", "readonly");
			
			var dateFormat = "";
			
			if(!options.readonly)
			{
				if($.meta.isDateColumn(column))
					dateFormat = options.dateFormat;
				else if($.meta.isTimeColumn(column))
					dateFormat = options.timeFormat;
				else if($.meta.isTimestampColumn(column))
					dateFormat = options.timestampFormat;
			}
			
			textElement.appendTo(valuediv);
			
			if(dateFormat)
				textElement.after("<div class='input-desc input-desc-date ui-state-disabled'>"+dateFormat+"</div>");
			
			columnWidget.textElement = textElement[0];
			
			columnWidget.getValue = function()
			{
				return $(this.textElement).val();
			};
			columnWidget.setValue = function(value)
			{
				$(this.textElement).val(value);
			};
			columnWidget.active = function()
			{
				$(this.textElement).focus();
			};
			
			this._addValidatorRequired(column, columnName);
		},
		
		/**
		 * 渲染文件上传表单元素。
		 */
		_renderFileFormElement : function(column, columnValue, itemdiv, labeldiv, valuediv, columnWidget)
		{
			valuediv.addClass("file-value");
			
			var _this = this;
			var options = this.options;
			var columnName = column.name;
			
			var fileInputShowName = "showNameOf" + columnName;
			
			var fileInputHidden = $("<input type='hidden' />").attr("name", columnName)
				.val("").appendTo(valuediv);
			
			var fileInputShow = $("<input type='text' class='ui-widget ui-widget-content file-input-show' />").attr("name", fileInputShowName)
				.val("").attr("__columnName", columnName).appendTo(valuediv).attr("readonly", "readonly");
			
			var fileDownloadButton = null;
			var fileInput = null;
			
			if(options.readonly)
			{
				fileDownloadButton = $("<button class='download-button' />").attr("__columnName", columnName)
					.html(options.labels.downloadFile)
					.appendTo(valuediv);
				
				var rawValue = $.meta.getShowableRawValue(columnValue);
				
				if(!rawValue)
					fileDownloadButton.attr("disabled", true);
				
				fileDownloadButton.button();
				
				fileDownloadButton.click(function()
				{
		    		var myColumnName = $(this).attr("__columnName");
					var myColumnInfo = _this._getColumnInfo(myColumnName);
					
	    			_this.options.columnValueDownloadUrl.call(_this.element, myColumnInfo.column,
							myColumnInfo.columnValue);
				});
			}
			else
			{
				fileInputShow.keydown(function(event)
				{
					//Backspace删除列值
					if(event.keyCode == $.ui.keyCode.BACKSPACE)
					{
						var columnName = $(this).attr("__columnName");
						var columnWidget = _this._columnWidgets[columnName];
						
						columnWidget.setValue(null);
					}
				});
				
				var actionGroup = $("<div class='column-action-group' />").appendTo(valuediv);
				
				var fileUploadButton = $("<div class='fileinput-button' />").appendTo(actionGroup);
				fileUploadButton.html(options.labels.uploadFile);
				
				fileInput=$("<input type='file' />").appendTo(fileUploadButton);
				
				var fileInfoDiv = $("<div class='upload-file-info' />").appendTo(valuediv);
				
				fileInput.fileupload(
				{
					__columnName : columnName,
					__columnValue : columnValue,
					url : options.columnValueUploadUrl,
					paramName : options.columnValueUploadParamName,
					success : function(serverFileInfo, textStatus, jqXHR)
					{
						var clientFileName = this.files[0].name;
						
						var columnName = this.__columnName;
						var columnValue = this.__columnValue;
						var columnWidget = _this._columnWidgets[columnName];
						
						columnWidget.setValue($.meta.toShowableValue(serverFileInfo.name, clientFileName), true);
						
						$.fileuploadsuccessHandlerForUploadInfo(fileInfoDiv);
						
						$("<span class='ui-state-default ui-corner-all file-delete'><span class='ui-icon ui-icon-close'></span></span>")
						.appendTo(fileInfoDiv)
						.click(function()
						{
							var serverFileName = fileInputHidden.val();
							
							//恢复初值
							columnWidget.setValue(columnValue);
							
							if(serverFileInfo.name)
							{
								var param = {};
								param[options.columnValueDeleteParamName] = serverFileInfo.name;
								
								$.post(options.columnValueDeleteUrl, param);
							}
						});
					}
				})
				.bind('fileuploadadd', function (e, data)
				{
					$.fileuploadaddHandlerForUploadInfo(e, data, fileInfoDiv);
				})
				.bind('fileuploadprogressall', function (e, data)
				{
					$.fileuploadprogressallHandlerForUploadInfo(e, data, fileInfoDiv);
				});
				
				var moreActionSelect = $("<select />").appendTo(actionGroup);
				var downloadOption = $("<option value='download' />").attr("__columnName", columnName).html(options.labels.downloadFile).appendTo(moreActionSelect);
				var delOption = $("<option value='del' />").attr("__columnName", columnName).html(options.labels.del).appendTo(moreActionSelect);
				moreActionSelect.selectmenu(
				{
					appendTo: valuediv,
					classes:
					{
				          "ui-selectmenu-button": "ui-button-icon-only splitbutton-select"
				    },
				    select: function(event, ui)
			    	{
			    		var action = $(ui.item).attr("value");
			    		var myColumnName = $(ui.item.element).attr("__columnName");
						var myColumnInfo = _this._getColumnInfo(myColumnName);
						
			    		if("download" == action)
			    		{
			    			var rawValue = $.meta.getShowableRawValue(myColumnInfo.columnValue);
			    			
			    			if(rawValue)
			    				_this.options.columnValueDownloadUrl.call(_this.element, myColumnInfo.column,
										myColumnInfo.columnValue);
			    		}
			    		else if("del" == action)
			    		{
			    			_this.options.deleteSingleColumnValue.call(_this.element, myColumnInfo.column,
									myColumnInfo.columnValue);
			    		}
			    	}
				});
				
				actionGroup.controlgroup({"items" : {"button" : "div"}});
				
				columnWidget.fileInfoDiv = fileInfoDiv[0];
			}
			
			columnWidget.fileInputHidden = fileInputHidden[0];
			columnWidget.fileInputShow = fileInputShow[0];
			columnWidget.fileDownloadButtonElement = (fileDownloadButton ? fileDownloadButton[0] : null);
			columnWidget.fileInputElement = (fileInput ? fileInput[0] : null);
			
			columnWidget.getValue = function()
			{
				if(options.fileColumnReturnShowableValue)
				{
					var value = $(this.fileInputHidden).val();
					var labelValue = (value ? options.fileColumnLabelValue : "");
					
					return $.meta.toShowableValue(value, labelValue);
				}
				else
					return $(this.fileInputHidden).val();
			};
			columnWidget.setValue = function(value, reserveFileInfo)
			{
				if(value && options.fileColumnLabelValue != null && !$.meta.isShowableValue(value))
					value = $.meta.toShowableValue(value, options.fileColumnLabelValue);
				
				var rawValue = $.meta.getShowableRawValue(value);
				var labelValue = $.meta.getShowableLabelValue(value);
				
				$(this.fileInputHidden).val(rawValue ? rawValue : "");
				
				if(labelValue)
					$(this.fileInputShow).val(labelValue);
				else
					$(this.fileInputShow).val((rawValue ? rawValue : ""));
				
				if(this.fileInfoDiv)
				{
					if(reserveFileInfo)
						;
					else
						$(this.fileInfoDiv).empty();
				}
			};
			columnWidget.active = function()
			{
				if(this.fileDownloadButtonElement)
					$(this.fileDownloadButtonElement).focus();
				
				if(this.fileInputElement)
					$(this.fileInputElement).focus();
			};
			
			columnWidget.setValue(columnValue);
			
			this._addValidatorRequired(column, fileInputShowName);
		},
		
		/**
		 * 渲染导入键表单元素。
		 */
		_renderImportKeyColumnFormElement : function(column, columnValue, itemdiv, labeldiv, valuediv, columnWidget, importKey)
		{
			valuediv.addClass("single-value");
			
			var _this = this;
			var options = this.options;
			var table = options.table;
			var columnName = column.name;
			
			var textinput=$("<input type='text' class='ui-widget ui-widget-content' />").attr("name", columnName)
							.attr("value", (columnValue || "")).appendTo(valuediv);
			
			var buttonElement=$("<input type='button' />").attr("__columnName", columnName);
			
			//只读
			if(options.readonly)
			{
				buttonElement.attr("value", _this.options.labels.view).appendTo(valuediv).button();
				
				if(!columnValue)
					buttonElement.attr("disabled", true);
				else
				{
					buttonElement.click(function()
					{
			    		var myColumnName = $(this).attr("__columnName");
						var myColumnInfo = _this._getColumnInfo(myColumnName);
						
						_this.options.viewColumnValue.call(_this.element, myColumnInfo.column,
								myColumnInfo.columnValue);
					});
				}
			}
			//可编辑
			else
			{
				buttonElement.attr("value", _this.options.labels.select).appendTo(valuediv).button();
				
				buttonElement.click(function()
				{
		    		var myColumnName = $(this).attr("__columnName");
					var myColumnInfo = _this._getColumnInfo(myColumnName);
					
					_this.options.selectSingleColumnValue.call(_this.element, myColumnInfo.column,
							myColumnInfo.columnValue);
				});
			}
			
			columnWidget.textinput = textinput[0];
			columnWidget.buttonElement = buttonElement[0];
			
			columnWidget.setValue = function(value)
			{
				$(this.textinput).val(value);
				this.value = value;
			};
			columnWidget.active = function()
			{
				$(this.buttonElement).focus().click();
			};
			
			this._addValidatorRequired(column, columnName);
		},
		
		_getColumnInfo : function(columnName)
		{
			var column = $.meta.column(this.options.table, columnName);
			var columnWidget = this._columnWidgets[columnName];
			var columnValue = columnWidget.getValue();
			
			var columnInfo = 
			{
				"column" : column,
				"columnWidget" : columnWidget,
				"columnValue" : columnValue
			};
			
			return columnInfo;
		},
		
		/**
		 * 判断列是否是忽略列。
		 */
		_isIgnoreColumnName : function(column, columnIndex)
		{
			return (this.options.renderColumn.call(this, column, columnIndex) == false);
		},
		
		/**
		 * 添加required验证规则。
		 */
		_addValidatorRequired : function(column, inputName)
		{
			if($.meta.isRequiredColumn(column))
			{
				this._addValidator(inputName, "required", this.options.labels.validation.required);
				return true;
			}
			else
				return false;
		},
		
		/**
		 * 添加验证规则
		 */
		_addValidator : function(name, rule, message)
		{
			var validateOptions = this._getValidateOptions();
			
			validateOptions.rules[name] = rule;
			
			if(message)
				validateOptions.messages[name] = message;
		},
		
		/**
		 * 获取验证选项。
		 */
		_getValidateOptions : function()
		{
			var validateOptions = (this.validateOptions || (this.validateOptions = 
				{
					rules : {},
					messages : {},
					errorPlacement : function(error, element)
					{
						error.appendTo(element.closest(".form-item-value"));
					}
				}
			));
			
			var rules = (validateOptions.rules || (validateOptions.rules = {}));
			rules[this.options.batchCountParamName] = { "number" : true, "min" : 0 };
			
			return validateOptions;
		}
	});
})
(jQuery);
