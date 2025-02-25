import React, { useEffect, useState } from 'react';
import { Modal, Table, Popover } from 'antd';
import { CloseCircleFilled } from '@ant-design/icons';
import moment from 'moment';
import intersectionBy from 'lodash/intersectionBy';
import { useRequest } from 'ahooks';
import { requestWrapper } from 'utils/request';
import varGroupAPI from 'services/var-group';
import { t } from 'utils/i18n';

export default ({ event$, fetchParams, defaultScope, varGroupList = [] }) => {

  const { orgId, projectId } = fetchParams || {};
  const [ visible, setVisible ] = useState(false);
  const [ selectedRows, setSelectedRows ] = useState([]);
  const [ disabledKeys, setDisabledKeys ] = useState([]);
  const [ popoverVisibleKey, setPopoverVisibleKey ] = useState();

  useEffect(() => {
    if (visible) {
      const selectedRows = varGroupList.filter(varGroup => varGroup.objectType === defaultScope);
      const disabledKeys = varGroupList.filter(varGroup => varGroup.objectType !== defaultScope).map(it => it.varGroupId);
      setSelectedRows(selectedRows);
      setDisabledKeys(disabledKeys);
    }
  }, [visible]);

  // 列表查询
  const {
    loading: tableLoading,
    data: dataSource = [],
    run: fetchList,
    mutate: mutateDataSource
  } = useRequest(
    (params) => requestWrapper(
      varGroupAPI.list.bind(null, { orgId, projectId, type: 'environment', ...params })
    ), {
      manual: true,
      formatResult: (res) => {
        return (res.list || []).map(it => {
          it.objectType = defaultScope;
          it.varGroupId = it.id;
          delete it.id;
          return it;
        });
      }
    }
  );

  const onOpen = () => {
    setVisible(true);
    fetchList({ pageSize: 0 });
  };

  const onCancel = () => {
    setVisible(false);
    mutateDataSource([]);
  };

  const onOk = () => {
    event$.emit({ 
      type: 'import-resource-account',
      data: {
        importResourceAccountList: selectedRows
      } 
    });
    setSelectedRows([]);
    setVisible(false);
  };

  const columns = [
    {
      dataIndex: 'name',
      title: t('define.resourceAccount.accountDes'),
      width: 200,
      ellipsis: true
    },
    {
      dataIndex: 'creator',
      title: t('define.creator'),
      width: 140,
      ellipsis: true
    },
    {
      dataIndex: 'updatedAt',
      title: t('define.updateTime'),
      width: 200,
      ellipsis: true,
      render: (text) => moment(text).format('YYYY-MM-DD hh:mm')
    }
  ];

  event$.useSubscription(({ type }) => {
    switch (type) {
    case 'open-import-resource-account-modal':
      onOpen();
      break;
    default:
      break;
    }
  });

  return (
    <Modal 
      title={t('define.resourceAccount.title')}
      visible={visible} 
      onCancel={onCancel} 
      className='antd-modal-type-table'
      cancelButtonProps={{ 
        className: 'ant-btn-tertiary' 
      }}
      onOk={onOk}
      width={680}
    >
      <Table 
        style={{ marginBottom: 14 }}
        columns={columns}
        scroll={{ x: 'min-content', y: 258 }}
        loading={tableLoading}
        dataSource={dataSource}
        pagination={false}
        rowKey='varGroupId'
        rowSelection={{
          columnWidth: 26,
          hideSelectAll: true,
          selectedRowKeys: selectedRows.map(({ varGroupId }) => varGroupId),
          getCheckboxProps: (record) => ({
            disabled: disabledKeys.includes(record.varGroupId)
          }),
          onSelect: (record, selected, selectedRows) => {
            let _selectedRows = selectedRows;
            if (selected) {
              const otherRows = selectedRows.filter(it => it.varGroupId !== record.varGroupId);
              const hasSameVarNameRecord = otherRows.find((otherRow) => intersectionBy(otherRow.variables, record.variables, 'name').length > 0);
              if (hasSameVarNameRecord) {
                setPopoverVisibleKey(record.varGroupId);
                _selectedRows = otherRows;
              }
            }
            setSelectedRows(_selectedRows);
          },
          renderCell: (_checked, record, _index, originNode) => {
            return (
              <Popover 
                placement='topLeft'
                trigger='click'
                content={<><CloseCircleFilled style={{ color: '#F23C3C', marginRight: 8 }}/>{t('define.resourceAccount.sameKeyError')}</>} 
                visible={popoverVisibleKey === record.varGroupId}
                onVisibleChange={(visible) => !visible && setPopoverVisibleKey()} 
              >
                <span>{originNode}</span>
              </Popover>
            );
          }
        }}
      />
    </Modal>
  );
};
