import React, { useState } from 'react';
import { Badge, Table, Input, Select, Space, Divider, Switch, Button, Modal, notification } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { connect } from "react-redux";
import noop from 'lodash/noop';
import { useRequest } from 'ahooks';
import { useSearchFormAndTable } from 'utils/hooks';
import { requestWrapper } from 'utils/request';
import { Eb_WP } from 'components/error-boundary';
import EllipsisText from 'components/EllipsisText';
import PageHeader from 'components/pageHeader';
import Layout from 'components/common/layout';
import projectAPI from 'services/project';
import ctplAPI from 'services/ctpl';
import BindPolicyGroupModal from './component/bindPolicyGroupModal';
import DetectionModal from './component/detection-modal';
import { POLICIES_DETECTION, POLICIES_DETECTION_COLOR_COLLAPSE } from 'constants/types';

const CCTList = ({ orgs }) => {
  const orgOptions = ((orgs || {}).list || []).map(it => ({ label: it.name, value: it.id }));
  const [ templateId, setTemplateId ] = useState(null);
  const [ detectionVisible, setDetectionVisible ] = useState(false);
  const [ bindPolicyGroupModalProps, setBindPolicyGroupModalProps ] = useState({
    visible: false,
    id: null,
    policyGroupIds: [],
    onSuccess: noop
  });

  // 项目选项查询
  const { data: projectOptions = [], run: fetchProjectOptions, mutate: mutateProjectOptions } = useRequest(
    (orgId) => requestWrapper(
      projectAPI.allEnableProjects.bind(null, { orgId }),
      {
        formatDataFn: (res) => ((res.result || {}).list || []).map((it) => ({ label: it.name, value: it.id }))
      }
    ),
    {
      manual: true
    }
  );

  // 启用/禁用云模版扫描
  const {
    run: changeEnabled,
    fetches: changeEnabledFetches
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

  // 环境列表查询
  const {
    loading: tableLoading,
    data: tableData,
    run: fetchList,
    refresh: refreshList
  } = useRequest(
    (params) => requestWrapper(
      ctplAPI.list.bind(null, params)
    ), {
      manual: true
    }
  );

  // 表单搜索和table关联hooks
  const { 
    tableProps, 
    onChangeFormParams,
    searchParams: { formParams, paginate }
  } = useSearchFormAndTable({
    tableData,
    onSearch: (params) => {
      const { current: currentPage, ...restParams } = params;
      fetchList({ currentPage, ...restParams });
    }
  });

  const changeOrg = (orgId) => {
    onChangeFormParams({ orgId, projectId: undefined });
    if (orgId) {
      fetchProjectOptions(orgId);
    } else {
      mutateProjectOptions([]);
    }
  };

  const bindPolicyGroup = ({ id, policyGroups }, onSuccess = refreshList) => {
    setBindPolicyGroupModalProps({
      visible: true,
      policyGroupIds: (policyGroups || []).map((it) => it.id),
      id,
      onSuccess
    });
  };

  const closeBindPolicyGroup = () => {
    setBindPolicyGroupModalProps({
      visible: false,
      policyGroupIds: [],
      id: null,
      onSuccess: noop
    })
  };

  const runScan = async (record) => {
    try {
      const res = await ctplAPI.runScan({
        tplId: record.id
      });
      if (res.code !== 200) {
        throw new Error(res.message);
      }
      setTemplateId(record.id);
      setDetectionVisible(true); 
    } catch (e) {
      notification.error({
        message: '操作失败',
        description: e.message
      });
    }
  };

  // 开启/关闭合规检测
  const switchEnabled = ({ enabled, id, policyGroups, name }) => {
    if (enabled) {
      bindPolicyGroup({ id, policyGroups }, () => {
        changeEnabled({ id, enabled: true }); // changeEnabled成功会触发列表刷新，无需重复刷新列表
      });
    } else {
      Modal.confirm({
        width: 480,
        title: `确认操作`,
        content: `你确定要关闭${name}的合规检测吗？`,
        icon: <ExclamationCircleFilled />,
        okText: '确认',
        cancelText: '取消',
        onOk: () => changeEnabled({ id, enabled: false })
      });
    }
  };

  const columns = [
    {
      dataIndex: 'name',
      title: '云模板名称',
      render: (text) => <EllipsisText style={{ maxWidth: 180 }}>{text}</EllipsisText>
    },
    {
      dataIndex: 'policyGroups',
      title: '绑定策略组',
      render: (policyGroups, record) => {
        return policyGroups.length > 0 ? (
          <a onClick={() => bindPolicyGroup(record)} type='link'>
            <EllipsisText style={{ maxWidth: 220 }}>
              {policyGroups.map(it => it.name).join('、')}
            </EllipsisText>
          </a>
        ) : '-'; 
      }
    },
    {
      dataIndex: 'enabled',
      title: '是否开启检测',
      render: (enabled, record) => {
        const { id, name, policyGroups } = record;
        return (
          <Switch 
            checked={enabled} 
            size='small' 
            onChange={(checked) => switchEnabled({ enabled: checked, id, policyGroups, name })} 
          />
        );
      }
    },
    {
      dataIndex: 'passed',
      title: '通过'
    },
    {
      dataIndex: 'failed',
      title: '不通过'
    },
    {
      dataIndex: 'suppressed',
      title: '屏蔽'
    },
    {
      dataIndex: 'failed',
      title: '失败'
    },
    {
      dataIndex: 'policyStatus',
      title: '状态',
      render: (text) => <Badge color={POLICIES_DETECTION_COLOR_COLLAPSE[text]} text={POLICIES_DETECTION[text]} />
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right',
      render: (record) => {
        return (
          <Space split={<Divider type='vertical'/>}>
            <Button 
              type='link'
              style={{ padding: 0, fontSize: '12px' }} 
              onClick={() => {
                runScan(record);
              }}
            >检测</Button>
            <Button 
              type='link'
              style={{ padding: 0, fontSize: '12px' }} 
              onClick={() => {
                setTemplateId(record.id);
                setDetectionVisible(true);
              }}
            >查看结果</Button>
          </Space>
        );
      }
    }
  ];


  return <Layout
    extraHeader={<PageHeader
      title='云模板'
      breadcrumb={true}
    />}
  >
    <div className='idcos-card'>
      <Space size={16} direction='vertical' style={{ width: '100%' }}>
        <Space>
          <Select
            style={{ width: 282 }}
            allowClear={true}
            placeholder='请选择组织'
            options={orgOptions}
            optionFilterProp='label'
            showSearch={true}
            onChange={changeOrg}
          />
          <Select
            style={{ width: 282 }}
            allowClear={true}
            options={projectOptions}
            placeholder='请选择项目'
            value={formParams.projectId}
            onChange={(projectId) => onChangeFormParams({ projectId })}
          />
          <Input.Search
            style={{ width: 240 }}
            allowClear={true}
            placeholder='请输入环境名称搜索'
            onSearch={(q) => onChangeFormParams({ q })}
          />
        </Space>
        <Table
          columns={columns}
          scroll={{ x: 'max-content' }}
          loading={tableLoading}
          {...tableProps}
        />
      </Space>
    </div>
    {bindPolicyGroupModalProps.visible && <BindPolicyGroupModal 
      {...bindPolicyGroupModalProps}
      onClose={closeBindPolicyGroup}
    />}
    {detectionVisible && <DetectionModal
      id={templateId}
      visible={detectionVisible} 
      toggleVisible={() => {
        setDetectionVisible(false); 
        setTemplateId(null);
      }}
    />}
  </Layout>;
};

export default connect((state) => {
  return {
    userInfo: state.global.get('userInfo').toJS(),
    orgs: state.global.get('orgs').toJS()
  };
})(Eb_WP()(CCTList));
