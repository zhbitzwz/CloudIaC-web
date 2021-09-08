import React, { useState, useEffect, useCallback } from 'react';
import { Descriptions, Tabs, Drawer } from "antd";
import { useRequest } from 'ahooks';
import { requestWrapper } from 'utils/request';
import policiesAPI from 'services/policies';
import { POLICIES_SEVERITY_ENUM } from 'constants/types';
import FixSuggestion from './component/fix-suggestion';
import Report from './component/report';
import Suppress from './component/suppress';
import styles from './style.less';
import classNames from 'classnames';

export default ({ id, visible, onClose }) => {

  const { data: detailInfo = {} } = useRequest(
    () => requestWrapper(
      policiesAPI.detail.bind(null, id)
    ),
    {
      ready: !!id
    }
  );

  const TabPaneMap = [
    { key: 'pb', tab: '屏蔽', children: <Suppress policyId={id}/> },
    { key: 'ck', tab: '参考', children: <FixSuggestion content={detailInfo.fixSuggestion}/> },
    { key: 'bb', tab: '报表', children: '报表' }
  ];

  return (
    <Drawer
      title={detailInfo.name}
      visible={visible}
      onClose={onClose}
      width={750}
      bodyStyle={{ padding: 16 }}
    >
      <div className={styles.drawer_body_content}>
        <Descriptions 
          column={3}
          labelStyle={{ width: 105, textAlign: 'right', display: 'block' }}
        >
          <Descriptions.Item label='严重性'>{POLICIES_SEVERITY_ENUM[detailInfo.severity] || '-'}</Descriptions.Item>
          <Descriptions.Item label='策略ID'>{detailInfo.id}</Descriptions.Item>
        </Descriptions>
        <Tabs 
          type='card'
          className={classNames('idcos-tabs-card', styles.drawer_body_content_tabs_card)}
          animated={false}
        >
          {
            TabPaneMap.map(tabPaneProps => <Tabs.TabPane {...tabPaneProps}/>)
          }
        </Tabs>
      </div>
    </Drawer>
  );
};
