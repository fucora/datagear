<#include "../include/import_global.ftl">
<#include "../include/html_doctype.ftl">
<#--
titleMessageKey 标题标签I18N关键字，不允许null
formAction 表单提交action，允许为null
readonly 是否只读操作，允许为null
-->
<#assign formAction=(formAction!'#')>
<#assign readonly=(readonly!false)>
<html>
<head>
<#include "../include/html_head.ftl">
<title><#include "../include/html_title_app_name.ftl"><@spring.message code='${titleMessageKey}' /></title>
</head>
<body>
<div id="${pageId}" class="page-form page-form-driverEntity">
	<form id="${pageId}-form" action="${contextPath}/driverEntity/${formAction}" method="POST">
		<div class="form-head"></div>
		<div class="form-content">
			<input type="hidden" name="id" value="${(driverEntity.id)!''?html}" />
			<div class="form-item">
				<div class="form-item-label">
					<label><@spring.message code='driverEntity.displayName' /></label>
				</div>
				<div class="form-item-value">
					<input type="text" name="displayName" value="${(driverEntity.displayName)!''?html}" class="ui-widget ui-widget-content" />
				</div>
			</div>
			<div class="form-item">
				<div class="form-item-label">
					<label><@spring.message code='driverEntity.driverClassName' /></label>
				</div>
				<div class="form-item-value">
					<input type="text" name="driverClassName" value="${(driverEntity.driverClassName)!''?html}" class="ui-widget ui-widget-content" />
				</div>
			</div>
			<div class="form-item">
				<div class="form-item-label">
					<label><@spring.message code='driverEntity.displayDesc' /></label>
				</div>
				<div class="form-item-value">
					<textarea name="displayDesc" class="ui-widget ui-widget-content">${(driverEntity.displayDescMore)!''?html}</textarea>
				</div>
			</div>
			<div class="form-item">
				<div class="form-item-label">
					<label><@spring.message code='driverEntity.driverFiles' /></label>
				</div>
				<div class="form-item-value">
					<div class="ui-widget ui-widget-content input driver-files">
					</div>
					<#if !readonly>
					<div class="driver-upload-parent">
						<div class="ui-widget ui-corner-all ui-button fileinput-button"><@spring.message code='upload' /><input type="file"></div>
						<div class="upload-file-info"></div>
					</div>
					</#if>
				</div>
			</div>
		</div>
		<div class="form-foot" style="text-align:center;">
			<#if !readonly>
			<input type="submit" value="<@spring.message code='save' />" class="recommended" />
			&nbsp;&nbsp;
			<input type="reset" value="<@spring.message code='reset' />" />
			</#if>
		</div>
	</form>
</div>
<#include "../include/page_js_obj.ftl" >
<#include "../include/page_obj_form.ftl">
<script type="text/javascript">
(function(po)
{
	$.initButtons(po.element());
	
	po.driverFiles = function(){ return this.element(".driver-files"); };
	po.fileUploadInfo = function(){ return this.element(".upload-file-info"); };
	
	po.url = function(action)
	{
		return "${contextPath}/driverEntity/" + action;
	};
	
	po.getDriverEntityId = function()
	{
		return po.element("input[name='id']").val();
	};
	
	po.renderDriverFiles = function(fileInfos)
	{
		po.driverFiles().empty();
		
		for(var i=0; i<fileInfos.length; i++)
		{
			var $fileInfo = $("<div class='ui-widget ui-widget-content ui-corner-all driver-file' />")
				.appendTo(po.driverFiles());
			
			<#if !readonly>
			$("<input type='hidden' />").attr("name", "driverLibraryName").attr("value", fileInfos[i].name).appendTo($fileInfo);
			
			var $deleteIcon = $("<span class='ui-icon ui-icon-close driver-file-icon' title='<@spring.message code='delete' />' />")
				.attr("driverFile", fileInfos[i].name).appendTo($fileInfo);
			
			$deleteIcon.click(function()
			{
				var driverFile = $(this).attr("driverFile");
				po.confirm("<@spring.message code='driverEntity.confirmDeleteDriverFile' />",
				{
					"confirm" : function()
					{
						var id = po.getDriverEntityId();
						$.post(po.url("deleteDriverFile"), {"id" : id, "file" : driverFile}, function(operationMessage)
						{
							po.renderDriverFiles(operationMessage.data);
						});
					}
				});
			});
			</#if>
			
			$("<a class='driver-file-info' href='javascript:void(0);' />").attr("title", fileInfos[i].name).text(fileInfos[i].name)
				.appendTo($fileInfo)
				.click(function()
				{
					var id = po.getDriverEntityId();
					var driverFile = $(this).text();
					
					$.postOnForm(po.url("downloadDriverFile"),
					{
						data : {"id" : id, "file" : driverFile}
					});
				});
		}
	};
	
	po.refreshDriverFiles = function()
	{
		var id = po.getDriverEntityId();
		
		if(id != "")
		{
			$.getJSON(po.url("listDriverFile"), {"id" : id}, function(fileInfos)
			{
				po.renderDriverFiles(fileInfos);
			});
		}
	};
	
	<#if !readonly>
	po.element(".fileinput-button").fileupload(
	{
		url : po.url("uploadDriverFile"),
		paramName : "file",
		success : function(serverFileInfos, textStatus, jqXHR)
		{
			$.fileuploadsuccessHandlerForUploadInfo(po.fileUploadInfo(), true);
			
			po.renderDriverFiles(serverFileInfos);
			
			$.tipSuccess("<@spring.message code='uploadSuccess' />");
		}
	})
	.bind('fileuploadadd', function (e, data)
	{
		$.fileuploadaddHandlerForUploadInfo(e, data, po.fileUploadInfo());
	})
	.bind('fileuploadprogressall', function (e, data)
	{
		$.fileuploadprogressallHandlerForUploadInfo(e, data, po.fileUploadInfo());
	});

	po.form().validate(
	{
		rules :
		{
			displayName : "required",
			driverClassName : "required"
		},
		messages :
		{
			displayName : "<@spring.message code='validation.required' />",
			driverClassName : "<@spring.message code='validation.required' />"
		},
		submitHandler : function(form)
		{
			$(form).ajaxSubmit(
			{
				success : function()
				{
					po.pageParamCallAfterSave(true);
				}
			});
		},
		errorPlacement : function(error, element)
		{
			error.appendTo(element.closest(".form-item-value"));
		}
	});
	</#if>
	
	<#if formAction != 'saveAdd'>
	po.refreshDriverFiles();
	</#if>
})
(${pageId});
</script>
</body>
</html>