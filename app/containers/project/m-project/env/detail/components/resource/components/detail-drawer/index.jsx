import React from 'react';
import { Drawer, Form, Input, Spin } from 'antd';
import moment from 'moment';
import { useRequest } from 'ahooks';
import { requestWrapper } from 'utils/request';
import envAPI from 'services/env';
import FormCoder from 'components/coder/form-coder';
import FormAnsiCoder from 'components/coder/form-ansi-coder';
import { safeJsonStringify } from 'utils/util';
import { t } from 'utils/i18n';

export default ({ visible, id, onClose, orgId, projectId, envId, type }) => {
  
  const { data = {}, loading } = useRequest(
    () => requestWrapper(
      envAPI.getResourcesGraphDetail.bind(null, { orgId, projectId, envId, resourceId: id })
    ), {
      ready: !!id
    }
  );

  return (
    <Drawer 
      title={t('define.resource.detail')}
      visible={visible} 
      onClose={onClose}
      width={460}
      getContainer={false}
    >
      <Spin spinning={loading}>
        <Form layout="vertical" className='idcos-exhibition-form'>
          <Form.Item label='ID'>
            <Input value={data.id} disabled/>
          </Form.Item>
          <Form.Item label={t('define.page.resource.resourceName')}>
            <Input value={data.name} disabled/>
          </Form.Item>
          {data.isDrift && (
            <>
              <Form.Item label={t('define.resource.field.driftAt')}>
                <Input value={data.driftAt && moment(data.driftAt).format('YYYY-MM-DD HH:mm:ss')} disabled/>
              </Form.Item>
              <Form.Item label={t('define.resource.field.driftDetail')}>
                <FormAnsiCoder value={data.driftDetail || ''}/>
              </Form.Item>
            </>
          )}
          <Form.Item label={t('define.resource.field.module')}>
            <Input value={data.module} disabled/>
          </Form.Item>
          <Form.Item label={t('define.page.resource.resourceType')}>
            <Input value={data.type} disabled/>
          </Form.Item>
          <Form.Item label={t('define.resource.field.attrs')}>
            <FormCoder value={safeJsonStringify([data.attrs, null, 2])}/>
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  );
};