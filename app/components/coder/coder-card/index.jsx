import React, { useState, useEffect, useRef } from "react";
import { Row, Spin, Col, Input, Button } from "antd";
import { CopyOutlined, ExpandOutlined } from "@ant-design/icons";
import noop from 'lodash/noop';
import classnames from 'classnames';
import Coder from "components/coder";
import copy from 'utils/copy';
import styles from './styles.less';

export default ({ 
  height = 350,
  style,
  autoScrollToBottom = false, 
  options, 
  value,
  onChange = noop,
  title,
  spinning = false,
  headerMiddleContent
}) => {
  const [ fullScreen, setFullScreen ] = useState(false);
  const coderRef = useRef();

  const setFullScreenClose = (e) => {
    if (e.keyCode === 27) {
      setFullScreen(false);
    }
  };

  useEffect(() => {
    if (fullScreen) {
      document.addEventListener('keyup', setFullScreenClose);
    } else {
      document.removeEventListener('keyup', setFullScreenClose);
    }
    return () => {
      document.removeEventListener('keyup', setFullScreenClose);
    };
  }, [fullScreen]);

  return (
    <div
      className={
        classnames(
          styles.code_card,
          { [styles.full_screen_card]: fullScreen }
        )
      }
      style={{ height, ...style }}
    >
      <div className={styles.code_card_head}>
        <Row wrap={false} align='middle' gutter={[ 12, 0 ]}>
          <Col flex='0 0 auto'>
            <div className={styles.code_card_head_title}>
              <div className={styles.code_card_head_title_content}>{title}</div>
            </div>
          </Col>
          <Col flex='1'>
            {headerMiddleContent}
          </Col>
          <Col flex='0 0 auto'>
            <Input.Group compact={true}>
              <Button icon={<CopyOutlined />} onClick={() => copy(value)} />
              <Button type='primary' icon={<ExpandOutlined />} onClick={() => setFullScreen(!fullScreen)}/>
            </Input.Group>
          </Col>
        </Row>
      </div>
      <div className={styles.code_card_body}>
        <Spin spinning={spinning}>
          <div className={styles.code_wrapper}>
            <Coder
              childRef={coderRef}
              options={options}
              autoScrollToBottom={autoScrollToBottom}
              selfClassName={styles.code_container}
              value={value}
              onChange={onChange}
            />
          </div>
        </Spin>
      </div>
    </div>
  );
};
