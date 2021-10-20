import { Space, Table, ConfigProvider, Empty } from 'antd';
import { useRequest } from 'ahooks';
import { requestWrapper } from 'utils/request';
import { useSearchFormAndTable } from 'utils/hooks';
import PageHeader from 'components/pageHeader';
import Layout from 'components/common/layout';
import PageSearch from 'components/PageSearch';
import orgsAPI from 'services/orgs';

const cateList = [
  {
    description: '资源名称',
    code: 'name'
  },
  {
    description: '资源类型',
    code: 'type'
  }
];

export default ({ match }) => {

  const { orgId } = match.params || {};

  // 列表查询
  const {
    loading: tableLoading,
    data: tableData,
    run: fetchList
  } = useRequest(
    (params) => requestWrapper(
      orgsAPI.listResources.bind(null, { orgId, ...params })
    ), {
      throttleInterval: 1000, // 节流
      manual: true
    }
  );

  // 表单搜索和table关联hooks
  const { 
    tableProps, 
    setSearchParams
  } = useSearchFormAndTable({
    tableData,
    onSearch: (params) => {
      const { current: currentPage, type, keyword, ...restParams } = params;
      fetchList({ 
        currentPage,
        module: type,
        q: keyword,
        ...restParams 
      });
    }
  });

  const onSearch = (type, keyword) => {
    setSearchParams((preSearchParams) => ({ 
      ...preSearchParams,
      form: { type, keyword },
      paginate: { ...preSearchParams.paginate, current: 1 }
    }));
  };

  const columns = [
    {
      dataIndex: 'projectName',
      title: '项目',
      width: 180,
      ellipsis: true
    },
    {
      dataIndex: 'envName',
      title: '环境',
      width: 180,
      ellipsis: true
    },
    {
      dataIndex: 'provider',
      title: 'Provider',
      width: 170,
      ellipsis: true
    },
    {
      dataIndex: 'type',
      title: '类型',
      width: 220,
      ellipsis: true
    },
    {
      dataIndex: 'resourceName',
      title: '名称',
      width: 200,
      ellipsis: true
    },
    {
      dataIndex: 'module',
      title: '模块',
      width: 190,
      ellipsis: true
    }
  ];

  return (
    <Layout
      extraHeader={
        <PageHeader
          title='资源查询'
          breadcrumb={true}
        />
      }
    >
      <div className='idcos-card'>
        <Space size='middle' direction='vertical' style={{ width: '100%', display: 'flex' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Space size='middle'>
              <PageSearch 
                cateList={cateList} 
                onSearch={onSearch} 
              />
            </Space>
          </div>
          <ConfigProvider 
            renderEmpty={
              () => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无相应资源'/>
            }
          >
            <Table
              columns={columns}
              scroll={{ x: 'min-content', y: 430 }}
              loading={tableLoading}
              {...tableProps}
            />
          </ConfigProvider>
        </Space>
      </div>
    </Layout>
  );
};
