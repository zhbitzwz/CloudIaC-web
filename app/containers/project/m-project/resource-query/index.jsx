import React, { useState } from 'react';
import { Pagination, Checkbox, Input, Empty, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { requestWrapper } from 'utils/request';
import PageHeader from 'components/pageHeader';
import Layout from 'components/common/layout';
import classNames from 'classnames';
import projectAPI from 'services/project';
import styles from './styles.less';
import ResourceItem from './component/resource_item';
import { t } from 'utils/i18n';

export default ({ match }) => {

  const { orgId, projectId } = match.params || {};
  const [ page, setPage ] = useState({ currentPage: 1, pageSize: 10 });
  const [ searchParams, setSearchParams ] = useState({});
  const [ searchCount, setSearchCount ] = useState(1);

  // 列表查询
  const {
    loading: tableLoading,
    data: resources = {
      list: [],
      total: 0,
      pageSize: 10
    }
  } = useRequest(
    () => requestWrapper(
      projectAPI.listResources.bind(null, { orgId, projectId, ...page, ...searchParams })
    ), {
      debounceInterval: 1000, // 防抖
      refreshDeps: [searchCount]
    }
  );

  //获取环境和provider列表
  const {
    data: {
      envs = [],
      providers = []
    } = {}
  } = useRequest(
    () => requestWrapper(
      projectAPI.filters.bind(null, { orgId, projectId })
    ), {
      formatResult: (data) => {
        const { envs, providers } = data || {};
        return {
          envs: (envs || []).map((val) => ({ label: val.envName, value: val.envId })),
          providers: (providers || []).map((val) => ({ label: val, value: val }))
        };
      }
    }
  );

  const onParamsSearch = (params) => {
    setSearchParams(preValue => ({ ...preValue, ...params }));
    setPage(preValue => ({ ...preValue, currentPage: 1 }));
    setSearchCount(preValue => preValue + 1);
  };

  const onPageSearch = (currentPage, pageSize) => {
    setPage({ currentPage, pageSize });
    setSearchCount(preValue => preValue + 1);
  };

  return (
    <Layout
      extraHeader={<PageHeader
        title={t('define.resourceQuery')}
        breadcrumb={true}
      />}
    >
      <div style={{ padding: 24 }}>
        <div className={classNames(styles.res_query)}>
          <div className={styles.left}>
            <div className={styles.env_list}>
              <span>{t('define.scope.env')}</span>
              <Checkbox.Group 
                className={styles.checbox}
                style={{ width: '100%' }} 
                onChange={(v) => onParamsSearch({ envIds: v.length > 0 ? v : undefined })}  
              >
                {envs.map((item) => {
                  return <span title={item.label}><Checkbox value={item.value}>{item.label}</Checkbox></span>;
                })}
              </Checkbox.Group>
            </div>
            <div className={styles.provider_list}>
              <span>Provider</span>
              <Checkbox.Group 
                className={styles.checbox}
                style={{ width: '100%' }} 
                onChange={(v) => onParamsSearch({ providers: v.length > 0 ? v : undefined })}  
              >
                {providers.map((item) => {
                  return <span title={item.label}><Checkbox value={item.value}>{item.label}</Checkbox></span>;
                })}
              </Checkbox.Group>
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.search}>
              <Input
                allowClear={true}
                style={{ width: 400 }}
                placeholder={t('define.form.input.search.placeholder.key')}
                prefix={<SearchOutlined />}
                onPressEnter={(e) => onParamsSearch({ q: e.target.value })}
              />
            </div>
            {tableLoading ? <Spin className='spinning' spinning={true} /> : (
              resources.list.length ? (
                resources.list.map((val) => {
                  return <ResourceItem {...val} />;
                })
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
            <div className={styles.pagination}>
              <Pagination 
                size='default'
                total={resources.total} 
                hideOnSinglePage={true}
                pageSize={page.pageSize}
                current={page.currentPage}
                onChange={onPageSearch}
                showTotal={(total) => t('define.pagination.showTotal', { values: { total } })}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
