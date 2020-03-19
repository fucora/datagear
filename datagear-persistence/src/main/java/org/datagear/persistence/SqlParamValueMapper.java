/*
 * Copyright 2018 datagear.tech. All Rights Reserved.
 */

package org.datagear.persistence;

import java.sql.Connection;

import org.datagear.meta.Column;
import org.datagear.meta.Table;
import org.datagear.util.SqlParamValue;

/**
 * 列值至{@linkplain SqlParamValue}映射器。
 * 
 * @author datagear@163.com
 *
 */
public interface SqlParamValueMapper
{
	/**
	 * 映射。
	 * 
	 * @param cn
	 * @param table
	 * @param column
	 * @param value
	 * @return
	 * @throws SqlParamValueMapperException
	 */
	SqlParamValue map(Connection cn, Table table, Column column, Object value) throws SqlParamValueMapperException;
}