import React, { useState, useCallback, useRef } from 'react';
import { EyeOutlined, PlusSquareOutlined, MenuOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';
import { useSessionStorageState } from 'ahooks';
import classNames from 'classnames';
import { Divider, notification, Tooltip } from 'antd';
import MenuSelect from 'components/menu-select';
import RoutesList from 'components/routes-list';
import versionCfg from 'assets/version.json';
import history from "utils/history";
import { t } from 'utils/i18n';
import ProjectModal from 'components/project-modal';
import projectAPI from 'services/project';
import getMenus from './menus';
import styles from './styles.less';

const KEY = 'global';

const ProjectWrapper = ({ routes, userInfo, curOrg, projects, curProject, match = {}, dispatch }) => {

  const [ collapsed, setCollapsed ] = useSessionStorageState('execute_menu_collapsed', false);
  const { orgId, mOrgKey, projectId, mProjectKey } = match.params || {};
  const projectList = (projects || {}).list || [];
  const pjtId = projectId || (curProject || {}).id;
  const [ pjtSelectActive, setPjtSelectActive ] = useState(false);
  const [ pjtModalVsible, setPjtModalVsible ] = useState(false);
  const pjtSelectRef = useRef();
 
  // 跳转 scope作用域
  const linkTo = (scope, menuItemKey) => {
    switch (scope) {
    case 'org':
    case 'other':
      history.push(`/org/${orgId}/${menuItemKey}`);
      break;
    case 'project':
      history.push(`/org/${orgId}/project/${pjtId}/${menuItemKey}`);
      break;
    default:
      break;
    }
  };

  const togglePjtModalVsible = () => {
    // 打开创建项目modal时 关闭项目选择器
    if (!pjtModalVsible) {
      pjtSelectRef.current && pjtSelectRef.current.setVisible(false);
    }
    setPjtModalVsible(!pjtModalVsible);
  };

  const changeProject = (pjtId) => {
    dispatch({
      type: 'global/set-curProject',
      payload: {
        projectId: pjtId
      }
    });
    history.push(`/org/${orgId}/project/${pjtId}/m-project-overview`);
  };

  const pjtOperation = async ({ action, payload }, cb) => {
    try {
      const method = {
        add: (param) => projectAPI.createProject(param)
      };
      let params = {
        ...payload
      };
      const res = await method[action](params);
      if (res.code != 200) {
        throw new Error(res.message_detail || res.message);
      }
      
      notification.success({
        message: t('define.message.opSuccess')
      });
      const { result } = res;
      changeProject(result.id);
      cb && cb();
    } catch (e) {
      cb && cb(e);
      notification.error({
        message: t('define.message.opFail'),
        description: e.message_detail || e.message
      });
    }
  };

  const renderMenus = useCallback(({ subKey, emptyMenuList = [], menuList }) => {
    let scope = subKey, menuKey, isEmptyData = false;
    switch (subKey) {
    case 'org':
    case 'other':
      menuKey = mOrgKey;
      break;
    case 'project':
      menuKey = mProjectKey;
      // 没有项目id情况下 作用域指向组织
      if (!pjtId) {
        isEmptyData = true;
        scope = 'org';
        menuKey = mOrgKey;
      }
      break;
    default:
      break;
    }
    return (isEmptyData ? emptyMenuList : menuList).map(menuItem => {
      if (menuItem.isHide) {
        return null;
      }
      return (
        <div 
          className={`menu-item ${menuKey === menuItem.key ? 'checked' : ''}`} 
          onClick={() => linkTo(scope, menuItem.key)}
        >
          <Tooltip title={collapsed && menuItem.name} placement='right'>
            <span className='icon'>{menuItem.icon}</span>
          </Tooltip>
          {!collapsed && <span>{menuItem.name}</span>}
        </div>
      );
    });
  }, [ pjtId, collapsed ]);

  const menus = getMenus(userInfo || {}, {
    projectList
  });

  return (
    <div className={styles.orgWrapper}>
      <div className={classNames('left-nav', { collapsed })}>
        {
          projectList.length ? (
            <>
              <MenuSelect
                overlayWidth='200px'
                options={projectList}
                actionContent={collapsed ? (
                  <Tooltip title={t('define.project.change')} placement='right'>
                    <div className={styles.projectActionContent}>
                      <span>{((curProject || {}).name || '')[0]}</span>
                    </div>
                  </Tooltip>
                ) : null}
                onChange={changeProject}
                setActive={setPjtSelectActive}
                selectionStyle={{ padding: '13px 20px 13px 24px' }}
                bodyStyle={{ maxHeight: 'none' }}
                valuePropName='id' 
                lablePropsNames={{ name: 'name' }}
                value={pjtId}
                showSearch={true}
                searchPlaceholder={t('define.project.search.placeholder')}
                selectRef={pjtSelectRef}
                maxLen={10}
                menuSelectfooter={(
                  <div 
                    className={styles.menuSelectfooterContent} 
                  >
                    <div className='more' onClick={() => history.push(`/org/${orgId}/m-org-project`)}>
                      <EyeOutlined className='icon' />{t('define.project.viewMore')}
                    </div>
                    <div className='create'>
                      <div className='btn' onClick={togglePjtModalVsible}>
                        <span className='icon'>
                          <PlusSquareOutlined/>
                        </span>
                        <span>{t('define.project.create')}</span>
                      </div>
                    </div>
                    {
                      pjtModalVsible && <ProjectModal
                        visible={pjtModalVsible}
                        orgId={orgId}
                        opt='add'
                        toggleVisible={togglePjtModalVsible}
                        operation={pjtOperation}
                      />
                    }
                  </div>
                )}
              />
              {!pjtSelectActive && !collapsed && <div style={{ padding: '0 19px' }}>
                <Divider style={{ margin: '0' }} />
              </div>}
            </>
          ) : null
        }
        <div className='menu-wrapper'>
          {
            menus.map(subMenu => {
              return (
                <div className='sub-menu'>
                  {subMenu.subName ? (
                    <div className='menu-title'>
                      {collapsed ? <div className='divider'></div> : subMenu.subName}
                    </div>
                  ) : (
                    menus.length > 1 && ( 
                      <Divider style={{ margin: '12px 0' }} />
                    )
                  )}
                  <div className='menu-list'>
                    { renderMenus(subMenu) }
                  </div>
                </div>
              );
            })
          }
        </div>
        <div className='nav-footer'>
          <span className='icon' onClick={() => setCollapsed(!collapsed)}>
            <MenuOutlined />
          </span>
          <span className='text'>v{versionCfg.version || ''}</span>
        </div>
      </div>
      <div className='right-content'>
        <RoutesList
          routes={routes}
          routesParams={{
            curOrg
          }}
        />
      </div>
    </div>
  );
  
};

export default connect(
  (state) => ({ 
    orgs: state[KEY].get('orgs').toJS(),
    curOrg: state[KEY].get('curOrg'),
    curProject: state[KEY].get('curProject') || {},
    projects: state[KEY].get('projects').toJS(),
    userInfo: state[KEY].get('userInfo').toJS()
  })
)(ProjectWrapper);