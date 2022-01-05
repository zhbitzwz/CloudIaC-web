import React, { useContext, useEffect, useState } from 'react';
import { Form, Row, Col, Radio, Select, Input, Button, Spin } from 'antd';
import intersection from 'lodash/intersection';
import filter from 'lodash/filter';
import { useRequest } from 'ahooks';
import { requestWrapper } from 'utils/request';
import vcsAPI from 'services/vcs';
import Coder from "components/coder";
import FormPageContext from '../form-page-context';
import styles from './styles.less';

const FL = {
  labelCol: { span: 5 },
  wrapperCol: { span: 19 }
};

export default () => {

  const { isCreate, type, formData, setFormData, setCurrent } = useContext(FormPageContext);
  const [form] = Form.useForm();

  useEffect(() => {
    const formValues = formData[type];
    form.setFieldsValue(formValues);
  }, []);

  // vcs选项
  const {
    data: vcsOptions = [],
    loading: vcsLoading,
    mutate: mutateVcsOptions
  } = useRequest(
    () => requestWrapper(
      vcsAPI.searchVcs.bind(null, { 
        status: 'enable',
        isShowDefaultVcs: true,
        pageSize: 0
      })
    ), {
      formatResult: res => (res.list || []).map(it => ({ label: it.name, value: it.id }))
    }
  );

  // 仓库选项
  const {
    data: repoOptions = [],
    loading: repoLoading,
    run: fetchRepoOptions,
    mutate: mutateRepoOptions
  } = useRequest(
    ({ vcsId, q }) => requestWrapper(
      vcsAPI.listRepo.bind(null, {
        vcsId,
        currentPage: 1,
        pageSize: 50,
        q
      })
    ),
    {
      manual: true,
      debounceInterval: 300,
      formatResult: data => {
        const { repoId, repoFullName } = form.getFieldsValue();
        const hasSelectedItem = (data.list || []).find((it) => it.id === repoId);
        if (repoId && repoFullName && !hasSelectedItem) {
          return [ ...data.list, { id: repoId, fullName: repoFullName }].map(it => ({ label: it.fullName, value: it.id }));
        } else {
          return (data.list || []).map(it => ({ label: it.fullName, value: it.id }));
        }
      }
    }
  );

  // 仓库分支选项
  const {
    data: repoBranchOptions = [],
    loading: repoBranchLoading,
    run: fetchRepoBranchOptions,
    mutate: mutateRepoBranchOptions
  } = useRequest(
    ({ vcsId, repoId }) => requestWrapper(
      vcsAPI.listRepoBranch.bind(null, {
        vcsId,
        repoId
      })
    ),
    {
      manual: true,
      formatResult: data => (data || []).map(it => ({ label: it.name, value: it.name }))
    }
  );

  // 仓库标签选项
  const {
    data: repoTagOptions = [],
    loading: repoTagLoading,
    run: fetchRepoTagOptions,
    mutate: mutateRepoTagOptions
  } = useRequest(
    ({ vcsId, repoId }) => requestWrapper(
      vcsAPI.listRepoTag.bind(null, {
        vcsId,
        repoId
      })
    ),
    {
      manual: true,
      formatResult: data => (data || []).map(it => ({ label: it.name, value: it.name }))
    }
  );

  // 查询readme信息
  const {
    data: readmeText = undefined,
    loading: readmeTextLoading,
    run: fetchReadmeText,
    mutate: mutateReadmeText
  } = useRequest(
    ({ vcsId, repoId, repoRevision }) => requestWrapper(
      vcsAPI.readme.bind(null, {
        vcsId,
        repoId,
        branch: repoRevision
      })
    ),
    {
      manual: true,
      formatResult: data => data.content
    }
  );

  const onValuesChange = (changedValues, allValues) => {
    const changedKeys = Object.keys(changedValues);
    const { vcsId, repoId, repoRevision } = allValues || {};
    if (changedKeys.includes('vcsId')) {
      // 切换vcs需要将关联的数据源【仓库、分支、标签】清空 ，再重新查询数据源
      !!repoOptions.lenngth && mutateRepoOptions([]);
      !!repoBranchOptions.lenngth && mutateRepoBranchOptions([]);
      !!repoTagOptions.lenngth && mutateRepoTagOptions([]);
      form.setFieldsValue({
        repoId: undefined,
        repoRevision: undefined,
        workdir: undefined
      });
      if (vcsId) {
        fetchRepoOptions({ vcsId });
      }
    }
    if (changedKeys.includes('repoId')) {
      // 切换仓库需要将关联的数据源【分支、标签】清空 ，再重新查询数据源
      !!repoBranchOptions.lenngth && mutateRepoBranchOptions([]);
      !!repoTagOptions.lenngth && mutateRepoTagOptions([]);
      form.setFieldsValue({
        repoFullName: (repoOptions.find(it => it.value === changedValues.repoId) || {}).label,
        repoRevision: undefined,
        workdir: undefined,
        tfVersion: undefined
      });
      if (vcsId && repoId) {
        fetchRepoBranchOptions({ vcsId, repoId });
        fetchRepoTagOptions({ vcsId, repoId });
      }
    }
    // readme参数依赖是否变化
    const readmeParamsChange = intersection(changedKeys, [ 'vcsId', 'repoId', 'repoRevision' ]).length > 0;
    if (readmeParamsChange) {
      if (changedValues.repoRevision) {
        fetchReadmeText({
          vcsId, 
          repoId, 
          repoRevision
        });
      } else {
        readmeText !== undefined && mutateReadmeText(undefined);
      }
    }
  };

  const next = async () => {
    const formValues = await form.validateFields();
    setFormData(preValue => ({ ...preValue, [type]: formValues }));
    setCurrent(preValue => preValue + 1);
  };

  return (
    <Row gutter={16} className={styles.sourceForm}>
      <Col span={11}>
        <Form form={form} {...FL} onValuesChange={onValuesChange}>
          <Form.Item 
            name='type' 
            wrapperCol={{ offset: 5, span: 19 }}
            initialValue='vcs'
          >
            <Radio.Group>
              <Radio value='vcs'>VCS</Radio>
              <Radio value='registry' disabled={true}>Registry</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item 
            label='VCS'
            name='vcsId' 
            rules={[{ required: true, message: '请选择' }]}
          >
            <Select 
              placeholder='请选择VCS'
              optionFilterProp='label'
              showSearch={true}
              loading={vcsLoading}
              options={vcsOptions}
            />
          </Form.Item>
          <Form.Item 
            label='代码仓库'
            name='repoId'
            rules={[{ required: true, message: '请选择' }]}
          >
            <Select 
              placeholder='请选择代码仓库'
              loading={repoLoading}
              optionFilterProp='label'
              showSearch={true}
              options={repoOptions}
            />
          </Form.Item>
          <Form.Item
            name='repoFullName'
            hidden={true}
          >
            <Input />
          </Form.Item>
          <Form.Item 
            label='分支/标签'
            name='repoRevision'
            rules={[{ required: true, message: '请选择' }]}
          >
            <Select 
              placeholder='请选择分支/标签'
              loading={repoBranchLoading || repoTagLoading}
            >
              <Select.OptGroup label='分支'>
                {repoBranchOptions.map(it => <Select.Option value={it.value}>{it.label}</Select.Option>)}
              </Select.OptGroup>
              <Select.OptGroup label='标签'>
                {repoTagOptions.map(it => <Select.Option value={it.value}>{it.label}</Select.Option>)}
              </Select.OptGroup>
            </Select>
          </Form.Item>
          <Form.Item 
            label='目录'
            name='workdir'
          >
            <Input placeholder='请填写目录' />
          </Form.Item>
          <Form.Item 
            wrapperCol={{ span: 19, offset: 5 }}
          >
            <Button type='primary' onClick={next}>下一步</Button>
          </Form.Item>
        </Form>
      </Col>
      <Col span={13} className='readme-info'>
        <div className='title'>Readme</div>
        <div className='code-wrapper'>
          {readmeTextLoading ? <Spin /> : (
            readmeText ? (
              <Coder value={readmeText} style={{ height: '100%' }} />
            ) : (
              <div className='empty-text'>
                {readmeText === undefined ? (
                  <span>选择VCS、仓库、分支/标签查看策略组说明</span>
                ) : (
                  <span>未获取重复组说明</span>
                )}
              </div>
            )
          )}
        </div>
      </Col>
    </Row>
  );
};