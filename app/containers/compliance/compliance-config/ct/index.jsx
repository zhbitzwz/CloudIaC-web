import React, { useState } from 'react';
import { Badge, Table, Input, Space, Divider, Switch, Button, Modal, Row, Col } from 'antd';
import { InfoCircleFilled, SearchOutlined } from '@ant-design/icons';
import { connect } from "react-redux";
import noop from 'lodash/noop';
import { useRequest } from 'ahooks';
import { useSearchFormAndTable } from 'utils/hooks';
import { requestWrapper } from 'utils/request';
import { Eb_WP } from 'components/error-boundary';
import PageHeader from 'components/pageHeader';
import Layout from 'components/common/layout';
import ctplAPI from 'services/ctpl';
import { SCAN_DISABLE_STATUS, SCAN_DETAIL_DISABLE_STATUS } from 'constants/types';
import { useLoopPolicyStatus } from 'utils/hooks';
import BindPolicyGroupModal from './component/bindPolicyGroupModal';
import DetectionDrawer from './component/detection-drawer';
import PolicyStatus from 'components/policy-status';
import { t } from 'utils/i18n';

const CCTList = () => {

  const { check, loopRequesting } = useLoopPolicyStatus();
  const [ bindPolicyGroupModalProps, setBindPolicyGroupModalProps ] = useState({
    visible: false,
    id: null,
    title: '',
    policyGroupIds: [],
    onSuccess: noop
  });
  const [ detectionDrawerProps, setDetectionDrawerProps ] = useState({
    visible: false,
    id: null
  });

  // 启用/禁用Stack扫描
  const {
    run: changeEnabled
  } = useRequest(
    (params) => requestWrapper(
      ctplAPI.enabled.bind(null, params),
      { autoSuccess: true }
    ), {
      manual: true,
      fetchKey: (params) => params.id,
      onSuccess: () => refreshList()
    }
  );

  // 合规检测
  const {
    run: runScan,
    fetches: scanFetches
  } = useRequest(
    ({ id }) => requestWrapper(
      ctplAPI.runScan.bind(null, { tplId: id })
    ), {
      manual: true,
      fetchKey: (params) => params.id,
      onSuccess: (data, params) => {
        const { id } = params[0] || {};
        openDetectionDrawer({ id });
        refreshList();
      }
    }
  );

  // Stack列表查询
  const {
    loading: tableLoading,
    data: tableData,
    run: fetchList,
    refresh: refreshList
  } = useRequest(
    (params) => requestWrapper(
      ctplAPI.list.bind(null, params)
    ), {
      manual: true,
      onSuccess: (data) => {
        check({ 
          list: data.list || [],
          loopFn: () => refreshList()
        });
      }
    }
  );

  // 表单搜索和table关联hooks
  const { 
    tableProps, 
    onChangeFormParams
  } = useSearchFormAndTable({
    tableData,
    onSearch: (params) => {
      const { current: currentPage, ...restParams } = params;
      fetchList({ currentPage, ...restParams });
    }
  });

  const openDetectionDrawer = ({ id }) => {
    setDetectionDrawerProps({
      id,
      visible: true
    });
  };

  // 关闭检测详情
  const closeDetectionDrawer = () => {
    setDetectionDrawerProps({
      id: null,
      visible: false
    });
  };

  const openBindPolicyGroupModal = ({ id, policyGroups, title }, onSuccess = refreshList) => {
    setBindPolicyGroupModalProps({
      visible: true,
      policyGroupIds: (policyGroups || []).map((it) => it.id),
      id,
      title,
      onSuccess
    });
  };

  const closeBindPolicyGroupModal = () => {
    setBindPolicyGroupModalProps({
      visible: false,
      policyGroupIds: [],
      id: null,
      title: '',
      onSuccess: noop
    });
  };

  // 开启/关闭合规检测
  const switchEnabled = ({ enabled, id, policyGroups, name }) => {
    if (enabled) {
      openBindPolicyGroupModal({ id, policyGroups, title: t('define.ct.field.policyEnable') }, () => {
        changeEnabled({ id, enabled: true }); // changeEnabled成功会触发列表刷新，无需重复刷新列表
      });
    } else {
      Modal.confirm({
        width: 480,
        title: t('define.confirm.title'),
        content: `${t('define.closeComplianceScan.confirm.content.prefix')} ${name} ${t('define.closeComplianceScan.confirm.content.suffix')}`,
        icon: <InfoCircleFilled />,
        cancelButtonProps: {
          className: 'ant-btn-tertiary' 
        },
        onOk: () => changeEnabled({ id, enabled: false })
      });
    }
  };

  const columns = [
    {
      dataIndex: 'name',
      title: t('define.ct.name'),
      width: 220,
      ellipsis: true
    },
    {
      dataIndex: 'policyGroups',
      title: t('define.ct.field.policyGroup'),
      width: 220,
      ellipsis: true,
      render: (policyGroups, record) => {
        return (
          <a onClick={() => openBindPolicyGroupModal({ ...record, title: t('define.ct.field.policyGroup') })}>
            {policyGroups.length > 0 ? (
              policyGroups.map(it => it.name).join('、')
            ) : '-'}
          </a>
        );
      }
    },
    {
      dataIndex: 'passed',
      title: t('define.scan.status.passed'),
      width: 48
    },
    {
      dataIndex: 'violated',
      title: t('define.scan.status.violated'),
      width: 64
    },
    {
      dataIndex: 'suppressed',
      title: t('define.scan.status.suppressed'),
      width: 48
    },
    {
      dataIndex: 'failed',
      title: t('define.scan.status.failed'),
      width: 48
    },
    {
      dataIndex: 'policyStatus',
      title: t('define.status'),
      width: 110,
      render: (policyStatus, record) => {
        const clickProps = {
          style: { cursor: 'pointer' },
          onClick: () => openDetectionDrawer(record)
        };
        return (
          <PolicyStatus policyStatus={policyStatus} clickProps={clickProps} empty='-' />
        );
      }
    },
    {
      dataIndex: 'policyEnable',
      title: t('define.action.openScan'),
      width: 88,
      ellipsis: true,
      fixed: 'right',
      render: (policyEnable, record) => {
        const { id, name, policyGroups } = record;
        return (
          <Switch 
            checked={policyEnable} 
            size='small' 
            onChange={(checked) => switchEnabled({ enabled: checked, id, policyGroups, name })} 
          />
        );
      }
    },
    {
      title: t('define.action'),
      width: 169,
      ellipsis: true,
      fixed: 'right',
      render: (record) => {
        const { id, policyEnable, policyStatus } = record;
        const { loading: scanLoading } = scanFetches[id] || {};
        return (
          <Space split={<Divider type='vertical'/>}>
            <Button 
              type='link'
              style={{ padding: 0, fontSize: '12px' }} 
              onClick={() => runScan({ id })}
              loading={scanLoading}
              disabled={SCAN_DISABLE_STATUS.includes(policyStatus)}
            >{t('define.action.scan')}</Button>
            <Button 
              type='link'
              style={{ padding: 0, fontSize: '12px' }} 
              disabled={SCAN_DETAIL_DISABLE_STATUS.includes(policyStatus)}
              onClick={() => openDetectionDrawer({ id })}
            >{t('define.action.viewResult')}</Button>
          </Space>
        );
      }
    }
  ];


  return <Layout
    extraHeader={<PageHeader
      title={t('define.scope.template')}
      breadcrumb={true}
    />}
  >
    <div className='idcos-card'>
      <Space size={16} direction='vertical' style={{ width: '100%' }}>
        <Row justify='space-between' wrap={false}>
          <Col></Col>
          <Col>
            <Input
              style={{ width: 320 }}
              allowClear={true}
              placeholder={t('define.ct.search.placeholder')}
              prefix={<SearchOutlined />}
              onPressEnter={(e) => {
                const q = e.target.value;
                onChangeFormParams({ q });
              }}
            />
          </Col>
        </Row>
        <Table
          columns={columns}
          scroll={{ x: 'min-content' }}
          loading={tableLoading && !loopRequesting}
          {...tableProps}
        />
      </Space>
    </div>
    {bindPolicyGroupModalProps.visible && <BindPolicyGroupModal 
      {...bindPolicyGroupModalProps}
      onClose={closeBindPolicyGroupModal}
    />}
    {detectionDrawerProps.visible && <DetectionDrawer 
      {...detectionDrawerProps}
      onClose={closeDetectionDrawer}
    />}
  </Layout>;
};

export default connect((state) => {
  return {
    userInfo: state.global.get('userInfo').toJS(),
    orgs: state.global.get('orgs').toJS()
  };
})(Eb_WP()(CCTList));
