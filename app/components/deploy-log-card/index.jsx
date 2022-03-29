import React, { useState, useRef, useEffect } from "react";
import { Card, Space, Button, Tag, Collapse, Input, Tooltip, Modal, Form, notification, Alert } from "antd";
import { CloseCircleFilled, CheckCircleFilled, SyncOutlined, FullscreenExitOutlined, FullscreenOutlined, SearchOutlined, InfoCircleFilled, PauseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { connect } from "react-redux";
import classNames from 'classnames';
import { useRequest, useFullscreen, useScroll } from 'ahooks';
import { requestWrapper } from 'utils/request';
import getPermission from "utils/permission";
import { TASK_STATUS, TASK_STATUS_COLOR, END_TASK_STATUS_LIST } from 'constants/types';
import envAPI from 'services/env';
import taskAPI from 'services/task';
import history from 'utils/history';
import { timeUtils } from "utils/time";
import SearchByKeyWord from 'components/coder/ansi-coder-card/dom-event';

import DeployLog from './deploy-log';
import styles from './styles.less';

const { Panel } = Collapse;
const searchService = new SearchByKeyWord({ 
  searchWrapperSelect: '.ansi-coder-content',
  excludeSearchClassNameList: [
    'line-index'
  ]
});
const enableStatusList = [ 'complete', 'failed', 'timeout', 'running' ];
const suspendStatusList = new Set([ 'rejected', 'failed', 'aborted', 'complete' ]); // 中止按钮隐藏的状态

const DeployLogCard = ({ taskInfo, userInfo, reload, envInfo = {} }) => {
  
  const [form] = Form.useForm();

  const searchRef = useRef();
  const ref = useRef();
  const timeRef = useRef();
  const stopLoopRef = useRef(false);
  const scrollRef = useRef(null);

  const { top: scrollRefTop } = useScroll(scrollRef);
  const [ isFullscreen, { toggleFull }] = useFullscreen(ref);
  const { orgId, projectId, envId, id: taskId, startAt, endAt, type, status, aborting } = taskInfo || {};
  const { PROJECT_OPERATOR, PROJECT_APPROVER } = getPermission(userInfo);
  const [ activeKey, setActiveKey ] = useState([]);
  const [ canAutoScroll, setCanAutoScroll ] = useState(true);
  const taskHasEnd = END_TASK_STATUS_LIST.includes(status);
  const autoScroll = !taskHasEnd && canAutoScroll;

  useEffect(() => {
    if (!taskId) {
      return;
    }
    if (taskHasEnd) {
      timeRef.current = setTimeout(() => {
        stopLoopRef.current = true;
      }, 30000);
    } else {
      timeRef.current && clearTimeout(timeRef.current);
      stopLoopRef.current = false;
      cancelLoop();
      runLoop();
    }
    return () => {
      timeRef.current && clearTimeout(timeRef.current);
    };
  }, [taskHasEnd]);

  useEffect(() => {
    // 给页面绑定鼠标滚轮事件,针对火狐的非标准事件 
    scrollRef.current.addEventListener("DOMMouseScroll", scrollFunc);
    // 给页面绑定鼠标滚轮事件，针对Google，mousewheel非标准事件已被弃用，请使用 wheel事件代替
    scrollRef.current.addEventListener("wheel", scrollFunc);
    // ie不支持wheel事件，若一定要兼容，可使用mousewheel
    scrollRef.current.addEventListener("mousewheel", scrollFunc);
    return () => {
      scrollRef.current.removeEventListener("DOMMouseScroll", scrollFunc);
      //    给页面绑定鼠标滚轮事件，针对Google，mousewheel非标准事件已被弃用，请使用 wheel事件代替
      scrollRef.current.removeEventListener("wheel", scrollFunc);
      //    ie不支持wheel事件，若一定要兼容，可使用mousewheel
      scrollRef.current.removeEventListener("mousewheel", scrollFunc);
    };
  }, []);

  useEffect(() => {
    const { scrollHeight, clientHeight } = scrollRef.current;
    // 滚动到底部
    if (scrollRefTop === scrollHeight - clientHeight) {
      setCanAutoScroll(true);
    }
  }, [scrollRefTop]);

  const scrollFunc = (e) => {
    e = e || window.event;
    if (e.wheelDelta) {   
      if (e.wheelDelta > 0) {    
        setCanAutoScroll(false);
      }
    } else if (e.detail) {
      if (e.detail < 0) {
        setCanAutoScroll(false);
      }
    }
  };

  // 任务步骤列表查询
  const {
    data: taskSteps = [],
    run: runLoop,
    cancel: cancelLoop
  } = useRequest(
    () => requestWrapper(
      taskAPI.getTaskSteps.bind(null, { orgId, projectId, taskId })
    ),
    {
      formatResult: res => res || [],
      ready: !!taskId,
      pollingInterval: 3000,
      pollingWhenHidden: false,
      onSuccess: (data) => {
        if (autoScroll) {
          const activeKey = getAutoActiveKey(data);
          setActiveKey(activeKey);
        }
        if (stopLoopRef.current) {
          cancelLoop();
        }
      }
    }
  );

  const getAutoActiveKey = (data) => {
    let activeKey = [];
    data.forEach((item) => {
      if (enableStatusList.includes(item.status)) {
        activeKey.push(item.id);
      }
    });
    return activeKey;
  };

  const goBottom = () => {
    const { scrollHeight, clientHeight } = scrollRef.current;
    scrollRef.current.scrollTop = scrollHeight - clientHeight;
  };

  // 执行部署
  const {
    run: applyTask,
    loading: applyTaskLoading
  } = useRequest(
    () => requestWrapper(
      envAPI.envRedeploy.bind(null, { orgId, projectId, envId, taskType: 'apply' }),
      {
        autoSuccess: true
      }
    ),
    {
      manual: true,
      onSuccess: (data) => {
        const { taskId } = data;
        history.push(`/org/${orgId}/project/${projectId}/m-project-env/detail/${envId}/task/${taskId}`); 
      }
    }
  ); 

  // 审批操作
  const {
    run: passOrRejecy,
    fetches: {
      approved: { loading: approvedLoading = false } = {},
      rejected: { loading: rejectedLoading = false } = {}
    } 
  } = useRequest(
    (action) => requestWrapper(
      taskAPI.approve.bind(null, { orgId, taskId, projectId, action }),
      {
        autoSuccess: true
      }
    ),
    {
      fetchKey: (action) => action,
      manual: true,
      onSuccess: () => {
        reload && reload();
        setCanAutoScroll(true);
      }
    }
  );

  const manualChangeActiveKey = (keys) => {
    setActiveKey(keys);
  };

  // 中止
  const suspend = () => {
    Modal.confirm({
      width: 480,
      title: `中止“${envInfo.name}”`,
      icon: <InfoCircleOutlined style={{ color: 'red' }} />,
      content: (
        <div className={'suspendAlter'}>
          <Alert style={{ padding: '3px 31px', margin: 0 }} message='中止执行中的任务存在如下风险' type='error' />
          <div style={{ marginBottom: 16 }}>
            在apply动作开始后中止任务，环境状态将标记为『失败』，<br/>
            并有可能损坏环境的状态文件，导致该环境损坏，<br/>
            请在了解可能带来的风险前提下执行该动作。<br/>
          </div>
          <Form layout='vertical' requiredMark='optional' form={form}>
            <Form.Item
              label='输入环境名称以确认'
              name='name'
              rules={[
                { required: true, message: '请输入环境名称' },
                () => ({
                  validator(_, value) {
                    if (!value || envInfo.name === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('环境名称不一致!'));
                  }
                })
              ]}
            >
              <Input placeholder='请输入环境名称' />
            </Form.Item>
          </Form>
        </div>
      ),
      okText: '确认中止',
    	cancelText: '取消',
      onOk: async () => {
        await form.validateFields();
        const res = await taskAPI.abortTask({ orgId, projectId, taskId });
        if (res.code != 200) {
          notification.error({
            message: '操作失败',
            description: res.message
          });
          return;
        }
        notification.success({
          message: '操作成功'
        });
        reload && reload();
        form.resetFields();
      },
      onCancel: () => form.resetFields()
    });
  };

  return (
    <div ref={ref} className={styles.deploy_log_card_wrapper}>
      <Card
        className='deploy-log-card'
        bodyStyle={{ background: 'rgba(36, 38, 35)', padding: 0 }}
        title={
          <div className='card-title'>
            <div className='card-title-top'>
              <span className='title'>部署日志</span> 
              {aborting ? <Tag className='status' color={'error'}>{'中止执行中'}</Tag> : <Tag className='status' color={TASK_STATUS_COLOR[status]}>{TASK_STATUS[status]}</Tag>}
              {
                taskInfo.status === 'failed' && taskInfo.message ? (
                  <Tooltip title={taskInfo.message}>
                    <InfoCircleFilled style={{ color: '#ff4d4f', fontSize: 14 }} />
                  </Tooltip>
                ) : null
              }
            </div>
            <div className='card-title-bottom'>执行总耗时：{timeUtils.diff(endAt, startAt, '-')}</div>
          </div>
        }
        extra={
          <Space size={24}>
            {
              PROJECT_OPERATOR && (
                <Space size={8}>
                  {
                    taskInfo.status === 'approving' && !aborting && (
                      <>
                        <Button 
                          disabled={!PROJECT_APPROVER || approvedLoading}
                          onClick={() => passOrRejecy('rejected')}
                          loading={rejectedLoading} 
                        >
                          驳回
                        </Button>
                        <Button 
                          disabled={!PROJECT_APPROVER || rejectedLoading}
                          onClick={() => passOrRejecy('approved')} 
                          loading={approvedLoading} 
                          type='primary'
                        >
                          通过
                        </Button>
                      </>
                    )
                  }
                  {
                    !suspendStatusList.has(status) && (
                      <Button 
                        type='link'
                        onClick={() => suspend()}
                        disabled={aborting}
                        icon={<PauseOutlined />}
                        className='hoverSuspend'
                      >
                        中止
                      </Button>
                    )
                  }
                  {
                    type === 'plan' && status === 'complete' ? (
                      <Button 
                        type='primary'
                        onClick={applyTask}
                        loading={applyTaskLoading}
                      >
                        执行部署
                      </Button>
                    ) : null
                  }
                </Space>
              )
            }
            <Input
              prefix={<SearchOutlined />}
              ref={searchRef}
              placeholder='搜索日志'
              onPressEnter={(e) => {
                searchService.search(e.target.value);
                searchRef.current.focus();
              }}
              style={{ width: 240 }}
            />
            <span 
              className='tool'
              onClick={toggleFull} 
            >
              {
                isFullscreen ? (
                  <>
                    <FullscreenExitOutlined className='tool-icon'/>
                    <span className='tool-text'>退出全屏</span> 
                  </>
                ) : (
                  <>
                    <FullscreenOutlined className='tool-icon'/>
                    <span className='tool-text'>全屏显示</span>
                  </>
                )
              }
            </span>
          </Space>
        }
      >
        
        <div className={classNames('card-body-scroll', { isFullscreen })} ref={scrollRef} >
          <Collapse 
            activeKey={activeKey} 
            onChange={manualChangeActiveKey}
            ghost={true} 
            className='deploy-log-collapse'
          >
            {
              taskSteps.map(({ name, id, startAt, type, endAt, status }, index) => (
                <Panel 
                  className={'log-panel-' + index}
                  collapsible={![ 'complete', 'failed', 'timeout', 'running' ].includes(status) && 'disabled'}
                  header={
                    <Space>
                      <span>{name || type || '-'}</span>
                      {status === 'complete' && <CheckCircleFilled style={{ color: '#45BC13' }}/>}
                      {(status === 'failed' || status === 'timeout') && <CloseCircleFilled style={{ color: '#F23C3C' }}/>}
                      {status === 'running' && <SyncOutlined spin={true} style={{ color: '#ffffff' }}/>}
                    </Space>
                  } 
                  key={id}
                  extra={timeUtils.diff(endAt, startAt)}
                >
                  <DeployLog autoScroll={autoScroll} goBottom={goBottom} isFullscreen={isFullscreen} taskInfo={taskInfo} stepId={id} stepStatus={status}/>
                </Panel>
              ))
            }
          </Collapse>
        </div>
      </Card>
    </div>
  );
};


export default connect((state) => {
  return {
    userInfo: state.global.get('userInfo').toJS()
  };
})(DeployLogCard);