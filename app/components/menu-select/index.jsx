import React, { useState, useMemo, useEffect, useImperativeHandle } from 'react';
import { Input, Menu, Dropdown } from 'antd';
import { DownOutlined, RightOutlined, SearchOutlined, CheckOutlined } from '@ant-design/icons';
import noop from 'lodash/noop';
import styles from './styles.less';

export default (props) => {

  const {
    style = {},
    overlayWidth,
    selectionStyle = {},
    options = [],
    lablePropsNames = {
      name: 'name',
      description: 'description'
    },
    valuePropName = 'value',
    value = undefined,
    bodyStyle,
    menuSelectfooter,
    onChange = noop,
    setActive = noop,
    showSearch=false,
    searchPlaceholder='',
    searchKey=lablePropsNames.name,
    maxLen,
    selectRef,
    actionContent
  } = props || {};

  const [ visible, setVisible ] = useState(false);
  const [ showOptions, setShowOptions ] = useState([]);

  useEffect(() => {
    setShowOptions(options.slice(0, maxLen));
  }, [ options, maxLen ]);

  const onSearch = (e) => {
    const keyword = e.target.value;
    const reg = new RegExp(keyword, 'gi');
    const filterOptions = options.filter((it) => !keyword || reg.test(it[searchKey]));
    setShowOptions(filterOptions.slice(0, maxLen));
  };
  
  const menu = useMemo(() => {
    const { name } = lablePropsNames;
    return (
      <div className={styles.menuSelectList}>
        {
          showSearch && (
            <div className='menu-select-header'>
              <Input placeholder={searchPlaceholder} suffix={<SearchOutlined/>} onChange={onSearch} />
            </div>
          )
        }
        <div className='menu-select-body' style={bodyStyle}>
          <Menu 
            selectedKeys={[value]} 
            onClick={({ key }) => onChange(key)}
          >
            {
              showOptions.map((it) => (
                <Menu.Item key={it[valuePropName]}>
                  <div className='content'>
                    <span className='name idcos-text-ellipsis'>{it[name]}</span>
                    {
                      it[valuePropName] === value && <CheckOutlined className='selected-icon'/>
                    }
                  </div>
                </Menu.Item>
              ))
            }
          </Menu>
        </div>
        {
          menuSelectfooter ? (
            <div className='menu-select-footer'>
              {menuSelectfooter}
            </div>
          ) : null
        }
      </div>
    );
  });

  const name = useMemo(() => {
    const { name } = lablePropsNames;
    const data = options.find(it => it[valuePropName] === value) || {};
    return data[name];
  });

  useImperativeHandle(selectRef, () => ({
    setVisible
  }));  

  return (
    <div className={styles.menuSelect} style={style}>
      <Dropdown 
        overlay={menu} 
        trigger={['click']} 
        visible={visible} 
        overlayStyle={{ width: overlayWidth || '100%' }}
        onVisibleChange={(e) => {
          setVisible(e); 
          setActive(e); 
        }}
      >
        <div>
          {!!actionContent ? actionContent : (
            <div className='selection' style={selectionStyle}>
              <div className={`label fn-ellipsis ${visible ? 'selecting' : ''}`}>
                {name}
              </div>
              <div className='icon'>
                { visible ? <DownOutlined /> : <RightOutlined /> }
              </div>
            </div>
          )}
        </div>
      </Dropdown>
    </div>
  );
};
