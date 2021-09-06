import React, { useState } from "react";
import { Select, Form, Input, Button, Row, Col, Spin, notification, Space } from "antd";
import { useRequest } from 'ahooks';
import { requestWrapper } from 'utils/request';
import history from 'utils/history';
import PageHeader from "components/pageHeader";
import Layout from "components/common/layout";
import { POLICIES_SEVERITY_ENUM } from 'constants/types';
import CoderCard from 'components/coder/coder-card';
import policiesAPI from 'services/policies';
import cenvAPI from 'services/cenv';
import AffixBtnWrapper from 'components/common/affix-btn-wrapper';
import styles from './styles.less';

const FL = {
  labelCol: { span: 24 },
  wrapperCol: { span: 24 }
};
  
const FormPage = ({ match = {} }) => {

  const { policyId } = match.params || {};
  const [form] = Form.useForm();
  const [rego, setRego] = useState('');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  
  // 环境选项查询
  const { data: envOptions } = useRequest(
    () => requestWrapper(
      cenvAPI.list.bind(null, { currentPage: 1, pageSize: 100000 }),
      {
        formatDataFn: (res) => ((res.result || {}).list || []).map((it) => ({ label: it.name, value: it.id, tplId: it.tplId }))
      }
    )
  );

  // 环境选项查询
  const { data: out, run: test } = useRequest(
    () => requestWrapper(
      policiesAPI.test.bind(null, { input, rego }),
    )
  );

  // 策略详情查询回填
  const {
    loading: pageLoading
  } = useRequest(
    () => requestWrapper(
      policiesAPI.detail.bind(null, policyId)
    ), {
      ready: !!policyId,
      onSuccess: (res) => {
        const { tags, rego, ...restFormValues } = res || {};
        setRego(rego);
        form.setFieldsValue({
          tags: tags ? tags.split(',') : [],
          ...restFormValues
        });
      }
    }
  );

  // 创建/编辑策略-保存提交
  const {
    loading: saveLoading,
    run: onSave
  } = useRequest(
    (api, params) => requestWrapper(
      api.bind(null, params),
      {
        autoSuccess: true
      }
    ), {
      manual: true,
      onSuccess: goPolicyListPage
    }
  );

  const goPolicyListPage = () => history.push('/compliance/policy-config/policy');

  const save = async () => {
    const { tags, ...restFormValues } = await form.validateFields();
    if (!rego) {
      return notification.error({
        message: '请输入策略编辑'
      });
    }
    const params = {
      tags: tags.join(','), 
      ...restFormValues, 
      rego, 
    };
    if (policyId) {
      // 编辑
      onSave(policiesAPI.update, {
        ...params,
        id: policyId 
      });
    } else {
      // 创建
      onSave(policiesAPI.create, params);
    }
  };

  const changeEnv = (val, option) => {
    console.log(val, option);
  };
  
  return (
    <Layout
      extraHeader={<PageHeader title={!!policyId ? '编辑策略' : '新建策略'} breadcrumb={true}/>}
    >
      <div className='idcos-card'>
        <Spin spinning={pageLoading}>
          <Form
            scrollToFirstError={true}
            form={form}
            {...FL}
            layout={'vertical'}
          >
            <Row>
              <Col span={16}>
                <Row>
                  <Col span={12} style={{ paddingRight: 24 }}>
                    <Form.Item
                      label='策略名称：'
                      name='name'
                      rules={[
                        {
                          required: true,
                          message: '请输入'
                        }
                      ]}
                    >
                      <Input placeholder={'请输入策略名称'}/>
                    </Form.Item>
                  </Col>
                  <Col span={12} style={{ padding: '0 12px' }}>
                    <Form.Item
                      label='标签：'
                      name='tags'
                      rules={[
                        {
                          required: true,
                          message: '请输入'
                        }
                      ]}
                    >
                      <Select 
                        mode='tags' 
                        placeholder='请填写标签'
                        notFoundContent='输入标签并回车'
                      ></Select>
                    </Form.Item>
                  </Col>
                  <Col span={12} style={{ paddingRight: 24 }}>
                    <Form.Item
                      label='严重性：'
                      name='severity'
                      rules={[
                        {
                          required: true,
                          message: '请输入'
                        }
                      ]}
                    >
                      <Select 
                        placeholder='选择严重性'
                      >
                        {
                          Object.keys(POLICIES_SEVERITY_ENUM).map((it) => (
                            <Select.Option value={it}>{POLICIES_SEVERITY_ENUM[it]}</Select.Option>
                          ))
                        }
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Col>
              <Col span={8} style={{ paddingLeft: 24 }}>
                <Form.Item
                  label='参考：'
                  name='fixSuggestion'
                  rules={[
                    {
                      required: true,
                      message: '请输入'
                    }
                  ]}
                >
                  <Input.TextArea 
                    autoSize={{ minRows: 5, maxRows: 5 }}
                    placeholder={'请输入策略名称'}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <CoderCard 
                title='策略编辑' 
                bodyStyle={{ height: 491 }}
                options={{ mode: 'rego' }} 
                value={rego} 
                onChange={setRego}
                tools={['fullScreen']}
              />
            </Col>
            <Col span={12}>
              <CoderCard 
                title='输入'
                value={input} 
                onChange={setInput}
                style={{ marginBottom: 24 }}
                bodyStyle={{ height: 200 }}
                tools={['fullScreen']}
                bodyBefore={
                  <div className={styles.input_condition}>
                    <Select 
                      style={{ width: '50%', paddingRight: 4 }} 
                      placeholder='请选择云模版'
                      // options={envOptions}
                      allowClear={true}
                      optionFilterProp='label'
                      showSearch={true}
                    />
                    <Select 
                      style={{ width: '50%', paddingLeft: 4 }}
                      placeholder='请选择环境' 
                      options={envOptions}
                      allowClear={true}
                      optionFilterProp='label'
                      showSearch={true}
                      onChange={changeEnv}
                    />
                  </div>
                }
              />
              <CoderCard
                title='输出'
                value={output}
                bodyStyle={{ height: 200 }}
                tools={['fullScreen']}
              />
            </Col>
          </Row>
          <AffixBtnWrapper align='right'>
            <Button onClick={goPolicyListPage}>取消</Button>
            <Button onClick={test}>测试</Button>
            <Button type='primary' onClick={save} loading={saveLoading}>保存</Button>
          </AffixBtnWrapper>
        </Spin>
      </div>
    </Layout>
  );
};

export default FormPage;
