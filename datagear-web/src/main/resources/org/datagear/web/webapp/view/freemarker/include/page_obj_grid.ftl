<#--
表格JS片段。

依赖：
page_js_obj.jsp
-->
<script type="text/javascript">
(function(po)
{
	po.elementTable = function(){ return this.element("#${pageId}-table"); };
	
	//计算表格高度
	po.calTableHeight = function()
	{
		var height =  po.element("> .content").height() - 50;
		return height;
	};
	
	po.renderCheckColumn = function(data, type, row, meta)
	{
		return "<div class='ui-widget ui-widget-content ui-corner-all checkbox'><span class='ui-icon ui-icon-check'></span></div>";
	};
	
	/**
	 * 默认po.buildDataTableSettingsAjax请求参数实现。
	 */
	po.dataTableAjaxParam = function()
	{
		var param = {};
		
		if(po.searchParam)
			$.extend(param, po.searchParam);
		else if(po.getSearchParam)
			$.extend(param, po.getSearchParam());
		
		if(po.pagingParam)
			$.extend(param, po.pagingParam);
		else if(po.getPagingParam)
			$.extend(param, po.getPagingParam());
		
		return param;
	};
	
	/**
	 * 默认po.buildDataTableSettingsAjax请求成功回调实现。
	 */
	po.dataTableAjaxSuccess = function(pagingData, textStatus, jqXHR)
	{
		if(po.refreshPagination)
			po.refreshPagination(pagingData.total, pagingData.page, pagingData.pageSize);
		
		po.pageParamCall("dataTableAjaxSuccess", pagingData, textStatus, jqXHR);
	};
	
	/**
	 * 集成data_page_obj_searchform_js.jsp的默认实现。
	 */
	po.search = function(searchParam)
	{
		po.searchParam = searchParam;
		
		po.refresh();
	};
	
	/**
	 * 集成page_obj_pagination.jsp的默认实现。
	 */
	po.paging = function(pagingParam)
	{
		po.pagingParam = pagingParam;
		po.refresh();
		
		return false;
	};

	po.confirmDeleteEntities = function(url, rows, idPropertyName)
	{
		po.confirm("<@spring.message code='confirmDelete' />",
		{
			"confirm" : function()
			{
				$.postJson(url, $.propertyValue(rows, (idPropertyName || "id")), function()
				{
					po.refresh();
				});
			}
		});
	};
	
	po.getOrdersOnName = function($table)
	{
		$table = ($table || po.elementTable());
		var dataTable = $table.DataTable();
		var settings = dataTable.settings();
		var orders = dataTable.order();
		
		var nameOrder = [];
		
		for(var i=0; i<orders.length; i++)
		{
			var name = $.getDataTableColumnName(settings, orders[i][0]);
			nameOrder[i] = { "name" : name, "type" : orders[i][1] };
		}
		
		return nameOrder;
	};
	
	/**
	 * 构建ajax数据表格选项。
	 * 此ajax选项支持两个回调函数：
	 *   po.dataTableAjaxParam() 用于扩展ajax请求参数；
	 *   po.dataTableAjaxSuccess(pagingData, textStatus, jqXHR) ajax成功回调函数；
	 * @param columns 必选，列元数据
	 * @param url 必选，ajax请求URL
	 * @param ajaxSuccessCallback 可选，ajax成功回调函数，function(pagingData, textStatus, jqXHR){}
	 * @param settings 可选，其他选项
	 */
	po.buildDataTableSettingsAjax = function(columns, url, settings)
	{
		settings = $.extend(
		{
			"serverSide": true,
			"columns" : columns,
			"ajax" : function(data, callback, settings)
			{
				var nameOrder = [];
				
				for(var i=0; i<data.order.length; i++)
				{
					var name = $.getDataTableColumnName(settings, data.order[i].column);
					nameOrder[i] = { "name" : name, "type" : data.order[i].dir };
				}
				
				var myData = po.dataTableAjaxParam();
				
				var param = $.extend({ "orders" : nameOrder }, myData);
				
				$.ajaxJson(
				{
					url : url,
					dataType : "json",
					type : "POST",
					data : param,
					success : function(data, textStatus, jqXHR)
					{
						var isPagingData = (data.page != undefined && data.pageSize != undefined);
						
						if(isPagingData)
						{
							data.data = data.items;
							callback(data);
						}
						else
						{
							var tableData = { "data" : data };
							callback(tableData);
						}
						
						if(po.dataTableAjaxSuccess)
							po.dataTableAjaxSuccess(data, textStatus, jqXHR);
					}
				});
			}
		},
		settings);
		
		return po.buildDataTableSettings(settings);
	};
	
	/**
	 * 构建本地数据表格选项。
	 * @param columns 必选，列元数据
	 * @param data 可选，初始数据
	 * @param settings 可选，其他选项
	 */
	po.buildDataTableSettingsLocal = function(columns, data, settings)
	{
		settings = $.extend(
		{
			"columns" : columns,
			"data" : (data ? data : [])
		}, 
		settings);
		
		return po.buildDataTableSettings(settings);
	};
	
	po.removeCheckColumnProperty = function(data)
	{
		if(!data)
			return data;
		
		var datas = ($.isArray(data) ? data : [data]);
		
		for(var i=0; i<datas.length; i++)
		{
			var ele = datas[i];
			for(var p in ele)
			{
				if(p == po.TABLE_CHECK_COLUMN_NAME)
					delete ele[p];
			}
		}
		
		return data;
	};
	
	po.TABLE_CHECK_COLUMN_NAME = "___DATA_GEAR_CHECK_COLUMN";
	
	/**
	 * 构建表格选项。
	 * @param settings 必选，选项
	 */
	po.buildDataTableSettings = function(settings)
	{
		var newColumns = [
				{
					title : "<@spring.message code='select' />", data : po.TABLE_CHECK_COLUMN_NAME, defaultContent: "", width : "3em",
					orderable : false, render : po.renderCheckColumn, className : "column-check"
				}
			];
		newColumns = newColumns.concat(settings.columns);
		
		var orderColumn = 1;
		for(; orderColumn < newColumns.length; orderColumn++)
		{
			var column = newColumns[orderColumn];
			
			if(column.visible == null || column.visible)
				break;
		}
		
		settings = $.extend(
		{
			"scrollX": true,
			"autoWidth": true,
			"scrollY" : po.calTableHeight(),
	        "scrollCollapse": false,
			"paging" : false,
			"searching" : false,
			"select" : { style : 'os' },
			"order": [[orderColumn, "asc"]],
			"fixedColumns": { leftColumns: 1 },
		    "language":
		    {
				"emptyTable": "<@spring.message code='dataTables.noData' />",
				"zeroRecords" : "<@spring.message code='dataTables.zeroRecords' />"
			},
			"createdRow": function(row, data, dataIndex)
			{
				var $table = this;
				
				$(".column-check", row).click(function(event)
				{
					event.stopPropagation();
					
					var dataTable = $table.DataTable();
					
					var $tr = $(this).closest("tr");
					var isSelected = $tr.hasClass("selected");
					
					if(event.shiftKey)
					{
						var myIndex = $tr.index();
						
						var rangeStart = -1;
						var rangeEnd = -1;
						
						var $preTr;
						
						var test = $tr.prevUntil(":not(.selected)");
						
						if(isSelected)
							$preTr = $tr.prevUntil(":not(.selected)").last();
						else
							$preTr = $tr.prevAll(".selected:first");
						
						if($preTr.length > 0)
						{
							rangeStart = $preTr.index();
							rangeEnd = myIndex + 1;
						}
						else
						{
							var $nextTr;
							
							if(isSelected)
								$nextTr = $tr.nextUntil(":not(.selected)").last();
							else
								$nextTr = $tr.nextAll(".selected:first");
							
							if($nextTr.length > 0)
							{
								rangeStart = myIndex;
								rangeEnd = $nextTr.index() + 1;
							}
							else
							{
								rangeStart = myIndex;
								rangeEnd = myIndex + 1;
							}
						}
						
						var selectedIndexes = [];
						
						for(var i=rangeStart; i<rangeEnd; i++)
							selectedIndexes.push(i);
						
						if(isSelected)
							dataTable.rows(selectedIndexes).deselect();
						else
							dataTable.rows(selectedIndexes).select();
					}
					else
					{
						if(isSelected)
							dataTable.row($tr).deselect();
						else
						{
							dataTable.row($tr).select();
						}
					}
				})
				//固定选择列后hover效果默认不能同步，需要自己实现
				.hover(
				function(event)
				{
					var $tableContainer = $($table.DataTable().table().container());
					
					var rowIndex = $(this).parent().index() + 1;
					po.element(".dataTable", $tableContainer).each(function()
					{
						$("tr:eq("+rowIndex+")", this).addClass("hover");
					});
				},
				function(event)
				{
					var rowIndex = $(this).parent().index() + 1;
					var $tableContainer = $($table.DataTable().table().container());
					
					po.element(".dataTable", $tableContainer).each(function()
					{
						$("tr:eq("+rowIndex+")", this).removeClass("hover");
					});
				});
				
				//固定选择列后hover效果默认不能同步，需要自己实现
				$(row).hover(
				function(event)
				{
					var rowIndex = $(this).index() + 1;
					var $tableContainer = $($table.DataTable().table().container());
					
					po.element(".dataTable", $tableContainer).each(function()
					{
						$("tr:eq("+rowIndex+")", this).addClass("hover");
					});
				},
				function()
				{
					var rowIndex = $(this).index() + 1;
					var $tableContainer = $($table.DataTable().table().container());
					
					po.element(".dataTable", $tableContainer).each(function()
					{
						$("tr:eq("+rowIndex+")", this).removeClass("hover");
					});
				});
			}
		},
		settings);
		
		settings.columns = newColumns;
		
		return settings;
	};
	
	po.initDataTable = function(tableSettings, $table)
	{
		if($table == undefined)
			$table = po.elementTable();
		
		$table.dataTable(tableSettings);
		
		var dataTable = $table.DataTable();
		
		$(".column-check", $(dataTable.table().header())).click(function()
		{
			var $this = $(this);
			var checked = $this.hasClass("all-checked");
			
			var rows = $table.DataTable().rows();
			
			if(checked)
			{
				rows.deselect();
				$this.removeClass("all-checked");
			}
			else
			{
				rows.select();
				$this.addClass("all-checked");
			}
		});
		
		//不加这一行，对话框中的初始空数据客户端表格添加记录后表头“选择”点击不起作用
		if(tableSettings.fixedColumns)
			dataTable.fixedColumns().relayout();
	};
	
	po.refresh = function()
	{
		po.elementTable().DataTable().draw();
	};
	
	po.setTableData = function(data, dataTable)
	{
		dataTable = (dataTable || po.elementTable().DataTable());
		$.setDataTableData(dataTable, data);
	};
	
	//单选处理函数
	po.executeOnSelect = function(callback)
	{
		var rows = po.elementTable().DataTable().rows('.selected');
		var rowsData = po.getRowsData(rows);
		
		if(!rowsData || rowsData.length != 1)
			$.tipInfo("<@spring.message code='pleaseSelectOnlyOneRow' />");
		else
		{
			callback.call(po, rowsData[0], po.getRowsIndex(rows)[0]);
		}
	};
	
	//多选处理函数
	po.executeOnSelects = function(callback)
	{
		var rows = po.elementTable().DataTable().rows('.selected');
		var rowsData = po.getRowsData(rows);
		
		if(!rowsData || rowsData.length < 1)
			$.tipInfo("<@spring.message code='pleaseSelectAtLeastOneRow' />");
		else
		{
			callback.call(po, rowsData, po.getRowsIndex(rows));
		}
	};
	
	//获取选中数据
	po.getSelectedData = function()
	{
		var rows = po.elementTable().DataTable().rows('.selected');
		var rowsData = po.getRowsData(rows);
		
		return (rowsData || []);
	};
	
	po.getRowsData = function(rows)
	{
		if(rows == undefined)
			rows = po.elementTable().DataTable().rows();
		
		var tableRowsData = rows.data();
		
		var rowsData = [];
		for(var i=0; i<tableRowsData.length; i++)
			rowsData[i] = tableRowsData[i];
		
		return rowsData;
	};
	
	po.getRowsIndex = function(rows)
	{
		if(rows == undefined)
			rows = po.elementTable().DataTable().rows();
			
		var indexes = rows.indexes();
		
		return indexes;
	};
	
	po.addRowData = function(data)
	{
		var table = po.elementTable().DataTable();
		
		if($.isArray(data))
			table.rows.add(data).draw();
		else
			table.row.add(data).draw();
	};
	
	po.setRowData = function(rowIndex, data)
	{
		var table = po.elementTable().DataTable();
		
		if(rowIndex.length != undefined)
		{
			for(var i=0; i< rowIndex.length; i++)
			{
				table.row(rowIndex[i]).data(data[i]).draw();
			}
		}
		else
			table.row(rowIndex).data(data).draw();
	};
	
	po.deleteRow = function(rowIndex)
	{
		var table = po.elementTable().DataTable();
		
		if(rowIndex.length != undefined)
		{
			table.rows(rowIndex).remove().draw();
		}
		else
			table.row(rowIndex).remove().draw();
	};
	
	po.deleteAllRow = function()
	{
		po.elementTable().DataTable().rows().remove();
	};
	
	po.deleteSelectedRows = function()
	{
		var dataTable = po.elementTable().DataTable();
		
		var indexes = dataTable.rows('.selected').indexes();
		dataTable.rows(indexes).remove().draw();
	};
	
	//获取表格元素的父元素
	po.dataTableParent = function(dataTable)
	{
		if(!dataTable)
			dataTable = po.elementTable().DataTable();
		
		var $tableParent = $(dataTable.table().body()).parent().parent();
		return $tableParent;
	};
	
	po.expectedResizeDataTableElements = [po.elementTable()[0]];
	
	po.calChangedDataTableHeight = function()
	{
		var changedTableHeight = po.calTableHeight();
		
		if(changedTableHeight == po.prevTableHeight)
		{
			po.prevTableHeight = changedTableHeight;
			changedTableHeight = null;
		}
		else
			po.prevTableHeight = changedTableHeight;
		
		return changedTableHeight;
	};
	
	po.bindResizeDataTable = function()
	{
		$.bindResizeDataTableHandler(po.expectedResizeDataTableElements,
			function()
			{
				return po.calChangedDataTableHeight();
			});
	};
})
(${pageId});
</script>
