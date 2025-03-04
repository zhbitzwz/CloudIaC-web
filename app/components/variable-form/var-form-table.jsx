import React, { useRef, useEffect, useState } from 'react';
import { 
  Collapse, Input, Checkbox, Tag, notification, Button, Space, Dropdown, Menu
} from 'antd';
import { DownOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isArray from 'lodash/isArray';
import intersectionBy from 'lodash/intersectionBy';
import classnames from 'classnames';
import { useEventEmitter } from 'ahooks';
import EditableTable from 'components/Editable';
import tplAPI from 'services/tpl';
import ImportVarsModal from './components/import-vars-modal';
import ImportResourceAccountModal from './components/import-resource-account-modal';
import SelectTypeValue from './components/select-type-value';
import ResourceAccountFormTable from './resource-account-form-table';
import { SCOPE_ENUM, VAR_TYPE_ENUM } from 'constants/types';
import { t } from 'utils/i18n';

const EditableTableFooter = styled.div`
  margin-top: 16px;
  text-align: right;
`;

const VarFormTable = (props) => {

  const {
    formVarRef,
    varList,
    setVarList,
    defalutVarGroupList,
    varGroupList,
    setVarGroupList,
    readOnly = false,
    defaultScope,
    defalutVarList,
    fetchParams,
    type,
    canImportVar = false,
    canImportResourceAccount = false,
    expandCollapse,
    setExpandCollapse
  } = props;

  const defalutVarListRef = useRef([]);
  const varDataRef = useRef(varList);
  const [ importVars, setImportVars ] = useState([]);
  const [ importModalVisible, setImportModalVisible ] = useState(false);

  useEffect(() => {
    varDataRef.current = varList;
  }, [varList]);

  useEffect(() => {
    defalutVarListRef.current = defalutVarList;
  }, [defalutVarList]);

  useEffect(() => {
    if (canImportVar && fetchParams) {
      fetchImportVars();
    }
  }, [ fetchParams, canImportVar ]);

  const fetchImportVars = async () => {
    const { orgId, repoRevision, repoId, repoType, vcsId, workdir } = fetchParams;
    const params = { orgId, repoRevision, repoId, repoType, vcsId, workdir };
    try {
      const res = await tplAPI.listImportVars(params);
      if (res.code !== 200) {
        throw new Error(res.message);
      }
      setImportVars(res.result || []);
    } catch (e) {
      notification.error({
        message: t('define.message.getFail'),
        description: e.message
      });
    }
  };

  const fields = [
    {
      id: 'id',
      editable: true,
      column: {
        className: 'fn-hide-column',
        width: 0
      }
    },
    {
      id: 'options',
      editable: true,
      column: {
        className: 'fn-hide-column',
        width: 0
      }
    },
    {
      id: 'overwrites',
      editable: true,
      column: {
        className: 'fn-hide-column',
        width: 0
      }
    },
    {
      title: t('define.variable.objectType'),
      id: 'scope',
      column: {
        width: 200,
        render: (text) => {
          return (
            <div style={{ width: 110 }}>
              <Tag style={{ marginRight: 0 }}>{SCOPE_ENUM[text]}</Tag>
            </div>
          );
        }
      }
    },
    {
      title: 'key',
      id: 'name',
      editable: true,
      column: {
        width: 200
      },
      renderFormInput: (record) => {
        const { overwrites } = record;
        return <Input placeholder={t('define.form.input.placeholder')} disabled={overwrites || readOnly} />;
      },
      formItemProps: {
        rules: [
          { required: true, message: t('define.form.input.placeholder') },
          {
            validator(_, value) {
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  const sameList = (varDataRef.current || []).filter(it => it.name === value);
                  if (value && sameList.length > 1) {
                    reject(new Error(t('define.variable.sameKeyError')));
                  }
                  resolve();
                }, 300);
              });
            }
          }
        ]
      }
    },
    {
      title: 'value',
      id: 'value',
      editable: true,
      column: {
        width: 210
      },
      formItemProps: {
        dependencies: [ 'sensitive', 'description' ],
        rules: [
          (form) => ({
            validator(_, value) {
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  const { sensitive, id } = form.getFieldsValue();
                  if (!(sensitive && id) && !value) {
                    reject(new Error(t('define.form.input.placeholder')));
                  }
                  resolve();
                }, 300);
              });
            }
          })
        ]
      },
      renderFormInput: (record, { value, onChange }, form) => {
        const { id, sensitive, options, scope } = record;
        if (sensitive) {
          return (
            <Input.Password
              value={readOnly ? '******' : value}
              autoComplete='new-password'
              placeholder={id ? t('define.emptyValueSave.placeholder') : t('define.form.input.placeholder')}
              visibilityToggle={false}
              disabled={readOnly}
            />
          );
        } else {
          return (
            isArray(options) ? (
              <SelectTypeValue
                disabled={readOnly}
                form={form}
                inputOptions={options}
                isSameScope={scope === defaultScope}
                value={value}
                onChange={onChange}
                placeholder={t('define.form.select.placeholder')}
              />
            ) : (
              <Input placeholder={t('define.form.input.placeholder')} disabled={readOnly}/>
            )
          );
        }
      }
    },
    {
      title: t('define.des'),
      id: 'description',
      editable: true,
      column: {
        width: 260
      },
      formFieldProps: {
        placeholder: t('define.form.input.placeholder'),
        disabled: readOnly
      }
    },
    {
      title: t('define.variable.isSensitive'),
      id: 'sensitive',
      editable: true,
      column: {
        width: 116
      },
      renderFormInput: (record, { value, onChange }) => {
        const { options } = record;
        return (
          <Checkbox
            disabled={isArray(options) || readOnly}
            checked={!!value}
            onChange={e => {
              if (onChange) {
                onChange(e.target.checked);
              }
            }}
          >
            {t('define.variable.sensitive')}
          </Checkbox>
        );
      }
    }
  ];

  const optionRender = (record, optionNodes) => {
    const { scope } = record;
    const DeleteBtn = React.cloneElement(optionNodes.delete, {
      buttonProps: { disabled: scope !== defaultScope, type: 'link' }
    });
    return (
      DeleteBtn
    );
  };

  const onDeleteRow = ({ row, rows, k, handleChange }) => {
    const { overwrites, editable_id, _key_id } = row;
    if (overwrites) {
      handleChange(
        rows.map((item) => {
          if (item.editable_id === k) {
            return { ...overwrites, editable_id, _key_id, overwrites };
          }
          return item;
        })
      );
    } else {
      handleChange(
        rows.filter((item) => item.editable_id !== k)
      );
    }
    formVarRef.current.handleValidate();
  };

  const onChangeEditableTable = (list) => {
    list = list.map(it => {
      if (it.isNew) { // 全新数据,不处理
        return it;
      }
      // 如来源不同 则对比数据
      const sameNameData = defalutVarListRef.current.find(v => v.name === it.name);
      if (!sameNameData) { // 修改名称的数据
        return it;
      }
      if (sameNameData.scope === defaultScope && it.scope === defaultScope && it.id) { // 旧的同域数据,不处理
        return it;
      }
      const parentSameNameData = sameNameData.scope !== defaultScope ? sameNameData : sameNameData.overwrites;
      if (!parentSameNameData) { // 没有同名的继承数据，不处理
        return it;
      }
      const pickFindIt = {
        value: parentSameNameData.value || '',
        description: parentSameNameData.description || '',
        sensitive: !!parentSameNameData.sensitive
      };
      const pickIt = {
        value: it.value || '',
        description: it.description || '',
        sensitive: !!it.sensitive
      };
      // 数据不同 则来源置为默认来源 反之就恢复默认数据
      if (!isEqual(pickFindIt, pickIt)) {
        it.scope = defaultScope;
        delete it.id;
      } else {
        it = { ...it, ...parentSameNameData };
      }
      return it;
    });
    setVarList(list);
  };

  const onImportFinish = (params, cb) => {
    setVarList((preList) => [ ...preList, ...params ]);
    cb && cb();
  };

  const pushVar = (isSelectType) => {
    setVarList((preList) => [
      ...preList, {
        scope: defaultScope,
        sensitive: false,
        type,
        isNew: true,
        options: isSelectType ? [] : null // 选择型变量options为数组 普通型变量options始终为null
      }
    ]);
  };

  const importResourceAccount = ({ importResourceAccountList }) => {
    setVarGroupList((preValue) => {
      const preSameScopeVarGroupList = preValue.filter((it) => it.objectType === defaultScope);
      const sameScopeVarGroupList = importResourceAccountList.map((it) => {
        const sameVarGroup = preSameScopeVarGroupList.find(defaultIt => defaultIt.varGroupId === it.varGroupId);
        return sameVarGroup || it;
      });
      const otherScopeVarGroupList = defalutVarGroupList.filter((it) => {
        const sameScope = it.objectType !== defaultScope;
        if (!sameScope) {
          return false;
        }
        const hasSameVarName = !!sameScopeVarGroupList.find(sameScopeVarGroup => intersectionBy(sameScopeVarGroup.variables, it.variables, 'name').length > 0);
        return !hasSameVarName;
      });
      return [
        ...otherScopeVarGroupList,
        ...sameScopeVarGroupList
      ];
    });
  };

  const removeResourceAccount = ({ varGroupIds }) => {
    setVarGroupList((preValue) => {
      const sameScopeVarGroupList = preValue.filter((it) => it.objectType === defaultScope && !varGroupIds.includes(it.varGroupId));
      const otherScopeVarGroupList = defalutVarGroupList.filter((it) => {
        const sameScope = it.objectType !== defaultScope;
        if (!sameScope) {
          return false;
        }
        const hasSameVarName = !!sameScopeVarGroupList.find(sameScopeVarGroup => intersectionBy(sameScopeVarGroup.variables, it.variables, 'name').length > 0);
        return !hasSameVarName;
      });
      return [
        ...otherScopeVarGroupList,
        ...sameScopeVarGroupList
      ];
    });
  };

  const event$ = useEventEmitter();
  event$.useSubscription(({ type, data }) => {
    switch (type) {
    case 'import-resource-account':
      importResourceAccount(data);
      break;
    case 'remove-resource-account':
      removeResourceAccount(data);
      break;
    default:
      break;
    }
  });

  const scrollTableWrapperClassName = `listen-table-scroll-${type}`;

  return (
    <Collapse 
      activeKey={expandCollapse && 'open'}
      expandIconPosition={'right'} 
      onChange={(keys) => {
        const expandCollapse = keys.includes('open');
        setExpandCollapse(expandCollapse);
      }}
    >
      <Collapse.Panel key='open' header={VAR_TYPE_ENUM[type]} forceRender={true}>
        <EditableTable
          getActionRef={ref => (formVarRef.current = ref.current)}
          defaultData={{ scope: defaultScope, sensitive: false, type, isNew: true }}
          value={varList}
          fields={fields}
          onDeleteRow={onDeleteRow}
          deleteBtnProps={{ type: 'link' }}
          readOnly={readOnly}
          multiple={true}
          onChange={onChangeEditableTable}
          optionRender={optionRender}
          tableProps={{
            className: classnames(
              scrollTableWrapperClassName, 'top-dom', 
              // varList为空resourceAccountList不为空则隐藏varList的table-tbody
              { 'fn-hide-table-tbody': !isEmpty(varGroupList) && isEmpty(varList) },
              // varList和resourceAccountList都不为空则隐藏varList的横向滚动条
              { 'fn-hide-table-tbody-scroll': !isEmpty(varGroupList) && !isEmpty(varList) }
            ) 
          }}
          footer={
            <>
              <ResourceAccountFormTable 
                scrollTableWrapperClassName={scrollTableWrapperClassName} 
                dataSource={varGroupList} 
                defaultScope={defaultScope}
                event$={event$}
                readOnly={readOnly}
              />
              {
                !readOnly && (
                  <EditableTableFooter>
                    <Space>
                      {!!canImportVar && <Button onClick={() => setImportModalVisible(true)}>{t('define.import')}</Button>}
                      <Dropdown 
                        overlay={
                          <Menu>
                            <Menu.Item onClick={() => pushVar()}>{t('define.variable.action.addCommonVar')}</Menu.Item>
                            <Menu.Item onClick={() => pushVar(true)}>{t('define.variable.action.addSelectVar')}</Menu.Item>
                            {!!canImportResourceAccount && (
                              <Menu.Item onClick={() => event$.emit({ type: 'open-import-resource-account-modal' })}>{t('define.variable.action.importResourceAccount')}</Menu.Item>
                            )}
                          </Menu>
                        }
                      >
                        <Button>{t('define.variable.action.addVar')}<DownOutlined /></Button>
                      </Dropdown>
                    </Space>
                  </EditableTableFooter>
                )
              }
              
            </>
          }
        />
        <ImportVarsModal
          importVars={importVars}
          visible={importModalVisible}
          varList={varList}
          onClose={() => setImportModalVisible(false)}
          defaultScope={defaultScope}
          onFinish={onImportFinish}
        />
        <ImportResourceAccountModal event$={event$} fetchParams={fetchParams} varGroupList={varGroupList} defaultScope={defaultScope}/>
      </Collapse.Panel>
    </Collapse>
  );
};

export default VarFormTable;
