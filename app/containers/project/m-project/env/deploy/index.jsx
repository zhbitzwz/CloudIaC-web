import React, { useState, useEffect, useMemo, useRef } from "react";
import { notification, Select, Form, Input, Button, Row, Col, Space } from "antd";
import { LayoutOutlined } from '@ant-design/icons';
import get from 'lodash/get';
import PageHeader from "components/pageHeader";
import history from 'utils/history';
import VariableForm, { formatVariableRequestParams } from 'components/variable-form';
import AdvancedConfig from './advanced-config';
import Layout from "components/common/layout";
import sysAPI from 'services/sys';
import envAPI from 'services/env';
import tplAPI from 'services/tpl';
import keysAPI from 'services/keys';
import vcsAPI from 'services/vcs';
import varsAPI from 'services/variables';
import isEmpty from "lodash/isEmpty";
import { t } from 'utils/i18n';

const FL = {
  labelCol: { span: 24 },
  wrapperCol: { span: 24 }
};
const { Option, OptGroup } = Select;
const defaultScope = 'env';

const Index = ({ match = {} }) => {
  const { orgId, projectId, envId, tplId } = match.params || {};
  const varRef = useRef();
  const configRef = useRef({});
  const [form] = Form.useForm();
  const [ applyLoading, setApplyLoading ] = useState(false);
  const [ planLoading, setPlanLoading ] = useState(false);
  const [ vars, setVars ] = useState([]);
  const [ runnner, setRunnner ] = useState([]);
  const [ keys, setKeys ] = useState([]);
  const [ branch, setBranch ] = useState([]);
  const [ tag, setTag ] = useState([]);
  const [ info, setInfo ] = useState({});
  const [ tplInfo, setTplInfo ] = useState({});
  const [ tfvars, setTfvars ] = useState([]);
  const [ playbooks, setPlaybooks ] = useState([]);
  const [ fetchParams, setFetchParams ] = useState({});
  const [ repoObj, setRepoObj ] = useState({});

  useEffect(() => {
    fetchInfo();
    getVars();
  }, []);


  const getVars = async () => {
    try {
      const res = await varsAPI.search({ orgId, projectId, tplId, envId, scope: 'env' });
      if (res.code !== 200) {
        throw new Error(res.message);
      }
      setVars(res.result || []);
    } catch (e) {
      notification.error({
        message: t('define.message.getFail'),
        description: e.message
      });
    }
  };

  // 获取Info
  const fetchInfo = async () => {
    try {
      const res = await tplAPI.detail({
        orgId, tplId
      });
      const tplInfoRes = res.result || {};
      setTplInfo(tplInfoRes);
      let fetchParams = { ...tplInfoRes, orgId, projectId, tplId, envId, objectType: 'env' };
      if (envId) {
        const infores = await envAPI.envsInfo({
          orgId, projectId, envId
        });
        let data = infores.result || {};
        form.setFieldsValue(data);
        setInfo(data);
        fetchParams.repoRevision = data.revision;
        fetchParams.workdir = data.workdir;
        setRepoObj({
          ...repoObj,
          repoRevision: data.revision || '',
          workdir: data.workdir
        });
      } else {
        const { repoRevision, workdir } = tplInfoRes;
        form.setFieldsValue({ revision: repoRevision || undefined, workdir });
        setRepoObj({
          ...repoObj,
          repoRevision,
          workdir
        });
      }
      setFetchParams(fetchParams);
      fetchTfvars(fetchParams);
      fetchPlaybooks(fetchParams);
      fetchKeys(fetchParams);
      fetchRunner();
      fetchRepoTag(fetchParams);
      fetchRepoBranch(fetchParams);
    } catch (e) {
      notification.error({
        message: t('define.message.getFail'),
        description: e.message
      });
    }
  };

  // 获取分支数据
  const fetchRepoBranch = async (fetchParams) => {
    const { vcsId, repoId } = fetchParams;
    try {
      const res = await vcsAPI.listRepoBranch({
        orgId,
        vcsId,
        repoId
      });
      if (res.code === 200) {
        setBranch(res.result || []);
      }

      if (res.code != 200) {
        throw new Error(res.message);
      }
    } catch (e) {
      notification.error({
        message: t('define.message.getFail'),
        description: e.message
      });
    }
  };

  // 获取标签数据
  const fetchRepoTag = async (fetchParams) => {
    const { vcsId, repoId } = fetchParams;
    try {
      const res = await vcsAPI.listRepoTag({
        orgId,
        vcsId,
        repoId
      });

      if (res.code === 200) {
        setTag(res.result || []);
      }
      if (res.code != 200) {
        throw new Error(res.message);
      }
    } catch (e) {
      notification.error({
        message: t('define.message.getFail'),
        description: e.message
      });
    }
  };

  // 获取通道数据
  const fetchRunner = async () => {
    try {
      const res = await sysAPI.listCTRunnerTag({
        orgId
      });
      let runnerTags = res.result.tags || [];
      if (res.code === 200) {
        setRunnner(runnerTags);
      }
      if (res.code != 200) {
        throw new Error(res.message);
      }
    } catch (e) {
      notification.error({
        message: t('define.message.getFail'),
        description: e.message
      });
    }
  };

  // 获取密钥数据
  const fetchKeys = async (fetchParams) => {
    const { orgId, repoRevision, repoId, repoType, vcsId } = fetchParams;
    try {
      const res = await keysAPI.list({
        orgId,
        pageSize: 0
      });
      if (res.code === 200) {
        setKeys(res.result.list || []);
      }
      if (res.code != 200) {
        throw new Error(res.message);
      }
    } catch (e) {
      notification.error({
        message: t('define.message.getFail'),
        description: e.message
      });
    }
  };

  // 获取Tfvars文件
  const fetchTfvars = async (fetchParams) => {
    const { orgId, repoRevision, repoId, repoType, vcsId, workdir } = fetchParams;
    const params = { orgId, repoRevision, repoId, repoType, vcsId, workdir };
    try {
      const res = await vcsAPI.listTfvars(params);
      if (res.code !== 200) {
        throw new Error(res.message);
      }
      setTfvars(res.result || []);
      configRef.current && configRef.current.validateFields([['tfVarsFile']]);
    } catch (e) {
      notification.error({
        message: t('define.message.getFail'),
        description: e.message
      });
    }
  };

  // 获取Playbook文件
  const fetchPlaybooks = async (fetchParams) => {
    const { orgId, repoRevision, repoId, repoType, vcsId, workdir } = fetchParams;
    const params = { orgId, repoRevision, repoId, repoType, vcsId, workdir };
    try {
      const res = await vcsAPI.listPlaybook(params);
      if (res.code !== 200) {
        throw new Error(res.message);
      }
      setPlaybooks(res.result || []);
      configRef.current && configRef.current.validateFields([['playbook']]);
    } catch (e) {
      notification.error({
        message: t('define.message.getFail'),
        description: e.message
      });
    }
  };

  const onFinish = async (taskType) => {
    try {
      const value = await form.validateFields().catch((err) => {
        const errInfo = get(err, 'errorFields[0].errors[0]', '');
        throw {
          message: t('define.form.error'),
          description: errInfo
        };
      });
      const configData = await configRef.current.onfinish().catch((err) => {
        const errInfo = get(err, 'errorFields[0].errors[0]', '');
        throw {
          message: t('define.form.error'),
          description: errInfo
        };
      });
      const varData = await varRef.current.validateForm().catch(() => {
        throw {
          message: t('define.form.error'),
          description: t('define.form.error.variable')
        };
      });
      let values = { ...value, ...configData };
      taskType === 'plan' && setPlanLoading(true);
      taskType === 'apply' && setApplyLoading(true);
      const res = await envAPI[!!envId ? 'envRedeploy' : 'createEnv']({ orgId, projectId, ...formatVariableRequestParams(varData, defaultScope), ...values, tplId, taskType, envId: envId ? envId : undefined, ...configData });
      if (res.code !== 200) {
        throw {
          message: res.message,
          description: res.message_detail
        };
      }
      notification.success({
        message: t('define.message.opSuccess')
      });
      const envInfo = res.result || {};
      if (envId) { // 重新部署环境，跳部署历史详情
        history.push(`/org/${orgId}/project/${projectId}/m-project-env/detail/${envInfo.id}/task/${envInfo.taskId}`);
      } else { // 创建部署环境，跳环境详情
        history.push(`/org/${orgId}/project/${projectId}/m-project-env/detail/${envInfo.id}?tabKey=deployJournal`);
      }
      taskType === 'plan' && setPlanLoading(false);
      taskType === 'apply' && setApplyLoading(false);
    } catch (err) {
      taskType === 'plan' && setPlanLoading(false);
      taskType === 'apply' && setApplyLoading(false);
      notification.error(err);
    }
  };

  const changeVcsFetchParams = (params) => {
    const newFetchParams = { ...fetchParams, ...params };
    setFetchParams(newFetchParams);
    fetchTfvars(newFetchParams);
    fetchPlaybooks(newFetchParams);
  };

  return (
    <Layout
      extraHeader={
        <PageHeader
          title={
            <Space size='middle' align='center'>
              <span>{!!envId ? t('define.redeployment') : t('define.deployEnv')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <LayoutOutlined style={{ color: '#000', fontSize: 16 }}/>
                <span style={{ color: '#57606A', fontSize: 12, fontWeight: 'normal' }}>{tplInfo.name}</span>
              </div>
            </Space>
          }
          breadcrumb={true}
        />
      }
    >
      <div className='idcos-card'>
        <Form
          scrollToFirstError={true}
          colon={true}
          form={form}
          {...FL}
        >
          <Row justify='space-between' style={{ marginBottom: 24 }}>
            <Col span={7}>
              <Form.Item
                label={t('define.name')}
                name='name'
                rules={[
                  {
                    required: true,
                    message: t('define.form.input.placeholder')
                  }
                ]}
                initialValue={info.name || undefined}
              >
                <Input disabled={info.locked} value={info.name} placeholder={t('define.form.input.placeholder')} style={{ width: '100%' }} onBlur={(e) => form.setFieldsValue({ name: e.target.value.trim() })}/>
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item
                label={`${t('define.branch')}/${t('define.tag')}`}
                name='revision'
                rules={[
                  {
                    required: true,
                    message: t('define.form.select.placeholder')
                  }
                ]}
              >
                <Select
                  getPopupContainer={triggerNode => triggerNode.parentNode}
                  placeholder={t('define.form.select.placeholder')}
                  style={{ width: '100%' }}
                  onChange={(value) => {
                    changeVcsFetchParams({ repoRevision: value });
                    setRepoObj({ ... repoObj, repoRevision: value });
                  }}
                  disabled={info.locked}
                >
                  <OptGroup label={t('define.branch')}>
                    {branch.map(it => <Option value={it.name}>{it.name}</Option>)}
                  </OptGroup>
                  <OptGroup label={t('define.tag')}>
                    {tag.map(it => <Option value={it.name}>{it.name}</Option>)}
                  </OptGroup>
                </Select>
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item
                label={t('define.workdir')}
                name='workdir'
              >
                <Input
                  placeholder={t('define.form.input.placeholder')}
                  onBlur={(e) => {
                    changeVcsFetchParams({ workdir: e.target.value });
                    setRepoObj({ ... repoObj, workdir: e.target.value });
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <AdvancedConfig
            configRef={configRef}
            data={info}
            orgId={orgId}
            envId={envId}
            runnner={runnner}
            keys={keys}
            tfvars={tfvars}
            playbooks={playbooks}
            tplInfo={tplInfo}
            repoObj={repoObj}
          />
          <VariableForm
            varRef={varRef}
            defaultScope={defaultScope}
            defaultData={{ variables: vars }}
            fetchParams={fetchParams}
            canImportTerraformVar={true}
            defaultExpandCollapse={false}
          />
          <Row style={{ display: 'flex', justifyContent: 'center' }}>
            <Button htmlType='submit' disabled={applyLoading} loading={planLoading} onClick={() => onFinish('plan')} style={{ marginTop: 20 }} >{t('define.env.action.plan')}</Button>
            <Button htmlType='submit' disabled={planLoading || info.locked} loading={applyLoading} onClick={() => onFinish('apply')} style={{ marginTop: 20, marginLeft: 20 }} type='primary' >{t('define.env.action.deploy')}</Button>
          </Row>
        </Form>
      </div>
    </Layout>
  );
};

export default Index;
