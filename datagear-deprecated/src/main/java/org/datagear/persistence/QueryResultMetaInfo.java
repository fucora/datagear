/*
 * Copyright 2018 datagear.tech. All Rights Reserved.
 */

package org.datagear.persistence;

import java.util.List;

import org.datagear.model.Model;

/**
 * 查询结果元信息。
 * 
 * @author datagear@163.com
 *
 */
public class QueryResultMetaInfo
{
	/** 结果集对应的模型 */
	private Model model;

	/** 列结果集属性路径列表 */
	private List<QueryColumnMetaInfo> queryColumnMetaInfos;

	public QueryResultMetaInfo()
	{
		super();
	}

	public QueryResultMetaInfo(Model model, List<QueryColumnMetaInfo> queryColumnMetaInfos)
	{
		super();
		this.model = model;
		this.queryColumnMetaInfos = queryColumnMetaInfos;
	}

	public Model getModel()
	{
		return model;
	}

	public void setModel(Model model)
	{
		this.model = model;
	}

	public List<QueryColumnMetaInfo> getQueryColumnMetaInfos()
	{
		return queryColumnMetaInfos;
	}

	public void setQueryColumnMetaInfos(List<QueryColumnMetaInfo> queryColumnMetaInfos)
	{
		this.queryColumnMetaInfos = queryColumnMetaInfos;
	}

	@Override
	public String toString()
	{
		return getClass().getSimpleName() + " [model=" + model + ", queryColumnMetaInfos=" + queryColumnMetaInfos + "]";
	}
}
